const axios = require("axios");
const NodeCache = require("node-cache");
const { formatDateRelative } = require('../utils/dateFormatter');

// Cache for storing search results
const searchCache = new NodeCache({ stdTTL: 86400 }); // 24 hour TTL

// Cache for storing search requests status
const requestCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

// Webhook URL for searching LinkedIn posts
const SEARCH_WEBHOOK =
  "https://n8n.top-rated.pro/webhook/67b40ba9-34fd-46e9-96f1-2466c504c2ec";

// Maximum number of retries for webhook calls
const MAX_RETRIES = 3;
// Delay between retries (in milliseconds)
const RETRY_DELAY = 2000;

/**
 * Helper function to retry webhook calls with exponential backoff
 */
const retryWebhookCall = async (searchQuery, retries = 0) => {
  try {
    const response = await axios.post(SEARCH_WEBHOOK, searchQuery);

    if (
      response.data &&
      Array.isArray(response.data.posts) &&
      response.data.posts.length > 0
    ) {
      return response.data;
    }

    // If no results and we haven't reached max retries, wait and try again
    if (retries < MAX_RETRIES) {
      console.log(
        `No results yet, retrying (${retries + 1}/${MAX_RETRIES})...`
      );
      // Wait with exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))
      );
      return retryWebhookCall(searchQuery, retries + 1);
    }

    // If we've exhausted retries, return whatever we have
    return response.data || { posts: [], totalResults: 0 };
  } catch (error) {
    if (retries < MAX_RETRIES) {
      console.error(
        `Error calling webhook, retrying (${retries + 1}/${MAX_RETRIES})...`,
        error.message
      );
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * Math.pow(2, retries))
      );
      return retryWebhookCall(searchQuery, retries + 1);
    }
    throw error;
  }
};

/**
 * Direct search for LinkedIn posts by keywords (GET method)
 * This is a GPT-friendly endpoint that uses query parameters
 */
const directSearch = async (req, res) => {
  try {
    const {
      query,
      timeframe = "past-24h",
      limit = 20,
      page = 1,
      subscriptionId,
    } = req.query;

    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ message: "Please provide a search query" });
    }

    // Verify subscription since this is a premium feature
    if (!subscriptionId) {
      return res.status(403).json({
        message: "This feature requires a subscription",
        subscriptionUrl:
          "https://linkedingpt.gumroad.com/l/subscribe?wanted=true",
      });
    }

    // Validate timeframe
    const validTimeframes = ["past-24h", "past-week", "past-month"];
    const normalizedTimeframe =
      timeframe === "day"
        ? "past-24h"
        : timeframe === "week"
        ? "past-week"
        : timeframe === "month"
        ? "past-month"
        : timeframe;

    if (!validTimeframes.includes(normalizedTimeframe)) {
      return res.status(400).json({
        message:
          "Invalid timeframe. Valid options are: past-24h, past-week, past-month, day, week, month",
        validTimeframes,
      });
    }

    // Create search query for LinkedIn
    const searchQuery = {
      keywords: query,
      datePosted: normalizedTimeframe,
      sortBy: "date_posted",
    };

    // Fetch search results from webhook with retry mechanism
    let results = await retryWebhookCall(searchQuery);

    // Format dates before sending response
    if (results && results.posts && Array.isArray(results.posts)) {
      results.posts = results.posts.map(post => ({
        ...post,
        date: post.date ? formatDateRelative(post.date) : post.date,
      }));
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error in direct search:", error);
    res.status(500).json({ message: "Failed to search by keywords" });
  }
};

/**
 * Search LinkedIn posts by keywords
 * This is a paid feature that allows users to search recent LinkedIn posts
 */
const searchByKeywords = async (req, res) => {
  try {
    const { keywords, timeframe = "past-24h" } = req.body;
    const subscriptionId = req.subscription?.id || req.body.subscriptionId;

    if (!keywords || typeof keywords !== "string" || keywords.trim() === "") {
      return res
        .status(400)
        .json({ message: "Please provide search keywords" });
    }

    // Validate timeframe
    const validTimeframes = ["past-24h", "past-week", "past-month"];
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        message:
          "Invalid timeframe. Valid options are: past-24h, past-week, past-month",
        validTimeframes,
      });
    }

    // Create search query for LinkedIn
    const searchQuery = {
      keywords,
      datePosted: timeframe,
      sortBy: "date_posted",
    };

    // Fetch search results from webhook with retry mechanism
    let results = await retryWebhookCall(searchQuery);

    // Format dates before sending response
    if (results && results.posts && Array.isArray(results.posts)) {
      results.posts = results.posts.map(post => ({
        ...post,
        date: post.date ? formatDateRelative(post.date) : post.date,
      }));
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error("Error searching by keywords:", error);
    res.status(500).json({ message: "Failed to search by keywords" });
  }
};

/**
 * Process search asynchronously
 * This function is called by the searchByKeywords endpoint
 */
