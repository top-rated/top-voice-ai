const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripe.controller");
const { verifyToken } = require("../middleware/auth.middleware"); // Added for route protection

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
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeController.handleStripeWebhook
);

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
router.post("/customers", verifyToken, stripeController.manageStripeCustomer);

/**
 * @route POST /api/v1/stripe/payment-methods/:paymentMethodId/attach
 * @desc Attach a PaymentMethod to a Customer
 * @access Protected (User must be authenticated)
 * @param {string} paymentMethodId - Stripe PaymentMethod ID (from URL param)
 * @body {string} customerId - Stripe Customer ID to attach to
 */
router.post(
  "/payment-methods/:paymentMethodId/attach",
  verifyToken,
  stripeController.attachPaymentMethodToCustomer
);

/**
 * @route POST /api/v1/stripe/payment-intents
 * @desc Create and optionally confirm a PaymentIntent
 * @access Protected (User must be authenticated)
 * @body {string} customerId - Stripe Customer ID
 * @body {string} paymentMethodId - Stripe PaymentMethod ID to charge
 * @body {number} amount - Amount to charge (in smallest currency unit, e.g., cents)
 * @body {string} currency - Currency code (e.g., 'usd')
 * @body {string} [description] - Optional description for the payment
 */
router.post(
  "/payment-intents",
  verifyToken,
  stripeController.createPaymentIntent
);

/**
 * @route POST /api/v1/stripe/invoices
 * @desc Create a new draft invoice
 * @access Protected (User must be authenticated)
 * @body {string} customerId - Stripe Customer ID
 * @body {array} lineItems - Array of line items for the invoice. Each item: { price_data: { currency, product_data: { name }, unit_amount }, quantity }
 * @body {string} [description] - Optional invoice description
 * @body {number} [daysUntilDue] - Optional days until the invoice is due (if not paying immediately after finalization)
 */
router.post("/invoices", verifyToken, stripeController.createDraftInvoice);

/**
 * @route POST /api/v1/stripe/invoices/:invoiceId/finalize
 * @desc Finalize a draft invoice
 * @access Protected (User must be authenticated)
 * @param {string} invoiceId - Stripe Invoice ID (from URL param)
 */
router.post(
  "/invoices/:invoiceId/finalize",
  verifyToken,
  stripeController.finalizeDraftInvoice
);

/**
 * @route POST /api/v1/stripe/invoices/:invoiceId/pay
 * @desc Pay a finalized invoice
 * @access Protected (User must be authenticated)
 * @param {string} invoiceId - Stripe Invoice ID (from URL param)
 * @body {string} [paymentMethodId] - Optional: Specific PaymentMethod ID to use. If not provided, uses customer's default.
 */
router.post(
  "/invoices/:invoiceId/pay",
  verifyToken,
  stripeController.payInvoice
);

/**
 * @route GET /api/v1/stripe/subscriptions/fetch-from-stripe/:email
 * @desc Fetch subscription data directly from Stripe API by customer email
 * @access Protected (User must be authenticated)
 * @param {string} email - Customer email address (from URL param)
 */
router.get(
  "/subscriptions/fetch-from-stripe/:email",
  verifyToken,
  stripeController.fetchStripeSubscriptionsByEmail
);

module.exports = router;
