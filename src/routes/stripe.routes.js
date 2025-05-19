const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripe.controller");

/**
 * @route POST /api/v1/stripe/create-checkout-session
 * @desc Create a Stripe checkout session
 * @access Public
 */
router.post("/create-checkout-session", stripeController.createCheckoutSession);

/**
 * @route POST /api/v1/stripe/webhook
 * @desc Handle Stripe webhook events
 * @access Public
 */
router.post("/webhook", express.raw({ type: 'application/json' }), stripeController.handleStripeWebhook);

module.exports = router;