const processSearch = async (searchId, keywords, timeframe, subscriptionId) => {
  try {
    // Update request status to processing
    requestCache.set(searchId, {
      ...requestCache.get(searchId),
      status: "processing",
    });

    // Create search query for LinkedIn
    const searchQuery = {
      keywords,
      datePosted: timeframe,
      sortBy: "date_posted",
    };

    // Fetch search results from webhook
    const response = await axios.post(SEARCH_WEBHOOK, searchQuery);

    if (response.data && Array.isArray(response.data.posts)) {
      // Cache the search results
      searchCache.set(searchId, response.data);

      // Update request with success status
      requestCache.set(searchId, {
        ...requestCache.get(searchId),
        status: "completed",
        resultCount: response.data.posts.length,
        completedAt: Date.now(),
      });
    } else {
      // Update request with error
      requestCache.set(searchId, {
        ...requestCache.get(searchId),
        status: "failed",
        error: "No data returned from API",
        completedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error("Error in search process:", error);
    // Update request with error
    requestCache.set(searchId, {
      ...requestCache.get(searchId),
      status: "failed",
      error: error.message || "Internal server error",
      completedAt: Date.now(),
    });
  }
};

/**
 * Get search status and results
 */
const getSearchStatus = async (req, res) => {
  try {
    const { searchId } = req.params;

    if (!searchId) {
      return res.status(400).json({ message: "Search ID is required" });
    }

    const request = requestCache.get(searchId);

    if (!request) {
      return res.status(404).json({ message: "Search not found" });
    }

    // Check if request belongs to user
    if (request.subscriptionId !== req.subscription?.id) {
      return res.status(403).json({ message: "Unauthorized access to search" });
    }

    // If search is completed, include the results
    if (request.status === "completed") {
      const results = searchCache.get(searchId);
      return res.json({
        ...request,
        results,
      });
    }

    res.json(request);
  } catch (error) {
    console.error("Error getting search status:", error);
    res.status(500).json({ message: "Failed to get search status" });
  }
};

/**
 * Get search results
 */
const getSearchResults = async (req, res) => {
  try {
    const { searchId } = req.params;

    if (!searchId) {
      return res.status(400).json({ message: "Search ID is required" });
    }

    // Check if search exists in cache
    const request = requestCache.get(searchId);

    if (!request) {
      return res.status(404).json({ message: "Search not found or expired" });
    }

    // Check if search is completed
    if (request.status !== "completed") {
      return res.status(400).json({
        message: "Search is not completed yet",
        status: request.status,
      });
    }

    // Get results from cache
    const cachedResults = searchCache.get(searchId);

    if (!cachedResults) {
      return res.status(404).json({ message: "Search results expired" });
    }

    let resultsToReturn = { ...cachedResults }; // Clone to avoid modifying cache
    // Format dates before sending response
    if (resultsToReturn.posts && Array.isArray(resultsToReturn.posts)) {
      resultsToReturn.posts = resultsToReturn.posts.map(post => ({
        ...post,
        date: post.date ? formatDateRelative(post.date) : post.date,
      }));
    }
    return res.status(200).json(resultsToReturn);
  } catch (error) {
    console.error("Error fetching search results:", error);
    res.status(500).json({ message: "Failed to fetch search results" });
  }
};

/**
 * Get recent searches
 */
const getRecentSearches = async (req, res) => {
  try {
    const subscriptionId = req.subscription?.id;

    // Get all keys from the request cache
    const requestKeys = requestCache.keys();

    // Filter requests that belong to the subscription
    const userSearches = [];

    requestKeys.forEach((key) => {
      const request = requestCache.get(key);
      if (request && request.subscriptionId === subscriptionId) {
        userSearches.push({
          searchId: key,
          keywords: request.keywords,
          timeframe: request.timeframe,
          status: request.status,
          resultCount: request.resultCount || 0,
          timestamp: request.timestamp,
          completedAt: request.completedAt,
        });
      }
    });

    // Sort by most recent
    userSearches.sort((a, b) => b.timestamp - a.timestamp);

    // Limit to 10 most recent searches
    const recentSearches = userSearches.slice(0, 10);

    res.json(recentSearches);
  } catch (error) {
    console.error("Error fetching recent searches:", error);
    res.status(500).json({ message: "Failed to fetch recent searches" });
  }
};

/**
 * Delete a search
 */
const deleteSearch = async (req, res) => {
  try {
    const { searchId } = req.params;
    const subscriptionId = req.subscription?.id;

    if (!searchId) {
      return res.status(400).json({ message: "Search ID is required" });
    }

    // Check if search exists in cache
    const request = requestCache.get(searchId);

    if (!request) {
      return res.status(404).json({ message: "Search not found" });
    }

    // Check if request belongs to subscription
    if (request.subscriptionId !== subscriptionId) {
      return res.status(403).json({ message: "Unauthorized access to search" });
    }

    // Delete from caches
    requestCache.del(searchId);
    searchCache.del(searchId);

    res.json({ message: "Search deleted successfully" });
  } catch (error) {
    console.error("Error deleting search:", error);
    res.status(500).json({ message: "Failed to delete search" });
  }
};

module.exports = {
  searchByKeywords,
  directSearch,
  getSearchResults,
  getSearchStatus,
  getRecentSearches,
  deleteSearch,
};
