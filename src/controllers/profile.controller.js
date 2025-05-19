const axios = require("axios");
const NodeCache = require("node-cache");
const { formatDateRelative } = require('../utils/dateFormatter');

// Cache for storing profile analysis results
// In production, consider using a database for persistence
const profileCache = new NodeCache({ stdTTL: 86400 * 7 }); // 7 day TTL

// Cache for storing analysis requests status
const requestCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

// Webhook URL for fetching profile data
const PROFILE_WEBHOOK =
  "https://n8n.top-rated.pro/webhook/c77decca-081e-4019-9797-f058d024e558";

/**
 * Analyze LinkedIn profiles
 * This is a paid feature that allows users to analyze custom LinkedIn profiles
 */
const analyzeProfiles = async (req, res) => {
  try {
    const { profileUrl } = req.body;
    const subscriptionId =
      req.subscription?.id ||
      req.body.subscriptionId ||
      req.query.subscriptionId;

    if (!profileUrl || typeof profileUrl !== "string") {
      return res
        .status(400)
        .json({ message: "Please provide a valid LinkedIn profile URL" });
    }

    // Validate URL
    let validUrl;
    try {
      const urlObj = new URL(profileUrl);
      validUrl = urlObj.hostname.includes("linkedin.com") ? profileUrl : null;
    } catch (e) {
      validUrl = null;
    }

    if (!validUrl) {
      return res
        .status(400)
        .json({ message: "Invalid LinkedIn profile URL provided" });
    }

    try {
      // Extract LinkedIn ID from URL
      const profileId = validUrl.split("/in/")[1]?.split("?")[0]?.split("/")[0];

      console.log("Processing profile:", {
        url: validUrl,
        profileId,
        timestamp: new Date().toISOString(),
      });

      if (!profileId) {
        return res.status(400).json({
          status: "failed",
          error: "Could not extract LinkedIn ID from URL",
        });
      }

      // Check if we already have cached results
      const cachedProfile = profileCache.get(profileId);
      if (cachedProfile) {
        console.log("Found cached profile:", {
          profileId,
          cachedAt: new Date(cachedProfile.analyzedAt).toISOString(),
        });
        return res.status(200).json({
          status: "success",
          data: {
            ...cachedProfile,
            analyzedAt: formatDateRelative(cachedProfile.analyzedAt),
          },
          fromCache: true,
        });
      }

      // Prepare webhook request data - simplified to match test_profile.js
      const body = {
        profile_url: validUrl,
      };

      console.log("Sending webhook request:", {
        webhook: PROFILE_WEBHOOK,
        data: body,
      });

      // Set up retry mechanism similar to test_profile.js
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 5000;
      let retries = 0;
      let profileData = null;

      while (retries < MAX_RETRIES) {
        try {
          // Fetch profile data from webhook with configuration matching test_profile.js
          const response = await axios({
            method: "post",
            url: PROFILE_WEBHOOK,
            data: body,
            timeout: 30000, // 30 second timeout
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });

          if (response.data && Object.keys(response.data).length > 0) {
            profileData = response.data;
            console.log("Profile data received:", {
              status: response.status,
              dataKeys: Object.keys(profileData),
              timestamp: new Date().toISOString(),
            });
            break;
          }

          console.log(
            `Attempt ${retries + 1}/${MAX_RETRIES}: Waiting for data...`
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          retries++;
        } catch (error) {
          console.error(`Error on attempt ${retries + 1}:`, error.message);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          retries++;
        }
      }

      if (!profileData) {
        console.error("No profile data received after retries:", {
          profileId,
          url: validUrl,
          retries,
          timestamp: new Date().toISOString(),
        });

        return res.status(400).json({
          status: "failed",
          error: "No profile data returned after multiple attempts",
          details: {
            message: "The webhook failed to return profile data",
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Add timestamp and source URL to the cached data
      const enhancedProfileData = {
        ...profileData,
        analyzedAt: Date.now(),
        sourceUrl: validUrl,
        profileId,
      };

      // Cache the profile data
      profileCache.set(profileId, enhancedProfileData);

      return res.status(200).json({
        status: "success",
        data: {
          ...enhancedProfileData,
          analyzedAt: formatDateRelative(enhancedProfileData.analyzedAt),
        },
        fromCache: false,
      });
    } catch (error) {
      console.error("Profile processing error:", {
        url: validUrl,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status,
        timestamp: new Date().toISOString(),
      });

      return res.status(500).json({
        status: "failed",
        error: "Profile analysis failed",
        details: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        },
      });
    }
  } catch (error) {
    console.error("Fatal error in profile analysis:", error);
    return res.status(500).json({
      message: "Failed to analyze profile",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get profile analysis status and results
 */
const getAnalysisStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const providedSubscriptionId =
      req.query.subscriptionId || req.body?.subscriptionId;

    if (!requestId) {
      return res.status(400).json({ message: "Request ID is required" });
    }

    const request = requestCache.get(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Check if subscription ID is provided and matches the request
    if (
      providedSubscriptionId &&
      request.subscriptionId !== providedSubscriptionId
    ) {
      return res
        .status(403)
        .json({ message: "Unauthorized access to request" });
    }

    res.json(request);
  } catch (error) {
    console.error("Error getting profile analysis status:", error);
    res.status(500).json({ message: "Failed to get analysis status" });
  }
};

/**
 * Get posts from a specific LinkedIn profile
 */
const getProfilePosts = async (req, res) => {
  try {
    const { profileId } = req.params;
    const subscriptionId = req.subscription?.id;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    // Check if profile exists in cache
    const cachedProfile = profileCache.get(profileId);

    if (!cachedProfile) {
      return res
        .status(404)
        .json({ message: "Profile not found or analysis expired" });
    }

    // Return profile posts
    res.json({
      profileId,
      posts: cachedProfile.posts || [],
    });
  } catch (error) {
    console.error("Error fetching profile posts:", error);
    res.status(500).json({ message: "Failed to fetch profile posts" });
  }
};

/**
 * Get recently analyzed profiles
 */
const getRecentProfiles = async (req, res) => {
  try {
    const subscriptionId = req.subscription?.id;

    // Get all keys from profile cache
    const profileKeys = profileCache.keys();

    // Get profiles associated with the subscription
    const userRequests = [];
    requestCache.keys().forEach((key) => {
      const request = requestCache.get(key);
      if (
        request &&
        request.subscriptionId === subscriptionId &&
        request.status === "completed"
      ) {
        userRequests.push(request);
      }
    });

    // Get unique profile IDs from user requests
    const userProfileIds = new Set();
    userRequests.forEach((request) => {
      if (request.results) {
        request.results.forEach((result) => {
          if (result.status === "success" && result.data) {
            const profileId = result.url
              .split("/in/")[1]
              ?.split("?")[0]
              ?.split("/")[0];
            if (profileId) {
              userProfileIds.add(profileId);
            }
          }
        });
      }
    });

    // Filter profiles that belong to the subscription
    const userProfiles = profileKeys
      .filter((key) => userProfileIds.has(key))
      .map((key) => {
        const profile = profileCache.get(key);
        return {
          profileId: key,
          name: profile.name || "Unknown",
          headline: profile.headline || "",
          pictureUrl: profile.pictureUrl || "",
          postCount: (profile.posts || []).length,
          analyzedAt: formatDateRelative(profile.analyzedAt),
        };
      });

    // Sort by most recently analyzed
    userProfiles.sort((a, b) => b.analyzedAt - a.analyzedAt);

    res.json(userProfiles);
  } catch (error) {
    console.error("Error fetching recent profiles:", error);
    res.status(500).json({ message: "Failed to fetch recent profiles" });
  }
};

/**
 * Delete a profile analysis
 */
const deleteProfileAnalysis = async (req, res) => {
  try {
    const { profileId } = req.params;
    const subscriptionId = req.subscription?.id;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    // Check if profile exists in cache
    const exists = profileCache.has(profileId);

    if (!exists) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Verify that the profile belongs to this subscription
    const belongsToSubscription = false; // You would need to implement this check

    if (!belongsToSubscription) {
      return res
        .status(403)
        .json({ message: "Unauthorized access to profile analysis" });
    }

    // Delete from cache
    profileCache.del(profileId);

    res.json({ message: "Profile analysis deleted successfully" });
  } catch (error) {
    console.error("Error deleting profile analysis:", error);
    res.status(500).json({ message: "Failed to delete profile analysis" });
  }
};

module.exports = {
  analyzeProfiles,
  getProfilePosts,
  getAnalysisStatus,
  getRecentProfiles,
  deleteProfileAnalysis,
};
