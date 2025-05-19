const axios = require("axios");

const GUMROAD_API_BASE = "https://api.gumroad.com/v2";
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID;

// Make sure to remove quotes from environment variables if they exist
const cleanToken = GUMROAD_ACCESS_TOKEN
  ? GUMROAD_ACCESS_TOKEN.replace(/["']/g, "")
  : "";
const cleanProductId = GUMROAD_PRODUCT_ID
  ? GUMROAD_PRODUCT_ID.replace(/["']/g, "")
  : "";

/**
 * Verify a Gumroad license key
 * @param {string} licenseKey - The license key to verify
 * @returns {Promise<Object>} The license verification result
 */
async function verifyLicense(licenseKey) {
  try {
    const response = await axios.post(
      `${GUMROAD_API_BASE}/licenses/verify`,
      {
        product_id: GUMROAD_PRODUCT_ID,
        license_key: licenseKey,
      },
      {
        headers: {
          Authorization: `Bearer ${GUMROAD_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error verifying Gumroad license:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "License verification failed",
    };
  }
}

/**
 * Get product details from Gumroad
 * @returns {Promise<Object>} The product details
 */
async function getProductDetails() {
  try {
    const response = await axios.get(
      `${GUMROAD_API_BASE}/products/${GUMROAD_PRODUCT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GUMROAD_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Error fetching product details:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * Get all subscriptions from Gumroad for our product
 * @returns {Promise<Array>} Array of subscription objects
 */
async function getSubscriptions() {
  try {
    console.log("Fetching subscriptions from Gumroad API...");

    // Use the cleaned token and product ID
    const token = cleanToken;
    const productId = cleanProductId;

    if (!token) {
      console.error("Gumroad access token is missing or invalid");
      return {
        success: false,
        message: "Gumroad access token is missing",
        subscriptions: [],
      };
    }

    // Fetch sales with subscription data
    const response = await axios.get(`${GUMROAD_API_BASE}/sales`, {
      params: {
        product_id: productId,
        after: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Last year
        subscription_active: "true",
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.data || !response.data.sales) {
      console.warn("No subscription data returned from Gumroad API");
      return { success: true, subscriptions: [] };
    }

    console.log(
      `Fetched ${response.data.sales.length} subscriptions from Gumroad`
    );

    // Transform the Gumroad data into our subscription format
    const subscriptions = response.data.sales.map((sale) => {
      // Generate a valid ID, ensuring it's never undefined
      const subscriptionId = sale.subscription_id || sale.id;
      const id = subscriptionId
        ? `gumroad_direct_${subscriptionId}`
        : `gumroad_purchase_${sale.id}`;

      return {
        id: id, // Ensure ID is never undefined
        email: sale.email,
        active: sale.subscription_ended_at ? false : true,
        type: "premium",
        source: "gumroad_api",
        gumroadSubscriptionId: sale.subscription_id,
        gumroadPurchaseId: sale.id,
        createdAt: sale.created_at,
        updatedAt: new Date().toISOString(),
        gumroadData: {
          purchaseId: sale.id,
          productId: sale.product_id,
          productName: sale.product_name,
          price: sale.price,
          currency: sale.currency,
          subscriptionId: sale.subscription_id,
          subscriptionEndedAt: sale.subscription_ended_at,
          refunded: sale.refunded,
        },
      };
    });

    return {
      success: true,
      subscriptions,
      totalCount: response.data.sales.length,
    };
  } catch (error) {
    console.error(
      "Error fetching Gumroad subscriptions:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message: error.response?.data?.message || "Failed to fetch subscriptions",
      subscriptions: [],
    };
  }
}

/**
 * Verify a subscription by email
 * @param {string} email - The email to verify
 * @returns {Promise<Object>} The subscription verification result
 */
async function verifySubscriptionByEmail(email) {
  try {
    // Get all subscriptions from Gumroad
    const result = await getSubscriptions();

    if (!result.success) {
      return {
        success: false,
        message: result.message || "Failed to fetch subscriptions",
      };
    }

    // Filter subscriptions to find active ones matching the email
    const matchingSubscriptions = result.subscriptions.filter(
      (sub) => sub.email.toLowerCase() === email.toLowerCase() && sub.active
    );

    if (matchingSubscriptions.length === 0) {
      return {
        success: false,
        message: "No active subscription found for this email",
      };
    }

    // Return the first matching subscription
    const subscription = matchingSubscriptions[0];

    return {
      success: true,
      message: "Subscription verified successfully",
      subscription,
    };
  } catch (error) {
    console.error(
      "Error verifying subscription by email:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message || "Subscription verification failed",
    };
  }
}

/**
 * Create a new subscriber in Gumroad
 * @param {string} email - The email of the subscriber
 * @param {string} productId - The Gumroad product ID (optional, uses default if not provided)
 * @param {number} priceInCents - The price in cents (optional)
 * @returns {Promise<Object>} The result of the subscription creation
 */
async function createSubscriber(email, productId = null, priceInCents = 900) {
  try {
    console.log(`Creating Gumroad subscriber for ${email}...`);

    // Use the cleaned token and product ID
    const token = cleanToken;
    const useProductId = productId || cleanProductId;

    if (!token) {
      console.error("Gumroad access token is missing or invalid");
      return {
        success: false,
        message: "Gumroad access token is missing",
      };
    }

    if (!useProductId) {
      console.error("Gumroad product ID is missing or invalid");
      return {
        success: false,
        message: "Gumroad product ID is missing",
      };
    }

    // Create the subscriber in Gumroad
    const response = await axios.post(
      `${GUMROAD_API_BASE}/products/${useProductId}/subscribers`,
      {
        email: email,
        price_cents: priceInCents,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Gumroad subscriber creation response:", response.data);

    if (response.data && response.data.success) {
      return {
        success: true,
        message: "Subscriber created successfully in Gumroad",
        subscriber: response.data.subscriber,
      };
    } else {
      return {
        success: false,
        message:
          response.data?.message || "Failed to create subscriber in Gumroad",
      };
    }
  } catch (error) {
    console.error(
      "Error creating Gumroad subscriber:",
      error.response?.data || error.message
    );
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Failed to create subscriber in Gumroad",
      error: error.response?.data || error.message,
    };
  }
}

/**
 * Cancel a subscription on Gumroad.
 * Requires the Gumroad subscription ID (the one that looks like an email, e.g., 'subscriber_id@gumroad.com' or a direct ID).
 * The Gumroad API documentation should be consulted for the exact endpoint and method.
 * This implementation assumes a DELETE request to /v2/subscribers/{id} or /v2/subscriptions/{id}.
 * @param {string} gumroadSubscriberId - The Gumroad subscriber ID or subscription ID.
 * @returns {Promise<Object>} The result of the cancellation attempt.
 */
async function cancelGumroadSubscription(gumroadSubscriberId) {
  if (!cleanToken) {
    console.error("Gumroad access token is missing or invalid for cancellation.");
    return {
      success: false,
      message: "Gumroad access token is missing or invalid.",
    };
  }
  if (!gumroadSubscriberId) {
    console.error("Gumroad subscription ID is required for cancellation.");
    return { success: false, message: "Gumroad subscription ID is required." };
  }

  try {
    console.log(`Attempting to cancel Gumroad subscription: ${gumroadSubscriberId}`);
    // Gumroad's API for cancelling/deleting a subscription might vary.
    // Common patterns are DELETE /v2/subscribers/{id} or /v2/subscriptions/{id}
    // Or it could be an UPDATE (PUT/PATCH) to set an 'ended_at' or 'cancelled_at' field.
    // Assuming a DELETE request to a subscribers endpoint as a common practice:
    // IMPORTANT: Replace with the correct Gumroad API endpoint if different.
    const response = await axios.delete(
      `${GUMROAD_API_BASE}/subscribers/${encodeURIComponent(gumroadSubscriberId)}`,
      {
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Check for a successful response (e.g., 200 OK or 204 No Content)
    if (response.status === 200 || response.status === 204) {
      console.log(`Successfully cancelled Gumroad subscription: ${gumroadSubscriberId}`);
      return { success: true, message: "Subscription cancelled successfully on Gumroad." };
    }
    // Handle other success statuses if Gumroad API behaves differently
    console.warn(`Gumroad cancellation for ${gumroadSubscriberId} returned status: ${response.status}`, response.data);
    return {
      success: false, // Or true depending on how Gumroad signals success
      message: response.data?.message || `Cancellation attempt returned status ${response.status}.`,
      data: response.data,
    };

  } catch (error) {
    console.error(
      `Error cancelling Gumroad subscription ${gumroadSubscriberId}:`,
      error.response?.data || error.message
    );
    // Provide more specific error messages if possible
    let errorMessage = "Failed to cancel subscription on Gumroad.";
    if (error.response?.status === 404) {
      errorMessage = "Subscription not found on Gumroad or already cancelled.";
    }
    return {
      success: false,
      message: error.response?.data?.message || errorMessage,
      errorDetails: error.response?.data,
    };
  }
}

module.exports = {
  verifyLicense,
  getProductDetails,
  getSubscriptions,
  verifySubscriptionByEmail,
  createSubscriber,
  cancelGumroadSubscription, // Export the new function
};
