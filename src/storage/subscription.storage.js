const NodeCache = require("node-cache");

// Cache with 7 days TTL (in seconds)
const subscriptionCache = new NodeCache({ stdTTL: 7 * 24 * 60 * 60 });

// Cache for usage tracking with 30 days TTL
const usageCache = new NodeCache({ stdTTL: 30 * 24 * 60 * 60 });

/**
 * Set subscription data for a given ID
 * @param {string} subscriptionId - The subscription ID
 * @param {object} data - Subscription data
 */
const setSubscription = async (subscriptionId, data) => {
  if (!subscriptionId) {
    throw new Error("Subscription ID is required");
  }

  // Store by subscription ID
  subscriptionCache.set(subscriptionId, data);

  // Also store in email index if provided
  if (data.email) {
    const emailKey = `email:${data.email}`;
    let emailSubscriptions = subscriptionCache.get(emailKey) || {};
    emailSubscriptions[subscriptionId] = true;
    subscriptionCache.set(emailKey, emailSubscriptions);
  }

  return data;
};

/**
 * Get subscription data for a given ID
 * @param {string} subscriptionId - The subscription ID
 * @returns {object|null} Subscription data or null if not found
 */
const getSubscription = async (subscriptionId) => {
  if (!subscriptionId) {
    return null;
  }

  return subscriptionCache.get(subscriptionId) || null;
};

/**
 * Check if a subscription ID is valid and active
 * @param {string} subscriptionId - The subscription ID
 * @returns {boolean} True if valid, false otherwise
 */
const isValidSubscription = async (subscriptionId) => {
  if (!subscriptionId) {
    return false;
  }

  const subscription = await getSubscription(subscriptionId);
  return subscription && subscription.active === true;
};

/**
 * Get subscription type (free, premium)
 * @param {string} subscriptionId - The subscription ID
 * @returns {string} Subscription type or 'free' if not found
 */
const getSubscriptionType = async (subscriptionId) => {
  if (!subscriptionId) {
    return "free";
  }

  const subscription = await getSubscription(subscriptionId);
  return (subscription && subscription.type) || "free";
};

/**
 * Get all subscriptions for a given email
 * @param {string} email - The user's email
 * @returns {object} Object with subscription IDs as keys
 */
const getSubscriptionsForEmail = async (email) => {
  if (!email) {
    return {};
  }

  // First, check the email index
  const emailKey = `email:${email}`;
  const subscriptionIds = subscriptionCache.get(emailKey) || {};

  // Get all subscriptions from the index
  const subscriptions = {};
  for (const subId in subscriptionIds) {
    if (subscriptionIds[subId]) {
      const sub = await getSubscription(subId);
      if (sub) {
        subscriptions[subId] = sub;
      }
    }
  }

  // As a fallback, also scan all subscriptions for this email
  // This helps find subscriptions that might not be properly indexed
  const allKeys = subscriptionCache.keys();
  for (const key of allKeys) {
    // Skip email index keys
    if (key.startsWith("email:")) {
      continue;
    }

    const sub = subscriptionCache.get(key);
    if (sub && sub.email === email) {
      // Add to results if not already included
      if (!subscriptions[key]) {
        subscriptions[key] = sub;

        // Fix the email index while we're at it
        let emailSubscriptions = subscriptionCache.get(emailKey) || {};
        emailSubscriptions[key] = true;
        subscriptionCache.set(emailKey, emailSubscriptions);

        console.log(
          `Fixed email index for ${email}, added subscription ${key}`
        );
      }
    }
  }

  console.log(
    `Found ${Object.keys(subscriptions).length} subscriptions for ${email}`
  );
  return subscriptions;
};

/**
 * Delete a subscription
 * @param {string} subscriptionId - The subscription ID
 * @returns {boolean} True if deleted, false otherwise
 */
