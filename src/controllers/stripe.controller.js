const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { userStorage, subscriptionStorage } = require("../utils/storage");
const { verifySubscription, getCustomer } = require("../utils/stripe");

// Helper function to get or create a Stripe customer and attach payment method
const getOrCreateCustomer = async (email, name, paymentMethodId) => {
  let customers = await stripe.customers.list({ email: email, limit: 1 });
  let customer;

  if (customers.data.length > 0) {
    customer = customers.data[0];
    if (name && customer.name !== name) {
      await stripe.customers.update(customer.id, { name });
    }
  } else {
    const customerParams = { email };
    if (name) {
      customerParams.name = name;
    }
    // If a paymentMethodId is provided, we can set it during customer creation
    // It can also be set as invoice_settings.default_payment_method
    if (paymentMethodId) {
        customerParams.payment_method = paymentMethodId;
        customerParams.invoice_settings = {
            default_payment_method: paymentMethodId,
        };
    }
    customer = await stripe.customers.create(customerParams);
  }

  // Ensure the payment method is attached and set as default for invoices/subscriptions.
  if (paymentMethodId) {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } catch (error) {
      // Ignore error if payment method is already attached (common scenario)
      if (error.code !== 'resource_already_exists') {
        throw error; // Re-throw other errors
      }
    }
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }
  return customer;
};

