const express = require("express");
const router = express.Router();
const { verifySubscriptionByEmail } = require("../utils/gumroad"); 
const { userStorage, subscriptionStorage } = require("../utils/storage");
const { checkSubscriptionByEmail } = require("../controllers/auth.controller"); 

/**
 * @route   GET /api/v1/license/check/:email
 * @desc    Check subscription status by email (local first, then Gumroad)
 * @access  Public
 */
router.get("/check/:email", checkSubscriptionByEmail);

/**
 * Verify a user by email - checks for active subscription in Gumroad
 * POST /api/license/verify
 * @body {string} email - The user's email
 */
router.post("/verify", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Get existing user data or create new user data
    let userData = (await userStorage.getUser(email)) || {};

    // Verify the subscription with Gumroad using email
    const verificationResult = await verifySubscriptionByEmail(email);

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.message || "No active subscription found",
      });
    }

    // Get or create subscription
    let subscriptionId = userData.subscriptionId;
    if (!subscriptionId) {
      subscriptionId = `premium_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 15)}`;
      userData.subscriptionId = subscriptionId;
    }

    // Update user data with subscription information
    userData = {
      ...userData,
      email,
      name: userData.name || email.split("@")[0],
      subscriptionId,
      subscriptionType: "premium",
      subscription: {
        verified: true,
        verifiedAt: new Date().toISOString(),
        gumroadData: verificationResult.subscription,
      },
    };

    // Store updated user data
    await userStorage.setUser(email, userData);

    // Create or update subscription
    await subscriptionStorage.setSubscription(subscriptionId, {
      active: true,
      type: "premium",
      email,
      createdAt: userData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Subscription verified successfully",
      subscriptionId,
      subscriptionType: "premium",
      user: {
        email,
        name: userData.name,
      },
    });
  } catch (error) {
    console.error("Error in subscription verification:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying subscription",
      error: error.message,
    });
  }
});

module.exports = router;
