const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { verifyAdmin } = require("../middleware/auth.middleware");

/**
 * @route POST /api/v1/admin/login
 * @desc Admin login
 * @access Public
 */
router.post("/login", adminController.login);

/**
 * @route GET /api/v1/admin/top-voices/stats
 * @desc Get top voices statistics for admin
 * @access Admin only
 */
router.get("/top-voices/stats", verifyAdmin, (req, res) => {
  console.log("top-voices/stats endpoint called");
  return adminController.getTopVoicesStats(req, res);
});

/**
 * @route POST /api/v1/admin/top-voices/refresh
 * @desc Refresh top voices data
 * @access Admin only
 */
router.post(
  "/top-voices/refresh",
  verifyAdmin,
  adminController.refreshTopVoices
);

/**
 * All routes in this file should be protected with the verifyAdmin middleware
 */

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users with pagination and search
 * @access Admin only
 */
router.get("/users", verifyAdmin, adminController.getUsers);

/**
 * @route GET /api/v1/admin/users/:email
 * @desc Get a specific user by email
 * @access Admin only
 */
router.get("/users/:email", verifyAdmin, adminController.getUserByEmail);

/**
 * @route PUT /api/v1/admin/users/:email
 * @desc Update a user's information
 * @access Admin only
 */
router.put("/users/:email", verifyAdmin, adminController.updateUser);

/**
 * @route POST /api/v1/admin/users/:email/activate
 * @desc Activate a user
 * @access Admin only
 */
router.post(
  "/users/:email/activate",
  verifyAdmin,
  adminController.activateUser
);

/**
 * @route POST /api/v1/admin/users/:email/deactivate
 * @desc Deactivate a user
 * @access Admin only
 */
router.post(
  "/users/:email/deactivate",
  verifyAdmin,
  adminController.deactivateUser
);

/**
 * @route DELETE /api/v1/admin/users/:email
 * @desc Delete a user
 * @access Admin only
 */
router.delete("/users/:email", verifyAdmin, adminController.deleteUser);

/**
 * @route GET /api/v1/admin/subscriptions
 * @desc Get all subscriptions
 * @access Admin only
 */
router.get("/subscriptions", verifyAdmin, adminController.getSubscriptions);

/**
 * @route POST /api/v1/admin/subscriptions/:subscriptionId/activate
 * @desc Activate a subscription
 * @access Admin only
 */
router.post(
  "/subscriptions/:subscriptionId/activate",
  verifyAdmin,
  adminController.activateSubscription
);

/**
 * @route POST /api/v1/admin/subscriptions/:subscriptionId/deactivate
 * @desc Deactivate a subscription
 * @access Admin only
 */
router.post(
  "/subscriptions/:subscriptionId/deactivate",
  verifyAdmin,
  adminController.deactivateSubscription
);

/**
 * @route GET /api/v1/admin/stats
 * @desc Get system statistics and recent activity
 * @access Admin only
 */
router.get("/stats", verifyAdmin, adminController.getStats);

/**
 * @route GET /api/v1/admin/settings
 * @desc Get system settings
 * @access Admin only
 */
router.get("/settings", verifyAdmin, adminController.getSettings);

/**
 * @route PUT /api/v1/admin/settings
 * @desc Update system settings
 * @access Admin only
 */
router.put("/settings", verifyAdmin, adminController.updateSettings);

/**
 * @route GET /api/v1/admin/activity
 * @desc Get recent system activity
 * @access Admin only
 */
router.get("/activity", verifyAdmin, adminController.getActivity);

/**
 * @route POST /api/v1/admin/subscriptions/manual
 * @desc Add a manual subscription for a user
 * @access Admin only
 */
router.post(
  "/subscriptions/manual",
  verifyAdmin,
  adminController.addManualSubscription
);

/**
 * @route POST /api/v1/admin/subscriptions/stripe
 * @desc Add a Stripe subscription for a user
 * @access Admin only
 */
router.post(
  "/subscriptions/stripe",
  verifyAdmin,
  adminController.addStripeSubscription
);

/**
 * @route POST /api/v1/admin/subscriptions/scan
 * @desc Scan for missing subscriptions
 * @access Admin only
 */
router.post(
  "/subscriptions/scan",
  verifyAdmin,
  adminController.scanForMissingSubscriptions
);

/**
 * @route GET /api/v1/admin/stripe-dashboard
 * @desc Get Stripe balance and subscription data for admin dashboard
 * @access Admin only
 */
router.get("/stripe-dashboard", verifyAdmin, adminController.getStripeDashboardData);

module.exports = router;