/**
 * Create a checkout session
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { email } = req.body; // Only email from req.body now

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const successUrlFromEnv = process.env.STRIPE_SUCCESS_URL;
    const cancelUrlFromEnv = process.env.STRIPE_CANCEL_URL;

    if (!successUrlFromEnv || !cancelUrlFromEnv) {
      console.error("Stripe success or cancel URL not set in environment variables. Please define STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL in your .env file.");
      return res.status(500).json({ 
        success: false, 
        message: "Server configuration error: Missing payment redirect URLs."
      });
    }

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      // Retained original payment_method_types and added paypal as per original code
      payment_method_types: ['card', 'paypal'], 
      line_items: [
        {
          // Assumes STRIPE_PRICE_ID is set for a default product/subscription
          price: process.env.STRIPE_PRICE_ID, 
          quantity: 1,
        },
      ],
      mode: 'subscription', // Or 'payment' if it's for one-time payments
      success_url: successUrlFromEnv, // Use from env
      cancel_url: cancelUrlFromEnv,   // Use from env
      customer_email: email,
      billing_address_collection: 'auto', // Retained original setting
      allow_promotion_codes: true,        // Retained original setting
      automatic_tax: { enabled: false },   // Retained original setting
    });

    res.json({ 
      success: true, 
      sessionId: session.id, 
      url: session.url // This is the Stripe Checkout URL
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

  try {
    // Get customer details directly from Stripe
    const stripeCustomer = await stripe.customers.retrieve(subscription.customer);
    const email = stripeCustomer.email;

    if (!email) {
      console.error(`No email found for Stripe customer: ${subscription.customer}`);
      return;
    }

    // Generate a subscription ID for our system
    const emailHash = Buffer.from(email).toString("base64").substring(0, 8);
    const subscriptionId = `stripe_${emailHash}_${Date.now()}`;

    // Create subscription data
    const subscriptionData = {
      id: subscriptionId,
      active: subscription.status === "active" || subscription.status === "trialing",
      type: "premium", // Assuming 'premium' type, adjust if dynamic
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
        ...(subscription.trial_start && { trial_start: new Date(subscription.trial_start * 1000).toISOString() }),
        ...(subscription.trial_end && { trial_end: new Date(subscription.trial_end * 1000).toISOString() }),
      },
    };

    // Store subscription info
    await subscriptionStorage.setSubscription(subscriptionId, subscriptionData);
    console.log(`Subscription ${subscriptionId} created for ${email}`);

    // Update or create user
    let user = await userStorage.getUser(email);

    if (user) {
      // Update existing user
      user.subscriptionId = subscriptionId;
      user.subscriptionType = "premium";
      user.active = true; // Consider if subscription status should dictate this
      user.updatedAt = new Date().toISOString();
      user.subscription = {
        verified: true,
        verifiedAt: new Date().toISOString(),
        stripeData: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        },
      };
      await userStorage.setUser(email, user);
      console.log(`Updated existing user ${email} with subscription ${subscriptionId}`);
    } else {
      // Create new user
      user = {
        email,
        name: stripeCustomer.name || email.split("@")[0],
        subscriptionId,
        subscriptionType: "premium",
        active: true, // Consider if subscription status should dictate this
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscription: {
          verified: true,
          verifiedAt: new Date().toISOString(),
          stripeData: {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          },
        },
      };
      await userStorage.setUser(email, user);
      console.log(`Created new user ${email} with subscription ${subscriptionId}`);
    }

    // Email Indexing for subscriptions
    const emailKey = `email:${email}`;
    let emailSubscriptions = subscriptionStorage.subscriptionCache.get(emailKey) || {};
    emailSubscriptions[subscriptionId] = true;
    subscriptionStorage.subscriptionCache.set(emailKey, emailSubscriptions);
    console.log(`Email index updated for ${email}:`, Object.keys(emailSubscriptions));

  } catch (error) {
    console.error(`Error in handleSubscriptionCreated for subscription ${subscription.id}:`, error);
    // Optionally, re-throw or handle more gracefully if this function is called by a webhook expecting a response
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription) {
  console.log(`Processing subscription updated: ${subscription.id}`);

  try {
    // Find subscription in our system
    const allSubscriptions = await subscriptionStorage.getAllSubscriptions();
    const existingSubscription = Object.values(allSubscriptions).find(
      sub => sub.stripeSubscriptionId === subscription.id
    );

    if (!existingSubscription) {
      console.log(`No existing subscription found for Stripe subscription: ${subscription.id}. Potentially a new subscription if created directly via Stripe dashboard or an unhandled creation path.`);
      // Optional: Call handleSubscriptionCreated if it's truly a new subscription not yet in DB.
      // For now, we'll assume it should exist if it's an update event.
      return;
    }

    const oldStatus = existingSubscription.active;
    const newStatusIsActive = subscription.status === "active" || subscription.status === "trialing";

    // Update subscription data
    existingSubscription.active = newStatusIsActive;
    existingSubscription.updatedAt = new Date().toISOString();
    existingSubscription.stripeData = {
      ...existingSubscription.stripeData,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      ...(subscription.trial_start && { trial_start: new Date(subscription.trial_start * 1000).toISOString() }),
      ...(subscription.trial_end && { trial_end: new Date(subscription.trial_end * 1000).toISOString() }),
    };

    if (subscription.canceled_at) {
      existingSubscription.stripeData.canceledAt = new Date(subscription.canceled_at * 1000).toISOString();
    }
    if (subscription.ended_at) { // A subscription ends if it's canceled and the period concludes, or due to payment failure.
        existingSubscription.stripeData.endedAt = new Date(subscription.ended_at * 1000).toISOString();
        existingSubscription.active = false; // Ensure active is false if ended_at is set
    }

    // Store updated subscription
    await subscriptionStorage.setSubscription(
      existingSubscription.id,
      existingSubscription
    );
    console.log(`Subscription ${existingSubscription.id} updated to status: ${subscription.status}`);

    // Update the associated user
    if (existingSubscription.email) {
      const user = await userStorage.getUser(existingSubscription.email);
      if (user) {
        user.active = newStatusIsActive; // User's active status mirrors subscription's active status
        user.subscriptionType = newStatusIsActive ? (existingSubscription.type || "premium") : "free"; // Or whatever your non-active type is
        user.updatedAt = new Date().toISOString();
        user.subscription = {
          ...(user.subscription || {}),
          verified: true, // Assuming still verified
          stripeData: {
            ...(user.subscription?.stripeData || {}),
            subscriptionId: subscription.id,
            customerId: subscription.customer, // Ensure customer ID is present
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            ...(subscription.canceled_at && { canceledAt: new Date(subscription.canceled_at * 1000).toISOString() }),
            ...(subscription.ended_at && { endedAt: new Date(subscription.ended_at * 1000).toISOString() }),
          },
        };
        await userStorage.setUser(existingSubscription.email, user);
        console.log(`User ${existingSubscription.email} updated based on subscription ${existingSubscription.id} status.`);
      } else {
        console.warn(`User not found for email ${existingSubscription.email} during subscription update.`);
      }
    } else {
      console.warn(`Subscription ${existingSubscription.id} lacks an email, cannot update user.`);
    }
  } catch (error) {
    console.error(`Error in handleSubscriptionUpdated for subscription ${subscription.id}:`, error);
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  console.log(`Processing subscription deleted event for Stripe subscription: ${subscription.id}`);

  try {
    // Find subscription in our system
    const allSubscriptions = await subscriptionStorage.getAllSubscriptions();
    const existingSubscription = Object.values(allSubscriptions).find(
      sub => sub.stripeSubscriptionId === subscription.id
    );

    if (!existingSubscription) {
      console.log(`No existing subscription found for Stripe subscription ID: ${subscription.id}. It might have been already processed or never fully created in our DB.`);
      return;
    }

    // Update subscription data in our system
    existingSubscription.active = false;
    existingSubscription.updatedAt = new Date().toISOString();
    existingSubscription.stripeData = {
      ...existingSubscription.stripeData,
      status: subscription.status, // e.g., 'canceled'
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString(),
      endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : new Date().toISOString(), // Stripe sends ended_at when the subscription is truly finished after cancellation
    };

    // Store updated subscription
    await subscriptionStorage.setSubscription(
      existingSubscription.id,
      existingSubscription
    );
    console.log(`Subscription ${existingSubscription.id} in local DB marked as inactive/deleted due to Stripe event. Status: ${subscription.status}`);

    // Update the associated user
    if (existingSubscription.email) {
      const user = await userStorage.getUser(existingSubscription.email);
      if (user) {
        user.active = false; // Mark user as inactive or revert to a 'free' tier status
        user.subscriptionType = "free"; // Or your default non-subscribed tier
        user.updatedAt = new Date().toISOString();
        // Clear or update subscription details on the user object
        user.subscriptionId = null;
        user.subscription = {
          ...(user.subscription || {}),
          verified: false,
          stripeData: {
            ...(user.subscription?.stripeData || {}),
            subscriptionId: subscription.id,
            status: subscription.status, // 'canceled'
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
            canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString(),
            endedAt: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : new Date().toISOString(),
          },
        };
        await userStorage.setUser(existingSubscription.email, user);
        console.log(`User ${existingSubscription.email} updated to reflect deleted/canceled subscription ${existingSubscription.id}.`);
      } else {
        console.warn(`User not found for email ${existingSubscription.email} during subscription deletion processing.`);
      }
    } else {
      console.warn(`Subscription ${existingSubscription.id} lacks an email, cannot update user upon deletion.`);
    }
  } catch (error) {
    console.error(`Error in handleSubscriptionDeleted for subscription ${subscription.id}:`, error);
  }
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
  // Add logic for handling failed invoice payments (e.g., notify admin, update user status)
  console.log(`Invoice payment failed for: ${invoice.id}, customer: ${invoice.customer}`);
}

const createAndPayInvoice = async (req, res) => {
  try {
    const { email, name, payment_method_id } = req.body;

    if (!email || !payment_method_id) {
      return res.status(400).json({ success: false, message: "Email and payment_method_id are required" });
    }
    if (!process.env.STRIPE_PRICE_ID) {
        return res.status(500).json({ success: false, message: "Stripe Price ID is not configured on the server." });
    }

    const customer = await getOrCreateCustomer(email, name, payment_method_id);

    await stripe.invoiceItems.create({
      customer: customer.id,
      price: process.env.STRIPE_PRICE_ID,
      description: "Standard Product - One Time",
    });

    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: 'charge_automatically',
      auto_advance: true, // Automatically attempts payment after finalization
      // Stripe Dashboard settings for email receipts/invoices are primary for email suppression.
      // Not using send_invoice API call also helps.
    });

    // Stripe attempts payment automatically due to auto_advance: true.
    // The webhook 'invoice.paid' or 'invoice.payment_succeeded' is the source of truth.
    res.json({
      success: true,
      message: "Invoice created and payment automatically initiated. Webhooks will confirm final status.",
      customerId: customer.id,
      invoiceId: invoice.id,
      invoiceStatus: invoice.status, // This will likely be 'draft' or 'open' initially
    });

  } catch (error) {
    console.error("Error in createAndPayInvoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create and pay Stripe invoice",
      error: error.message,
    });
  }
};

const createSubscriptionDirect = async (req, res) => {
  try {
    const { email, name, payment_method_id } = req.body;

    if (!email || !payment_method_id) {
      return res.status(400).json({ success: false, message: "Email and payment_method_id are required" });
    }
    if (!process.env.STRIPE_PRICE_ID) {
        return res.status(500).json({ success: false, message: "Stripe Price ID is not configured on the server." });
    }

    const customer = await getOrCreateCustomer(email, name, payment_method_id);

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: process.env.STRIPE_PRICE_ID }],
      default_payment_method: payment_method_id,
      payment_behavior: 'default_incomplete', // Handles 3DS if necessary
      expand: ['latest_invoice.payment_intent'],
      invoice_settings: {
        // collection_method for invoices generated by this subscription.
        // 'charge_automatically' is default for subscriptions with a payment method.
        // Explicitly setting it reinforces intent and aligns with API-driven payment.
        collection_method: 'charge_automatically'
      }
      // Email suppression for receipts/notifications is best managed via Stripe Dashboard settings.
    });

    // Webhooks ('customer.subscription.created', 'invoice.paid') will handle local DB updates.
    res.json({
      success: true,
      message: "Subscription creation initiated. Webhooks will confirm final status.",
      customerId: customer.id,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret, // For client-side 3DS confirmation if needed
    });

  } catch (error) {
    console.error("Error in createSubscriptionDirect:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create Stripe subscription",
      error: error.message,
    });
  }
};

async function handleInvoicePaymentFailed(invoice) {
  console.log(`Payment failed for invoice: ${invoice.id}`);
  
  // We could send an email notification here if needed
}

const manageStripeCustomer = async (req, res) => {
  try {
    const { email, name, payment_method_id } = req.body; // payment_method_id is optional here
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Use the existing helper. If payment_method_id is provided, it will be attached.
    const customer = await getOrCreateCustomer(email, name, payment_method_id);

    res.json({
      success: true,
      message: "Stripe customer retrieved or created successfully.",
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      defaultPaymentMethod: customer.invoice_settings?.default_payment_method
    });

  } catch (error) {
    console.error("Error in manageStripeCustomer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to manage Stripe customer",
      error: error.message,
    });
  }
};

/**
 * Attach a PaymentMethod to a Customer and set it as default
 */
