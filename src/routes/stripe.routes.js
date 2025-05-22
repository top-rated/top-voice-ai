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

/**
 * @route POST /api/v1/stripe/invoices/create-and-pay
 * @desc Create a customer (if needed), create an invoice for the standard product, and attempt to pay it immediately.
 * @access Public (should be protected if used by end-users, but assumed to be called by secured AI agent)
 */
router.post("/invoices/create-and-pay", stripeController.createAndPayInvoice);

/**
 * @route POST /api/v1/stripe/subscriptions/create
 * @desc Create a customer (if needed) and a Stripe subscription directly.
 * @access Public (should be protected if used by end-users, but assumed to be called by secured AI agent)
 */
router.post("/subscriptions/create", stripeController.createSubscriptionDirect);

/**
 * @route POST /api/v1/stripe/customers
 * @desc Create or retrieve a Stripe customer, optionally attaching a payment method.
 * @access Public (should be protected if used by end-users, but assumed to be called by secured AI agent)
 */
router.post("/customers", stripeController.manageStripeCustomer);

module.exports = router;
