const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

/**
 * @route POST /api/v1/auth/register
 * @desc Register a new user (simplified for GPT)
 * @access Public
 */
router.post("/register", authController.register);

/**
 * @route POST /api/v1/auth/login
 * @desc Login a user and get subscription ID
 * @access Public
 */
router.post("/login", authController.login);

/**
 * @route GET /api/v1/auth/verify-subscription
 * @desc Verify subscription status by ID
 * @access Public
 */
router.get("/verify-subscription", authController.verifySubscription);

/**
 * @route GET /api/v1/auth/subscription/:subscriptionId
 * @desc Get subscription status by ID (GPT-friendly)
 * @access Public
 */
router.get(
  "/subscription/:subscriptionId",
  authController.getSubscriptionStatus
);

module.exports = router;