const attachPaymentMethodToCustomer = async (req, res) => {
  const { paymentMethodId } = req.params;
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ success: false, message: "Customer ID is required." });
  }
  if (!paymentMethodId) {
    return res.status(400).json({ success: false, message: "Payment Method ID is required." });
  }

  try {
    // Attach the PaymentMethod to the Customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set it as the default payment method for the customer's invoices
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Payment method attached and set as default successfully.",
      paymentMethod,
    });
  } catch (error) {
    console.error("Error attaching payment method to customer:", error);
    // Handle specific Stripe errors, e.g., payment method already attached
    if (error.code === 'payment_method_already_attached') {
        try {
            // If already attached, ensure it's set as default
            await stripe.customers.update(customerId, {
              invoice_settings: {
                default_payment_method: paymentMethodId,
              },
            });
            return res.status(200).json({
              success: true,
              message: "Payment method was already attached and has been set as default.",
              paymentMethod: { id: paymentMethodId } // Return the ID as we don't have the full object from a re-attach
            });
        } catch (updateError) {
             console.error("Error setting already attached PM as default:", updateError);
             return res.status(500).json({
                success: false,
                message: "Payment method already attached, but failed to set as default.",
                error: updateError.message,
            });
        }
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to attach payment method.",
      error: error.raw?.message || error.message,
    });
  }
};

