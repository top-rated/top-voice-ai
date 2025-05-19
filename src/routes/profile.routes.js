const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profile.controller");
const { verifySubscriptionById } = require("../middleware/auth.middleware");

/**
 * @route POST /api/v1/profiles/analyze
 * @desc Analyze a LinkedIn profile (or multiple profiles)
 * @access Public with subscription ID
 */
router.post(
  "/analyze",
  verifySubscriptionById,
  profileController.analyzeProfiles
);

/**
 * @route GET /api/v1/profiles/posts/:profileId
 * @desc Get posts from a specific LinkedIn profile
 * @access Public with subscription ID
 */
router.get(
  "/posts/:profileId",
  verifySubscriptionById,
  profileController.getProfilePosts
);

/**
 * @route GET /api/v1/profiles/status/:requestId
 * @desc Check status of a profile analysis request
 * @access Public with request ID
 */
router.get("/status/:requestId", profileController.getAnalysisStatus);

/**
 * @route GET /api/v1/profiles/recent
 * @desc Get recently analyzed profiles
 * @access Public with subscription ID
 */
router.get(
  "/recent",
  verifySubscriptionById,
  profileController.getRecentProfiles
);

/**
 * @route DELETE /api/v1/profiles/:profileId
 * @desc Delete a profile analysis
 * @access Public with subscription ID
 */
router.delete(
  "/:profileId",
  verifySubscriptionById,
  profileController.deleteProfileAnalysis
);

module.exports = router;