const deleteSubscription = async (subscriptionId) => {
  if (!subscriptionId) {
    return false;
  }

  // Get subscription to find email
  const subscription = subscriptionCache.get(subscriptionId);
  if (subscription && subscription.email) {
    // Remove from email index
    const emailKey = `email:${subscription.email}`;
    const emailSubscriptions = subscriptionCache.get(emailKey) || {};
    delete emailSubscriptions[subscriptionId];
    subscriptionCache.set(emailKey, emailSubscriptions);
  }

  return subscriptionCache.del(subscriptionId);
};

/**
 * Get current month key for usage tracking
 * @returns {string} Current month key in format YYYY-MM
 */
const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Get usage data for a user for the current month
 * @param {string} userIdentifier - User identifier (email, chat_id, etc.)
 * @returns {object} Usage data with message count and details
 */
const getMonthlyUsage = async (userIdentifier) => {
  if (!userIdentifier) {
    return { messageCount: 0, details: [] };
  }

  const monthKey = getCurrentMonthKey();
  const usageKey = `usage:${userIdentifier}:${monthKey}`;

  const usage = usageCache.get(usageKey) || {
    messageCount: 0,
    details: [],
    monthKey: monthKey,
    userIdentifier: userIdentifier,
  };

  return usage;
};

/**
 * Increment usage count for a user
 * @param {string} userIdentifier - User identifier (email, chat_id, etc.)
 * @param {object} messageDetails - Details about the message
 * @returns {object} Updated usage data
 */
const incrementUsage = async (userIdentifier, messageDetails = {}) => {
  if (!userIdentifier) {
    throw new Error("User identifier is required");
  }

  const monthKey = getCurrentMonthKey();
  const usageKey = `usage:${userIdentifier}:${monthKey}`;

  const usage = usageCache.get(usageKey) || {
    messageCount: 0,
    details: [],
    monthKey: monthKey,
    userIdentifier: userIdentifier,
  };

  // Increment count
  usage.messageCount += 1;

  // Add message details
  usage.details.push({
    timestamp: new Date().toISOString(),
    ...messageDetails,
  });

  // Keep only last 50 details to prevent memory issues
  if (usage.details.length > 50) {
    usage.details = usage.details.slice(-50);
  }

  // Update cache
  usageCache.set(usageKey, usage);

  console.log(
    `Usage incremented for ${userIdentifier}: ${usage.messageCount} messages this month`
  );
  return usage;
};

/**
 * Check if user has exceeded their monthly limit
 * @param {string} userIdentifier - User identifier
 * @param {number} limit - Monthly message limit (default: 5)
 * @returns {boolean} True if limit exceeded
 */
const hasExceededLimit = async (userIdentifier, limit = 5) => {
  if (!userIdentifier) {
    return false;
  }

  const usage = await getMonthlyUsage(userIdentifier);
  return usage.messageCount >= limit;
};

/**
 * Reset usage for a user (admin function)
 * @param {string} userIdentifier - User identifier
 * @returns {boolean} True if reset successful
 */
const resetUsage = async (userIdentifier) => {
  if (!userIdentifier) {
    return false;
  }

  const monthKey = getCurrentMonthKey();
  const usageKey = `usage:${userIdentifier}:${monthKey}`;

  usageCache.del(usageKey);
  console.log(`Usage reset for ${userIdentifier}`);
  return true;
};

/**
 * Get all usage data (admin function)
 * @returns {object} All usage data
 */
const getAllUsage = async () => {
  const allUsage = {};
  const allKeys = usageCache.keys();

  for (const key of allKeys) {
    if (key.startsWith("usage:")) {
      const usage = usageCache.get(key);
      if (usage) {
        allUsage[key] = usage;
      }
    }
  }

  return allUsage;
};

module.exports = {
  subscriptionCache,
  usageCache,
  setSubscription,
  getSubscription,
  isValidSubscription,
  getSubscriptionType,
  getSubscriptionsForEmail,
  deleteSubscription,
  // Usage tracking functions
  getMonthlyUsage,
  incrementUsage,
  hasExceededLimit,
  resetUsage,
  getAllUsage,
  getCurrentMonthKey,
};