/**
 * Create and confirm a PaymentIntent
 */
const createPaymentIntent = async (req, res) => {
  const { customerId, paymentMethodId, amount, currency, description } = req.body;

  if (!customerId || !paymentMethodId || !amount || !currency) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: customerId, paymentMethodId, amount, currency.",
    });
  }

  try {
    const paymentIntentParams = {
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      confirm: true, // Attempt to confirm the payment immediately
      capture_method: 'automatic', // Capture funds automatically
      setup_future_usage: 'off_session', // Good for subscriptions/future invoices
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, // Added to streamline payment flow and prevent redirects from server-side confirmation
      description: description || "Payment for service",
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Handle different PaymentIntent statuses
    if (paymentIntent.status === 'succeeded') {
      res.status(200).json({
        success: true,
        message: "PaymentIntent created and succeeded.",
        paymentIntent,
      });
    } else if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action') {
      // Client-side confirmation (e.g., 3D Secure) is needed
      res.status(200).json({
        success: true,
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        message: "PaymentIntent created, requires further client action.",
      });
    } else if (paymentIntent.status === 'requires_payment_method' || paymentIntent.status === 'requires_source') {
        res.status(402).json({ // 402 Payment Required, but indicates an issue with the PM
            success: false,
            message: "Payment failed. Please try a different payment method.",
            paymentIntent,
        });
    } else {
      // Other statuses (e.g., 'processing', 'canceled')
      res.status(200).json({
        success: true, // Or false depending on how you want to treat 'processing'
        message: `PaymentIntent status: ${paymentIntent.status}`,
        paymentIntent,
      });
    }
  } catch (error) {
    console.error("Error creating PaymentIntent:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create PaymentIntent.",
      error: error.raw?.message || error.message,
    });
  }
};

