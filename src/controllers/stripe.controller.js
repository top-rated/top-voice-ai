const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { userStorage, subscriptionStorage } = require("../utils/storage");
const { verifySubscription, getCustomer } = require("../utils/stripe");

/**
 * Create a checkout session
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { email, successUrl, cancelUrl } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ message: "Success and cancel URLs are required" });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: email,
      // Enable Apple Pay, Google Pay
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session',
        },
      },
      // Enable PayPal
      payment_method_types: ['card', 'paypal'],
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
    });

    res.json({ 
      success: true, 
      sessionId: session.id, 
      url: session.url 
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create checkout session",
      error: error.message 
    });
  }
};

/**
 * Handle Stripe webhook events
 */
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.rawBody, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received Stripe webhook: ${event.type}`);

  try {
    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`Error handling webhook: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process webhook",
      error: error.message 
    });
  }
};

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session) {
  console.log(`Processing checkout session completed for ${session.customer_email}`);
  
  // The checkout was successful, but we'll wait for the subscription events
  // to actually create the subscription in our system
  console.log(`Checkout completed for customer: ${session.customer}`);
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription) {
  console.log(`Processing subscription created: ${subscription.id}`);
  
  // Get customer details
  const customerResult = await getCustomer(subscription.customer);
  if (!customerResult.success) {
    console.error(`Failed to get customer details: ${customerResult.message}`);
    return;
  }
  
  const email = customerResult.customer.email;
  if (!email) {
    console.error(`No email found for customer: ${subscription.customer}`);
    return;
  }
  
  // Generate a subscription ID for our system
  const emailHash = Buffer.from(email).toString("base64").substring(0, 8);
  const subscriptionId = `stripe_${emailHash}_${Date.now()}`;
  
  // Create subscription data
  const subscriptionData = {
    id: subscriptionId,
    active: subscription.status === 'active',
    type: "premium",
    email,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    source: "stripe_webhook",
    stripeData: {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    },
  };
  
  // Store subscription info
  await subscriptionStorage.setSubscription(subscriptionId, subscriptionData);
  console.log(`Subscription ${subscriptionId} created for ${email}`);
  
  // Update or create user
  const user = await userStorage.getUser(email) || {
    email,
    name: email.split("@")[0],
    createdAt: new Date().toISOString(),
  };
  
  user.subscriptionId = subscriptionId;
  user.subscriptionType = 'premium';
  user.subscription = {
    verified: true,
    verifiedAt: new Date().toISOString(),
    stripeData: {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    },
  };
  
  await userStorage.setUser(email, user);
  console.log(`User ${email} updated with Stripe subscription`);
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription) {
  console.log(`Processing subscription updated: ${subscription.id}`);
  
  // Find subscription in our system
  const allSubscriptions = await subscriptionStorage.getAllSubscriptions();
  const existingSubscription = Object.values(allSubscriptions).find(
    sub => sub.stripeSubscriptionId === subscription.id
  );
  
  if (!existingSubscription) {
    console.log(`No existing subscription found for Stripe subscription: ${subscription.id}`);
    return;
  }
  
  // Update subscription data
  existingSubscription.active = subscription.status === 'active';
  existingSubscription.updatedAt = new Date().toISOString();
  existingSubscription.stripeData = {
    ...existingSubscription.stripeData,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
  };
  
  if (subscription.canceled_at) {
    existingSubscription.stripeData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
  }
  
  // Store updated subscription
  await subscriptionStorage.setSubscription(
    existingSubscription.id,
    existingSubscription
  );
  
  console.log(`Subscription ${existingSubscription.id} updated`);
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  console.log(`Processing subscription deleted: ${subscription.id}`);
  
  // Find subscription in our system
  const allSubscriptions = await subscriptionStorage.getAllSubscriptions();
  const existingSubscription = Object.values(allSubscriptions).find(
    sub => sub.stripeSubscriptionId === subscription.id
  );
  
  if (!existingSubscription) {
    console.log(`No existing subscription found for Stripe subscription: ${subscription.id}`);
    return;
  }
  
  // Update subscription data
  existingSubscription.active = false;
  existingSubscription.updatedAt = new Date().toISOString();
  existingSubscription.stripeData = {
    ...existingSubscription.stripeData,
    status: 'canceled',
    canceledAt: new Date().toISOString(),
  };
  
  // Store updated subscription
  await subscriptionStorage.setSubscription(
    existingSubscription.id,
    existingSubscription
  );
  
  console.log(`Subscription ${existingSubscription.id} marked as canceled`);
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
  // We'll use this primarily for logging/tracking purposes
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
  console.log(`Payment failed for invoice: ${invoice.id}`);
  
  // We could send an email notification here if needed
}

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
};
