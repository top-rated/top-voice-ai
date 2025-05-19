const { createApp, ref, reactive, onMounted, computed } = Vue;

// Get the API prefix from the server environment or use a default
const API_PREFIX = "/api/v1";
const ADMIN_API = `${API_PREFIX}/admin`;

const app = createApp({
  setup() {
    // Authentication state
    const adminEmail = ref(localStorage.getItem("adminEmail") || "");
    const token = ref(localStorage.getItem("adminToken") || "");
    const isAuthenticated = computed(() => !!token.value);
    const loginError = ref("");

    // Login form
    const loginForm = reactive({
      email: "",
      password: "",
    });

    // UI state
    const loading = ref(false);
    const activeTab = ref("analytics");
    const currentPage = ref(1);
    const hasMorePages = ref(false);
    const userSearch = ref("");

    // Modal state
    const showModal = ref(false);
    // Initialize modal visibility to false to prevent showing on page load
    const showAddSubscriptionModal = ref(false); // This must be false initially
    const modalType = ref("");
    const modalTitle = ref("");
    const selectedUser = ref({});
    const selectedSubscription = ref({});

    // New subscription form
    const newSubscription = reactive({
      email: "",
      type: "premium",
      source: "gumroad",
      gumroadSubscriptionId: "",
      stripeSubscriptionId: "",
      stripeCustomerId: "",
      notes: "",
    });

    // Data state
    const users = ref([]);
    const subscriptions = ref([]);
    const recentActivity = ref([]);

    // Statistics
    const stats = reactive({
      totalUsers: 0,
      activeSubscriptions: 0,
      freeUsers: 0,
      monthlyRevenue: 0,
      apiRequests24h: 0,
      newUsers7d: 0,
      conversionRate: 0,
    });

    // Top Voices stats
    const topVoicesStats = reactive({
      totalTopics: 0,
      totalAuthors: 0,
      totalPosts: 0,
      topicStats: [],
      lastUpdated: null,
    });

    // Auth check on mount
    onMounted(async () => {
      // Ensure modals are closed on page load
      showAddSubscriptionModal.value = false;
      showModal.value = false;

      // Ensure modal state is false on load
      showAddSubscriptionModal.value = false;

      // Check if token is expired and clear it if needed
      if (token.value) {
        try {
          // Make a test API call to check token validity
          await callApi(`${ADMIN_API}/stats`);
        } catch (err) {
          // If token is invalid, clear it and force re-login
          console.log("Token validation failed, clearing credentials");
          logout();
          loginError.value = "Your session has expired. Please login again.";
          return;
        }
      }

      if (isAuthenticated.value) {
        // Load initial data
        await Promise.all([
          fetchUsers(),
          fetchSubscriptions(),
          fetchStats(),
          fetchTopVoicesStats(),
        ]);
      }
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
      loading.value = true;

      try {
        const config = {
          method,
          headers: getHeaders(),
          ...(data && { data }),
        };

        const res = await axios(url, config);
        return res.data;
      } catch (err) {
        console.error("API Error:", err);

        // Check if unauthorized (token expired)
        if (err.response && err.response.status === 401) {
          logout();
          loginError.value = "Your session has expired. Please login again.";
        } else {
          throw err;
        }
      } finally {
        loading.value = false;
      }
    };

    // Authentication functions
    const login = async () => {
      if (!loginForm.email || !loginForm.password) {
        loginError.value = "Please enter both email and password";
        return;
      }

      loginError.value = "";
      loading.value = true;

      try {
        const response = await axios.post(`${ADMIN_API}/login`, {
          email: loginForm.email,
          password: loginForm.password,
        });

        if (response.data && response.data.token) {
          // Save token and user info
          token.value = response.data.token;
          adminEmail.value = response.data.user.email;

          localStorage.setItem("adminToken", response.data.token);
          localStorage.setItem("adminEmail", response.data.user.email);

          // Load initial data
          await Promise.all([
            fetchUsers(),
            fetchSubscriptions(),
            fetchStats(),
            fetchTopVoicesStats(),
          ]);

          // Clear form
          loginForm.email = "";
          loginForm.password = "";
        }
      } catch (err) {
        console.error("Login error:", err);
        loginError.value =
          err.response?.data?.message ||
          "Login failed. Please check your credentials.";
      } finally {
        loading.value = false;
      }
    };

    const logout = () => {
      // Clear authentication data
      token.value = "";
      adminEmail.value = "";
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminEmail");

      // Clear all loaded data
      users.value = [];
      subscriptions.value = [];
      recentActivity.value = [];
    };

    // Data fetching functions
    const fetchUsers = async () => {
      try {
        const data = await callApi(
          `${ADMIN_API}/users?page=${currentPage.value}&search=${userSearch.value}`
        );
        users.value = data.users;
        hasMorePages.value = data.hasMore;
      } catch (err) {
        // Error handled in callApi
      }
    };

    const fetchSubscriptions = async () => {
      try {
        console.log("Fetching subscriptions from API...");
        const data = await callApi(`${ADMIN_API}/subscriptions`);
        console.log("Subscriptions API response:", data);

        if (data && data.subscriptions) {
          subscriptions.value = data.subscriptions;

          // Log detailed subscription information
          console.log(`Total subscriptions: ${data.subscriptions.length}`);

          // Count by source
          const sourceCount = {};
          data.subscriptions.forEach((sub) => {
            const source = sub.source || "unknown";
            sourceCount[source] = (sourceCount[source] || 0) + 1;
          });
          console.log("Subscriptions by source:", sourceCount);

          // Log each subscription with key details
          console.log("Subscription details:");
          data.subscriptions.forEach((sub, index) => {
            console.log(
              `[${index + 1}] ID: ${sub.id}, Email: ${sub.email}, Source: ${
                sub.source || "unknown"
              }, Active: ${sub.active}, Type: ${sub.type}`
            );
          });
        } else {
          console.error("Invalid subscription data received:", data);
        }
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        // Error handled in callApi
      }
    };

    const fetchStats = async () => {
      try {
        const data = await callApi(`${ADMIN_API}/stats`);

        // Update stats
        stats.totalUsers = data.totalUsers;
        stats.activeSubscriptions = data.activeSubscriptions;
        stats.freeUsers = data.freeUsers;
        stats.monthlyRevenue = data.monthlyRevenue;
        stats.apiRequests24h = data.apiRequests24h;
        stats.newUsers7d = data.newUsers7d;
        stats.conversionRate = data.conversionRate;

        // Recent activity
        recentActivity.value = data.recentActivity || [];
      } catch (err) {
        // Error handled in callApi
      }
    };

    // Top Voices management functions
    const fetchTopVoicesStats = async () => {
      try {
        console.log("Fetching top voices stats...");
        const data = await callApi(`${ADMIN_API}/top-voices/stats`);
        console.log("Top voices stats response:", data);

        // Check if data is defined before updating stats
        if (data) {
          // Update top voices stats
          topVoicesStats.totalTopics = data.totalTopics || 0;
          topVoicesStats.totalAuthors = data.totalAuthors || 0;
          topVoicesStats.totalPosts = data.totalPosts || 0;
          topVoicesStats.topicStats = data.topicStats || [];
          topVoicesStats.lastUpdated =
            data.lastUpdated || new Date().toISOString();

          console.log("Updated topVoicesStats:", topVoicesStats);
        } else {
          console.error("No data received from top voices stats API");
          // Set default values if no data is received
          topVoicesStats.totalTopics = 0;
          topVoicesStats.totalAuthors = 0;
          topVoicesStats.totalPosts = 0;
          topVoicesStats.topicStats = [];
          topVoicesStats.lastUpdated = new Date().toISOString();
        }
      } catch (err) {
        console.error("Error fetching top voices stats:", err);
        // Set default values on error
        topVoicesStats.totalTopics = 0;
        topVoicesStats.totalAuthors = 0;
        topVoicesStats.totalPosts = 0;
        topVoicesStats.topicStats = [];
        topVoicesStats.lastUpdated = new Date().toISOString();
      }
    };

    const refreshTopVoicesData = async () => {
      try {
        // Call the refresh endpoint, which now returns detailed stats
        const data = await callApi(`${ADMIN_API}/top-voices/refresh`, "POST");

        // Update the stats with the response data
        if (data) {
          topVoicesStats.totalTopics = data.totalTopics || 0;
          topVoicesStats.totalAuthors = data.totalAuthors || 0;
          topVoicesStats.totalPosts = data.totalPosts || 0;
          topVoicesStats.topicStats = data.topicStats || [];
          topVoicesStats.lastUpdated = new Date().toISOString(); // Use current time as refresh time
          console.log("Updated topVoicesStats after refresh:", topVoicesStats);
          alert(
            `Top voices data refreshed successfully. Topics: ${
              data.totalTopics || 0
            }, Authors: ${data.totalAuthors || 0}, Posts: ${
              data.totalPosts || 0
            }`
          );
        } else {
          alert("Top voices data refreshed, but no stats returned.");
          // Optionally refetch stats separately if needed
          await fetchTopVoicesStats();
        }
      } catch (err) {
        console.error("Error refreshing top voices data:", err);
        alert(
          `Error refreshing top voices data: ${
            err.response?.data?.message || "Unknown error"
          }`
        );
        // Set default values on error
        topVoicesStats.totalTopics = 0;
        topVoicesStats.totalAuthors = 0;
        topVoicesStats.totalPosts = 0;
        topVoicesStats.topicStats = [];
        topVoicesStats.lastUpdated = new Date().toISOString();
      }
    };

    // User management functions
    const searchUsers = () => {
      currentPage.value = 1;
      fetchUsers();
    };

    const prevPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
        fetchUsers();
      }
    };

    const nextPage = () => {
      if (hasMorePages.value) {
        currentPage.value++;
        fetchUsers();
      }
    };

    const editUser = (user) => {
      selectedUser.value = { ...user };
      modalType.value = "editUser";
      modalTitle.value = "Edit User";
      showModal.value = true;
    };

    const viewUserDetails = (user) => {
      selectedUser.value = { ...user };
      modalType.value = "userDetails";
      modalTitle.value = "User Details";
      showModal.value = true;
    };

    const saveUserChanges = async () => {
      try {
        await callApi(
          `${ADMIN_API}/users/${selectedUser.value.email}`,
          "PUT",
          selectedUser.value
        );
        closeModal();
        fetchUsers();
      } catch (err) {
        // Error handled in callApi
      }
    };

    const activateUser = async (user) => {
      try {
        await callApi(`${ADMIN_API}/users/${user.email}/activate`, "POST");
        fetchUsers();
      } catch (err) {
        // Error handled in callApi
      }
    };

    const deactivateUser = async (user) => {
      try {
        await callApi(`${ADMIN_API}/users/${user.email}/deactivate`, "POST");
        fetchUsers();
      } catch (err) {
        // Error handled in callApi
      }
    };

    const deleteUser = async (user) => {
      if (
        confirm(
          `Are you sure you want to delete user ${user.email}? This action cannot be undone.`
        )
      ) {
        try {
          await callApi(`${ADMIN_API}/users/${user.email}`, "DELETE");
          alert("User deleted successfully");
          fetchUsers();
        } catch (err) {
          if (err.response && err.response.status === 404) {
            alert(
              `User ${user.email} not found. The user might have been already deleted.`
            );
            // Refresh the user list to remove any deleted users
            fetchUsers();
          } else {
            alert(
              `Error deleting user: ${
                err.response?.data?.message || "Unknown error"
              }`
            );
          }
        }
      }
    };

    // Subscription management functions
    const refreshSubscriptionData = async () => {
      console.log("Refreshing subscription data...");
      loading.value = true;
      try {
        await Promise.all([fetchSubscriptions(), fetchStats()]);
        // Show a small notification that data was refreshed
        const notification = document.createElement("div");
        notification.textContent = "Subscription data refreshed from Gumroad";
        notification.style.cssText =
          "position:fixed; bottom:20px; right:20px; background-color:#4CAF50; color:white; padding:10px 20px; border-radius:4px; z-index:9999; box-shadow:0 2px 10px rgba(0,0,0,0.2);";
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 3000);
      } catch (err) {
        console.error("Error refreshing subscription data:", err);
        alert("Error refreshing subscription data. Please try again.");
      } finally {
        loading.value = false;
      }
    };

    // Function to scan for missing subscriptions
    const scanForMissingSubscriptions = async () => {
      try {
        console.log("Scanning for missing subscriptions...");

        // Show loading message
        alert("Scanning for missing subscriptions... This may take a moment.");

        const response = await axios.post(
          `${ADMIN_API}/subscriptions/scan`,
          {},
          { headers: getHeaders() }
        );

        console.log("Scan results:", response.data);

        // Format the results for display
        const results = response.data;
        const sourceBreakdown = results.subscriptionsBySource || {};
        let sourceText = "";
        for (const source in sourceBreakdown) {
          sourceText += `\n- ${source}: ${sourceBreakdown[source]}`;
        }

        // Show success message with details
        alert(
          `Scan complete!\n\nRecovered: ${
            results.recovered || 0
          } subscriptions\nImported from Gumroad API: ${
            results.importedFromGumroad || 0
          }\nTotal Gumroad subscriptions: ${
            results.totalGumroad || 0
          }\nTotal subscriptions: ${
            results.totalSubscriptions || 0
          }\n\nSubscriptions by source:${sourceText}`
        );

        // Refresh data after scan
        await refreshSubscriptionData();
      } catch (err) {
        console.error("Error scanning for subscriptions:", err);

        // Show error message
        alert(
          `Error scanning for subscriptions: ${
            err.response?.data?.message || err.message
          }`
        );
      }
    };

    const viewSubscriptionDetails = (subscription) => {
      selectedSubscription.value = { ...subscription };
      modalType.value = "subscriptionDetails";
      modalTitle.value = "Subscription Details";
      showModal.value = true;
    };

    const activateSubscription = async (subscription) => {
      try {
        await callApi(
          `${ADMIN_API}/subscriptions/${subscription.id}/activate`,
          "POST"
        );
        fetchSubscriptions();
      } catch (err) {
        // Error handled in callApi
      }
    };

    const deactivateSubscription = async (subscription) => {
      try {
        await callApi(
          `${ADMIN_API}/subscriptions/${subscription.id}/deactivate`,
          "POST"
        );
        fetchSubscriptions();
      } catch (err) {
        // Error handled in callApi
      }
    };

    const addSubscription = async () => {
      try {
        if (!newSubscription.email) {
          alert("Email address is required");
          return;
        }

        let endpoint = `${ADMIN_API}/subscriptions/manual`;
        let payload = { ...newSubscription };

        if (newSubscription.source === "gumroad") {
          endpoint = `${ADMIN_API}/subscriptions/gumroad`;
        } else if (newSubscription.source === "stripe") {
          endpoint = `${ADMIN_API}/subscriptions/stripe`;

          // Validate Stripe subscription ID
          if (!newSubscription.stripeSubscriptionId) {
            alert("Stripe Subscription ID is required");
            return;
          }
        }

        const response = await callApi(endpoint, "POST", payload);

        // Check the response to determine what happened
        if (response && response.existingGumroadFound) {
          alert(
            `Existing Gumroad subscription found and linked for ${newSubscription.email}`
          );
        } else if (response && response.gumroadCreated) {
          alert(
            `New subscription successfully created in Gumroad for ${newSubscription.email}`
          );
        } else if (response && response.gumroadError) {
          alert(
            `Subscription added locally, but failed to create in Gumroad: ${response.gumroadError}`
          );
        } else if (response && response.stripeVerified) {
          alert(
            `Stripe subscription verified and linked for ${newSubscription.email}`
          );
        } else {
          alert(`Subscription added successfully for ${newSubscription.email}`);
        }

        // Close modal and reset form
        closeSubscriptionModal(); // Use Vue function to close modal
        // Resetting form is handled in closeSubscriptionModal
        // newSubscription.email = "";
        // newSubscription.notes = "";
        // All form reset is now handled by resetSubscriptionForm()

        // Refresh data
        await Promise.all([fetchSubscriptions(), fetchStats()]);
      } catch (err) {
        alert(
          `Error adding subscription: ${
            err.response?.data?.message || "Unknown error"
          }`
        );
      }
    };

    // Modal management
    const closeModal = () => {
      showModal.value = false;
      modalType.value = "";
      modalTitle.value = "";
      selectedUser.value = {};
      selectedSubscription.value = {};
    };

    // Close subscription modal and reset form
    const closeSubscriptionModal = () => {
      // Hide modal
      showAddSubscriptionModal.value = false;

      // Reset form after modal is hidden
      setTimeout(() => {
        resetSubscriptionForm();
      }, 100);
    };

    // Reset subscription form (called when opening modal)
    const resetSubscriptionForm = () => {
      newSubscription.email = "";
      newSubscription.notes = "";
      newSubscription.gumroadSubscriptionId = "";
      newSubscription.stripeSubscriptionId = "";
      newSubscription.stripeCustomerId = "";
      newSubscription.type = "premium";
      newSubscription.source = "gumroad";
    };

    // Utility functions
    const formatDate = (dateString) => {
      if (!dateString) return "N/A";

      const date = new Date(dateString);
      return date.toLocaleDateString();
    };

    const formatDateTime = (dateString) => {
      if (!dateString) return "N/A";

      const date = new Date(dateString);
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    };

    const formatLabel = (key) => {
      return key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .replace(/Id/g, "ID");
    };

    const formatValue = (value) => {
      if (value === null || value === undefined) return "N/A";
      if (typeof value === "boolean") return value ? "Yes" : "No";
      if (typeof value === "object") {
        if (value instanceof Date) return formatDateTime(value);
        return JSON.stringify(value);
      }
      // Format currency values (if they look like numbers with decimal places)
      if (
        typeof value === "number" ||
        (typeof value === "string" && !isNaN(parseFloat(value)))
      ) {
        const num = parseFloat(value);
        // If it's likely a currency value (has decimal places)
        if (num % 1 !== 0) {
          return num.toFixed(2);
        }
      }
      return value;
    };

    // Format currency specifically for display
    const formatCurrency = (value) => {
      if (value === null || value === undefined) return "$0.00";
      const num = parseFloat(value);
      return `$${num.toFixed(2)}`;
    };

    return {
      // Auth state
      isAuthenticated,
      adminEmail,
      loginForm,
      loginError,

      // UI state
      loading,
      activeTab,
      currentPage,
      hasMorePages,
      userSearch,
      showModal,
      showAddSubscriptionModal,
      modalType,
      modalTitle,
      selectedUser,
      selectedSubscription,
      newSubscription,
      users,
      subscriptions,
      recentActivity,
      stats,
      topVoicesStats,

      // Auth functions
      login,
      logout,

      // Data functions
      searchUsers,
      prevPage,
      nextPage,

      // User management
      editUser,
      viewUserDetails,
      saveUserChanges,
      activateUser,
      deactivateUser,
      deleteUser,

      // Subscription management
      refreshSubscriptionData,
      scanForMissingSubscriptions,
      viewSubscriptionDetails,
      activateSubscription,
      deactivateSubscription,
      addSubscription,

      // Top Voices management
      fetchTopVoicesStats,
      refreshTopVoicesData,

      // Modal management
      closeModal,
      closeSubscriptionModal,
      resetSubscriptionForm,

      // Utility functions
      formatDate,
      formatDateTime,
      formatLabel,
      formatValue,
      formatCurrency,
    };
  },
});

app.mount("#admin-app");