/**
 * Create a draft invoice
 */
const createDraftInvoice = async (req, res) => {
  const { customerId, lineItems, description, daysUntilDue } = req.body;

  if (!customerId || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: customerId and a non-empty array of lineItems.",
    });
  }

  // Validate lineItems structure (basic validation)
  for (const item of lineItems) {
    if (!item.price_data || !item.price_data.currency || !item.price_data.product_data || !item.price_data.product_data.name || !item.price_data.unit_amount || !item.quantity) {
      return res.status(400).json({
        success: false,
        message: "Invalid lineItem structure. Each item must include price_data (with currency, product_data.name, unit_amount) and quantity.",
      });
    }
  }

  try {
    const invoiceParams = {
      customer: customerId,
      collection_method: 'charge_automatically', // To prevent Stripe from sending an invoice email. Payment will be attempted via /pay endpoint.
      auto_advance: false, // IMPORTANT: Keeps the invoice as a draft, preventing automatic finalization and payment attempts.
      description: description || "Invoice for services",
      line_items: lineItems,
    };

    if (daysUntilDue) {
      invoiceParams.days_until_due = parseInt(daysUntilDue, 10);
    }

    const invoice = await stripe.invoices.create(invoiceParams);

    res.status(201).json({
      success: true,
      message: "Draft invoice created successfully.",
      invoice,
    });
  } catch (error) {
    console.error("Error creating draft invoice:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create draft invoice.",
      error: error.raw?.message || error.message,
    });
  }
};

/**
 * Finalize a draft invoice
 */
