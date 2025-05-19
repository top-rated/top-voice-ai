const { createApp, ref } = Vue;

// Get the API prefix from the server environment or use a default
const API_PREFIX = "/api/v1"; // Adjust this to match your server's API_V1_PREFIX

const app = createApp({
  setup() {
    // State for API responses
    const response = ref(null);
    const loading = ref(false);
    const error = ref(null);
    const token = ref(localStorage.getItem("token") || "");

    // Form data
    const auth = ref({
      email: "",
      password: "",
    });

    const gumroad = ref({
      webhookData:
        '{"product_id": "123", "email": "user@example.com", "event": "subscription_created", "purchase": {"email": "user@example.com", "product_id": "123", "subscription_id": "sub_123"}}',
    });

    const topVoices = ref({
      topicId: "",
      authorId: "",
    });

    const profiles = ref({
      id: "",
      requestId: "",
      urlsToAnalyze: "",
    });

    const search = ref({
      keywords: "",
      searchId: "",
      timeframe: "past-24h",
    });

    // Headers setup with authentication
    const getHeaders = () => {
      const headers = {
        "Content-Type": "application/json",
      };

      if (token.value) {
        headers["Authorization"] = `Bearer ${token.value}`;
      }

      return headers;
    };

    // Generic API call handler
    const callApi = async (url, method = "GET", data = null) => {
      // Set loading state
      loading.value = true;
      error.value = null;
      response.value = null;

      try {
        // Add artificial delay to show the spinner (remove in production)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const config = {
          method,
          headers: getHeaders(),
          ...(data && { data }),
        };

        const res = await axios(url, config);
        response.value = res.data;
        return res.data;
      } catch (err) {
        console.error("API Error:", err);
        error.value =
          err.response?.data?.message || err.message || "An error occurred";
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // Auth API calls
    const login = async () => {
      if (!auth.value.email || !auth.value.password) {
        error.value = "Please enter both email and password";
        return;
      }

      try {
        const data = await callApi(
          `${API_PREFIX}/auth/login`,
          "POST",
          auth.value
        );
        if (data.token) {
          token.value = data.token;
          localStorage.setItem("token", data.token);
        }
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const register = async () => {
      if (!auth.value.email || !auth.value.password) {
        error.value = "Please enter both email and password";
        return;
      }

      try {
        const data = await callApi(
          `${API_PREFIX}/auth/register`,
          "POST",
          auth.value
        );
        if (data.token) {
          token.value = data.token;
          localStorage.setItem("token", data.token);
        }
      } catch (err) {
        // Error already handled in callApi
      }
    };

    // Subscription & Gumroad Webhook API calls
    const getSubscriptionStatus = async () => {
      try {
        await callApi(`${API_PREFIX}/auth/subscription-status`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const verifySubscription = async () => {
      try {
        await callApi(`${API_PREFIX}/auth/verify-subscription`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const sendGumroadWebhook = async () => {
      try {
        // Parse the JSON string to an object
        let webhookData;
        try {
          webhookData = JSON.parse(gumroad.value.webhookData);
        } catch (e) {
          error.value = "Invalid JSON in webhook data";
          return;
        }

        await callApi(
          `${API_PREFIX}/auth/gumroad-webhook`,
          "POST",
          webhookData
        );
      } catch (err) {
        // Error already handled in callApi
      }
    };

    // Top Voices API calls
    const getAllTopVoices = async () => {
      try {
        await callApi(`${API_PREFIX}/top-voices`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getTopics = async () => {
      try {
        await callApi(`${API_PREFIX}/top-voices/topics`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getTopVoicesByTopic = async () => {
      if (!topVoices.value.topicId) {
        error.value = "Please enter a topic ID";
        return;
      }

      try {
        await callApi(
          `${API_PREFIX}/top-voices/topic/${topVoices.value.topicId}`
        );
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getTrendingPosts = async () => {
      try {
        await callApi(`${API_PREFIX}/top-voices/trending`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getAuthorPosts = async () => {
      if (!topVoices.value.authorId) {
        error.value = "Please enter an author ID";
        return;
      }

      try {
        await callApi(
          `${API_PREFIX}/top-voices/author/${topVoices.value.authorId}`
        );
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const refreshTopVoices = async () => {
      try {
        await callApi(`${API_PREFIX}/top-voices/refresh`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    // Profiles API calls
    const analyzeProfiles = async () => {
      if (!profiles.value.urlsToAnalyze) {
        error.value = "Please enter at least one profile URL";
        return;
      }

      const profileUrls = profiles.value.urlsToAnalyze
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url);

      if (profileUrls.length === 0) {
        error.value = "Please enter at least one valid profile URL";
        return;
      }

      try {
        await callApi(`${API_PREFIX}/profiles/analyze`, "POST", {
          profileUrls: profileUrls,
        });
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getProfilePosts = async () => {
      if (!profiles.value.id) {
        error.value = "Please enter a profile ID";
        return;
      }

      try {
        await callApi(`${API_PREFIX}/profiles/posts/${profiles.value.id}`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getAnalysisStatus = async () => {
      if (!profiles.value.requestId) {
        error.value = "Please enter a request ID";
        return;
      }

      try {
        await callApi(
          `${API_PREFIX}/profiles/status/${profiles.value.requestId}`
        );
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getRecentProfiles = async () => {
      try {
        await callApi(`${API_PREFIX}/profiles/recent`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const deleteProfile = async () => {
      if (!profiles.value.id) {
        error.value = "Please enter a profile ID";
        return;
      }

      try {
        await callApi(`${API_PREFIX}/profiles/${profiles.value.id}`, "DELETE");
      } catch (err) {
        // Error already handled in callApi
      }
    };

    // Search API calls
    const searchByKeywords = async () => {
      if (!search.value.keywords) {
        error.value = "Please enter search keywords";
        return;
      }

      try {
        await callApi(`${API_PREFIX}/search/keywords`, "POST", {
          keywords: search.value.keywords,
          timeframe: search.value.timeframe,
        });
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getSearchResults = async () => {
      if (!search.value.searchId) {
        error.value = "Please enter a search ID";
        return;
      }

      try {
        await callApi(`${API_PREFIX}/search/results/${search.value.searchId}`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const getRecentSearches = async () => {
      try {
        await callApi(`${API_PREFIX}/search/recent`);
      } catch (err) {
        // Error already handled in callApi
      }
    };

    const deleteSearch = async () => {
      if (!search.value.searchId) {
        error.value = "Please enter a search ID";
        return;
      }

      try {
        await callApi(
          `${API_PREFIX}/search/${search.value.searchId}`,
          "DELETE"
        );
      } catch (err) {
        // Error already handled in callApi
      }
    };

    return {
      // State
      response,
      loading,
      error,

      // Form data
      auth,
      gumroad,
      topVoices,
      profiles,
      search,

      // Methods - Auth
      login,
      register,
      getSubscriptionStatus,
      verifySubscription,
      sendGumroadWebhook,

      // Methods - Top Voices
      getAllTopVoices,
      getTopics,
      getTopVoicesByTopic,
      getTrendingPosts,
      getAuthorPosts,
      refreshTopVoices,

      // Methods - Profiles
      analyzeProfiles,
      getProfilePosts,
      getAnalysisStatus,
      getRecentProfiles,
      deleteProfile,

      // Methods - Search
      searchByKeywords,
      getSearchResults,
      getRecentSearches,
      deleteSearch,
    };
  },
}).mount("#app");
