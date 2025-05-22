const express = require("express");
const router = express.Router();
const { userStorage, subscriptionStorage } = require("../utils/storage");
const { checkSubscriptionByEmail } = require("../controllers/auth.controller"); 

/**
 * @route   GET /api/v1/license/check/:email
 * @desc    Check subscription status by email (local first, then Stripe)
 * @access  Public
 */
router.get("/check/:email", checkSubscriptionByEmail);

module.exports = router;