const finalizeDraftInvoice = async (req, res) => {
  const { invoiceId } = req.params;

  if (!invoiceId) {
    return res.status(400).json({ success: false, message: "Invoice ID is required." });
  }

  try {
    const invoice = await stripe.invoices.finalizeInvoice(invoiceId);

    // Check if finalization was successful and the invoice is now open
    if (invoice.status === 'open') {
      res.status(200).json({
        success: true,
        message: "Invoice finalized successfully and is now open.",
        invoice,
      });
    } else {
      // This case should ideally not be hit if finalizeInvoice itself doesn't error
      // but Stripe API might have nuances or future changes.
      res.status(400).json({
        success: false,
        message: `Failed to finalize invoice. Current status: ${invoice.status}`,
        invoice,
      });
    }
  } catch (error) {
    console.error("Error finalizing invoice:", error);
    // Example: Handle error if invoice is already finalized or cannot be finalized
    if (error.code === 'invoice_finalization_error_not_finalizable') {
        return res.status(400).json({
            success: false,
            message: "Invoice cannot be finalized. It might already be finalized or in an invalid state.",
            error: error.raw?.message || error.message,
        });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to finalize invoice.",
      error: error.raw?.message || error.message,
    });
  }
};

/**
 * Pay a finalized invoice
 */
const payInvoice = async (req, res) => {
  const { invoiceId } = req.params;
  const { paymentMethodId } = req.body; // Optional: specific PM to use

  if (!invoiceId) {
    return res.status(400).json({ success: false, message: "Invoice ID is required." });
  }

  try {
    const payParams = {};
    if (paymentMethodId) {
      payParams.payment_method = paymentMethodId;
    }
    // For invoices with charge_automatically, Stripe attempts to pay with the default_payment_method or source.
    // If a specific payment_method is provided, it will be used.
    // The `paid_out_of_band` option is for marking invoices paid externally, not what we need here.
    const invoice = await stripe.invoices.pay(invoiceId, payParams);

    // Handle different invoice statuses after payment attempt
    if (invoice.paid) { // invoice.status === 'paid'
      res.status(200).json({
        success: true,
        message: "Invoice paid successfully.",
        invoice,
      });
    } else if (invoice.status === 'open' && invoice.next_action) {
      // This might happen if payment requires further client action (e.g., 3D Secure)
      // The client would use invoice.payment_intent.client_secret (if available and PI is part of invoice)
      res.status(200).json({
        success: true,
        requiresAction: true,
        message: "Payment requires further client action.",
        invoice, // Contains next_action details and potentially payment_intent ID
        clientSecret: invoice.payment_intent?.client_secret, // If PI is used
      });
    } else if (invoice.status === 'open') {
        // Payment failed, invoice remains open
        res.status(402).json({ // 402 Payment Required (but failed)
            success: false,
            message: "Payment failed. The invoice remains open. Please check payment details or try another method.",
            invoice,
        });
    } else {
      // Other statuses (e.g., 'draft', 'void', 'uncollectible')
      res.status(400).json({
        success: false,
        message: `Invoice payment attempt resulted in status: ${invoice.status}.`,
        invoice,
      });
    }
  } catch (error) {
    console.error("Error paying invoice:", error);
    // Example: Handle specific errors like invoice payment declined
    if (error.code === 'invoice_payment_intent_requires_action') { // Or similar codes
        return res.status(402).json({
            success: false,
            requiresAction: true, // Indicate client action needed
            message: "Payment requires further action (e.g., 3D Secure).",
            clientSecret: error.raw?.payment_intent?.client_secret, // Pass client secret if available
            error: error.raw?.message || error.message,
        });
    }
     if (error.code === 'invoice_no_customer_default_payment_method' && !paymentMethodId) {
        return res.status(400).json({
            success: false,
            message: "Cannot pay invoice: No default payment method for customer and no specific payment method provided.",
            error: error.raw?.message || error.message,
        });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Failed to pay invoice.",
      error: error.raw?.message || error.message,
    });
  }
};

module.exports = {
  createCheckoutSession,
  handleStripeWebhook,
  createAndPayInvoice,
  createSubscriptionDirect,
  manageStripeCustomer,
  attachPaymentMethodToCustomer,
  createPaymentIntent,
  createDraftInvoice,
  finalizeDraftInvoice,
  payInvoice,
};
