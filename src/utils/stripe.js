const axios = require("axios");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Create a Stripe checkout session
 * @param {string} email - Customer email
 * @param {string} successUrl - URL to redirect to on successful payment
 * @param {string} cancelUrl - URL to redirect to on cancelled payment
 * @returns {Promise<Object>} Checkout session
 */
async function createCheckoutSession(email, successUrl, cancelUrl) {
  try {
    console.log(`Creating Stripe checkout session for ${email}...`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is missing");
      return {
        success: false,
        message: "Stripe configuration is missing",
      };
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error("Stripe price ID is missing");
      return {
        success: false,
        message: "Stripe price configuration is missing",
      };
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
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session',
        },
      },
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return {
      success: false,
      message: error.message || "Failed to create checkout session",
    };
  }
}

/**
 * Verify a Stripe subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Subscription details
 */
async function verifySubscription(subscriptionId) {
  try {
    console.log(`Verifying Stripe subscription ${subscriptionId}...`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is missing");
      return {
        success: false,
        message: "Stripe configuration is missing",
      };
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        customerId: subscription.customer,
        active: subscription.status === 'active',
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      },
    };
  } catch (error) {
    console.error("Error verifying Stripe subscription:", error);
    return {
      success: false,
      message: error.message || "Failed to verify subscription",
    };
  }
}

/**
 * Get customer details from Stripe
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} Customer details
 */
async function getCustomer(customerId) {
  try {
    console.log(`Getting Stripe customer ${customerId}...`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is missing");
      return {
        success: false,
        message: "Stripe configuration is missing",
      };
    }

    const customer = await stripe.customers.retrieve(customerId);

    return {
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        created: new Date(customer.created * 1000).toISOString(),
      },
    };
  } catch (error) {
    console.error("Error getting Stripe customer:", error);
    return {
      success: false,
      message: error.message || "Failed to get customer",
    };
  }
}

/**
 * Cancel a Stripe subscription
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Result of cancellation
 */
async function cancelSubscription(subscriptionId) {
  try {
    console.log(`Cancelling Stripe subscription ${subscriptionId}...`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is missing");
      return {
        success: false,
        message: "Stripe configuration is missing",
      };
    }

    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    return {
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        canceledAt: new Date(subscription.canceled_at * 1000).toISOString(),
      },
    };
  } catch (error) {
    console.error("Error cancelling Stripe subscription:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel subscription",
    };
  }
}

/**
 * Get all subscriptions for a customer
 * @param {string} customerId - Stripe customer ID
 * @returns {Promise<Object>} List of subscriptions
 */
async function getCustomerSubscriptions(customerId) {
  try {
    console.log(`Getting subscriptions for Stripe customer ${customerId}...`);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Stripe secret key is missing");
      return {
        success: false,
        message: "Stripe configuration is missing",
      };
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
    });

    return {
      success: true,
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        active: sub.status === 'active',
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      })),
    };
  } catch (error) {
    console.error("Error getting customer subscriptions:", error);
    return {
      success: false,
      message: error.message || "Failed to get subscriptions",
    };
  }
}

module.exports = {
  createCheckoutSession,
  verifySubscription,
  getCustomer,
  cancelSubscription,
  getCustomerSubscriptions,
};
