const express = require("express");
const router = express.Router();
const searchController = require("../controllers/search.controller");
const { verifySubscriptionById } = require("../middleware/auth.middleware");

/**
 * @route GET /api/v1/search
 * @desc Search LinkedIn posts by keywords (GET method for GPT compatibility)
 * @access Public with subscription ID
 */
router.get("/", searchController.directSearch);

/**
 * @route POST /api/v1/search/keywords
 * @desc Search LinkedIn posts by keywords
 * @access Public with subscription ID
 */
router.post(
  "/keywords",
  verifySubscriptionById,
  searchController.searchByKeywords
);

/**
 * @route GET /api/v1/search/results/:searchId
 * @desc Get results of a previous search
 * @access Public with search ID
 */
router.get("/results/:searchId", searchController.getSearchResults);

/**
 * @route GET /api/v1/search/recent
 * @desc Get recent searches
 * @access Public with subscription ID
 */
router.get(
  "/recent",
  verifySubscriptionById,
  searchController.getRecentSearches
);

/**
 * @route DELETE /api/v1/search/:searchId
 * @desc Delete a search
 * @access Public with search ID and subscription ID
 */
router.delete(
  "/:searchId",
  verifySubscriptionById,
  searchController.deleteSearch
);

module.exports = router;
