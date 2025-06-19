const {
  getMonthlyUsage,
  incrementUsage,
  hasExceededLimit,
} = require("../storage/subscription.storage");
const { userStorage } = require("../utils/storage");
const { getFeaturesByType } = require("../controllers/auth.controller");

/**
 * Check if a message should be exempt from usage counting
 * @param {string} message - The message content
 * @returns {boolean} True if message should be exempt
 */
const isExemptMessage = (message) => {
  if (!message || typeof message !== "string") {
    return false;
  }

  const exemptKeywords = [
    // Premium/subscription related
    "premium",
    "subscription",
    "upgrade",
    "payment",
    "billing",
    "purchase",
    "buy",
    "stripe",
    "checkout",
    "pricing",
    "plan",
    "subscribe",

    // Feature information
    "features",
    "what can you do",
    "help",
    "commands",
    "available",
    "how to use",
    "getting started",
    "tutorial",

    // Onboarding and setup
    "welcome",
    "hello",
    "hi",
    "start",
    "begin",

    // Error/system messages
    "error",
    "limit",
    "exceeded",
    "sorry",
    "unable",
  ];

  const messageLower = message.toLowerCase();
  return exemptKeywords.some((keyword) => messageLower.includes(keyword));
};

/**
 * Check if a message is asking about premium features or subscription
 * @param {string} message - The message content
 * @returns {boolean} True if message is about premium/subscription
 */
const isPremiumInquiry = (message) => {
  if (!message || typeof message !== "string") {
    return false;
  }

  const premiumKeywords = [
    "premium",
    "subscription",
    "upgrade",
    "payment",
    "pricing",
    "plan",
    "subscribe",
    "buy",
    "purchase",
    "checkout",
    "billing",
    "limit",
    "unlimited",
    "pro",
    "paid",
  ];

  const messageLower = message.toLowerCase();
  return premiumKeywords.some((keyword) => messageLower.includes(keyword));
};

/**
 * Generate usage limit exceeded message with premium upgrade info
 * @param {object} usage - Current usage data
 * @param {number} limit - The usage limit
 * @returns {string} Limit exceeded message
 */
const generateLimitExceededMessage = (usage, limit = 5) => {
  return `🚫 **Monthly Message Limit Reached**

You've used ${usage.messageCount}/${limit} free messages this month.

**🌟 Upgrade to Premium for:**
✅ Unlimited messages
✅ Advanced LinkedIn insights
✅ Profile analysis
✅ Priority support

**Ready to upgrade?** 
Just ask me "How can I upgrade to premium?" and I'll help you get started!

Your message limit will reset next month, or upgrade now for immediate access.`;
};

/**
 * Middleware to check and enforce usage limits
 * @param {object} options - Configuration options
 * @param {number} options.limit - Monthly message limit (default: 5)
 * @param {boolean} options.trackUsage - Whether to track usage (default: true)
 */
