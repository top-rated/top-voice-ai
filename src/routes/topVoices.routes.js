const express = require("express");
const router = express.Router();
const topVoicesController = require("../controllers/topVoices.controller");
const { verifyToken } = require("../middleware/auth.middleware");

/**
 * @route GET /api/v1/top-voices
 * @desc Get all top voices data
 * @access Public (Free plan feature)
 */
router.get("/", topVoicesController.getAllTopVoices);

/**
 * @route GET /api/v1/top-voices/topics
 * @desc Get all available topics
 * @access Public
 */
router.get("/topics", topVoicesController.getTopics);

/**
 * @route GET /api/v1/top-voices/topic/:topicId
 * @desc Get top voices by topic
 * @access Public
 */
router.get("/topic/:topicId", topVoicesController.getTopVoicesByTopic);

/**
 * @route GET /api/v1/top-voices/trending
 * @desc Get trending posts from top voices
 * @access Public
 */
router.get("/trending", topVoicesController.getTrendingPosts);

/**
 * @route GET /api/v1/top-voices/posts
 * @desc Get all posts across all topics and authors
 * @access Public
 */
router.get("/posts", topVoicesController.getAllPosts);

/**
 * @route GET /api/v1/top-voices/author/:authorId
 * @desc Get posts by a specific top voice author
 * @access Public
 */
router.get("/author/:authorId", topVoicesController.getAuthorPosts);

/**
 * @route GET /api/v1/top-voices/refresh
 * @desc Manually trigger refresh of top voices data
 * @access Private (Admin only)
 */
router.get("/refresh", verifyToken, topVoicesController.refreshTopVoicesData);

/**
 * @route GET /api/v1/top-voices/refresh-all
 * @desc Force refresh all data by clearing cache and reloading
 * @access Public (temporary for debugging)
 */
router.get("/refresh-all", topVoicesController.refreshAllData);

/**
 * @route GET /api/v1/top-voices/debug
 * @desc Debug endpoint to check the structure of the data
 * @access Public (but should be removed in production)
 */
router.get("/debug", topVoicesController.debugDataStructure);

module.exports = router;
