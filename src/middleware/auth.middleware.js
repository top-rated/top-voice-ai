const jwt = require("jsonwebtoken");
const { subscriptionStorage } = require("../utils/storage");

/**
 * Middleware to verify JWT token
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Middleware to verify admin role
 */
const verifyAdmin = (req, res, next) => {
  // First verify the token
  verifyToken(req, res, () => {
    // Check if user has admin role
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      return res.status(403).json({ message: "Requires admin privileges" });
    }
  });
};

/**
 * Verify subscription by ID
 * This is a GPT-friendly approach without tokens
 */
const verifySubscriptionById = async (req, res, next) => {
  // Check for subscription ID in query params or request body
  const subscriptionId =
    req.query.subscriptionId || (req.body && req.body.subscriptionId);

  if (!subscriptionId) {
    return res.status(403).json({
      message: "This feature requires a subscription",
      subscriptionUrl: "https://top-rated.pro/l/gpt?wanted=true",
    });
  }

  try {
    // Check if subscription ID is valid and active
    const subscription = await subscriptionStorage.getSubscription(
      subscriptionId
    );

    if (!subscription || !subscription.active) {
      return res.status(403).json({
        message: "Invalid or expired subscription",
        subscriptionUrl: "https://top-rated.pro/l/gpt?wanted=true",
      });
    }

    // Check if subscription type is premium
    if (subscription.type !== "premium") {
      return res.status(403).json({
        message: "This feature requires a premium subscription",
        subscriptionUrl: "https://top-rated.pro/l/gpt?wanted=true",
      });
    }

    // Add subscription info to request
    req.subscription = {
      id: subscriptionId,
      ...subscription,
    };

    next();
  } catch (error) {
    console.error("Error verifying subscription:", error);
    return res.status(500).json({ message: "Failed to verify subscription" });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySubscriptionById,
};