const usageLimitMiddleware = (options = {}) => {
  const { limit = 5, trackUsage = true } = options;

  return async (req, res, next) => {
    try {
      // Skip if tracking is disabled
      if (!trackUsage) {
        return next();
      }

      // Extract user identifier from different sources
      let userIdentifier = null;
      let userEmail = null;
      let subscriptionType = "free";

      // From LinkedIn webhook
      if (req.body.chat_id) {
        userIdentifier = req.body.chat_id;
        // Try to get sender email if available
        if (req.body.sender && req.body.sender.email) {
          userEmail = req.body.sender.email;
        }
      }
      // From chat API
      else if (req.body.threadId) {
        userIdentifier = req.body.threadId;
        // Try to get user email from request if available
        if (req.body.email) {
          userEmail = req.body.email;
        }
      }
      // For other endpoints, try to get from auth token or request
      else if (req.user && req.user.email) {
        userIdentifier = req.user.email;
        userEmail = req.user.email;
      }

      // Skip if no user identifier found
      if (!userIdentifier) {
        console.log("No user identifier found, skipping usage check");
        return next();
      }

      // Check if user has premium subscription
      if (userEmail) {
        try {
          const user = await userStorage.getUser(userEmail);
          if (user && user.subscriptionType) {
            subscriptionType = user.subscriptionType;
          }
        } catch (error) {
          console.log("Error checking user subscription type:", error.message);
        }
      }

      // Skip usage check for premium users
      if (
        subscriptionType === "premium" ||
        subscriptionType === "manual_premium" ||
        subscriptionType === "admin_added"
      ) {
        console.log(
          `User ${userIdentifier} has premium subscription, skipping usage check`
        );
        return next();
      }

      // Get current message content
      const messageContent = req.body.message || req.body.query || "";

      // Check if message is exempt from counting
      if (isExemptMessage(messageContent)) {
        console.log(
          `Message from ${userIdentifier} is exempt from usage counting`
        );
        req.exemptFromUsage = true;
        return next();
      }

      // Check current usage
      const usage = await getMonthlyUsage(userIdentifier);

      // Check if user has exceeded limit
      if (usage.messageCount >= limit) {
        console.log(
          `User ${userIdentifier} has exceeded monthly limit: ${usage.messageCount}/${limit}`
        );

        // If this is a premium inquiry, allow it but mark as exempt
        if (isPremiumInquiry(messageContent)) {
          console.log("Allowing premium inquiry despite limit exceeded");
          req.exemptFromUsage = true;
          return next();
        }

        // Return limit exceeded response
        const limitMessage = generateLimitExceededMessage(usage, limit);

        // For LinkedIn webhook, store the response for sending
        if (req.body.chat_id) {
          req.limitExceededResponse = limitMessage;
          return res.status(200).json({
            status: "limit_exceeded",
            message: "Monthly limit exceeded",
            response: limitMessage,
          });
        }

        // For chat API, return limit exceeded
        return res.status(429).json({
          error: "Monthly limit exceeded",
          message: limitMessage,
          usage: {
            current: usage.messageCount,
            limit: limit,
            resetDate: `${new Date().getFullYear()}-${String(
              new Date().getMonth() + 2
            ).padStart(2, "0")}-01`,
          },
        });
      }

      // Add usage info to request for later tracking
      req.usageInfo = {
        userIdentifier,
        userEmail,
        currentUsage: usage,
        limit,
      };

      next();
    } catch (error) {
      console.error("Error in usage limit middleware:", error);
      // Don't block the request on middleware errors
      next();
    }
  };
};

/**
 * Middleware to track usage after successful message processing
 */
const trackUsageMiddleware = async (req, res, next) => {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  // Flag to ensure we only track once
  let hasTracked = false;

  const trackUsage = async () => {
    if (hasTracked || req.exemptFromUsage || req.limitExceededResponse) {
      return;
    }

    if (req.usageInfo && req.usageInfo.userIdentifier) {
      try {
        const messageContent = req.body.message || req.body.query || "";
        await incrementUsage(req.usageInfo.userIdentifier, {
          message: messageContent.substring(0, 100), // Store first 100 chars
          userEmail: req.usageInfo.userEmail,
          endpoint: req.path,
          method: req.method,
        });
        hasTracked = true;
        console.log(`Usage tracked for ${req.usageInfo.userIdentifier}`);
      } catch (error) {
        console.error("Error tracking usage:", error);
      }
    }
  };

  // Override response methods to track on successful response
  res.send = function (body) {
    if (res.statusCode < 400) {
      trackUsage();
    }
    return originalSend.call(this, body);
  };

  res.json = function (body) {
    if (res.statusCode < 400) {
      trackUsage();
    }
    return originalJson.call(this, body);
  };

  res.end = function (chunk, encoding) {
    if (res.statusCode < 400) {
      trackUsage();
    }
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = {
  usageLimitMiddleware,
  trackUsageMiddleware,
  isExemptMessage,
  isPremiumInquiry,
  generateLimitExceededMessage,
};
