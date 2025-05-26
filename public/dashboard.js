document.addEventListener('DOMContentLoaded', () => {
  const adminUser = JSON.parse(localStorage.getItem('adminUser'));
  const adminToken = localStorage.getItem('adminToken');

  if (!adminToken || !adminUser) {
    // If no token or user info, redirect to login
    window.location.href = '/admin_login.html';
    return;
  }

  // Personalize welcome message (optional)
  const welcomeMessage = document.querySelector('p.welcome-message'); // Updated selector
  if (welcomeMessage && adminUser.name) {
    welcomeMessage.textContent = `Welcome, ${adminUser.name}!`;
  } else if (welcomeMessage) {
    welcomeMessage.textContent = `Welcome, Admin!`;
  }

  // Logout functionality
  const logoutButton = document.getElementById('admin-logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/admin_login.html';
    });
  }

  console.log('Admin dashboard loaded. User:', adminUser);

  const api = {
    async request(method, url, data = null) {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken && window.location.pathname !== '/admin_login.html') {
        window.location.href = '/admin_login.html';
        throw new Error('Admin token not found. Redirecting to login.');
      }

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };
      if (adminToken) {
        options.headers['Authorization'] = `Bearer ${adminToken}`;
      }

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (response.status === 401 || response.status === 403) {
        if (window.location.pathname !== '/admin_login.html') {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            window.location.href = '/admin_login.html';
        }
        throw new Error(response.status === 401 ? 'Unauthorized' : 'Forbidden');
      }
      
      if (response.status === 204) { // No Content
          return { success: true, data: null, message: 'Operation successful.' };
      }

      const responseData = await response.json();

      if (!response.ok) {
        const message = responseData.message || `API Error: ${response.status} ${response.statusText}`;
        return { success: false, message, status: response.status, error: responseData.error || message, data: responseData.data || null };
      }
      
      // Handle successful responses consistently
      // Assumes successful backend responses might be { success: true, data: {...} } or just { field1: ..., field2: ... }
      // We want to return { success: true, data: { actual_payload_if_any } }
      if (responseData.success !== undefined) {
        return responseData; // Backend already provided a success flag
      } else {
        // If no 'success' flag, but response.ok is true, wrap the data
        return { success: true, data: responseData.data !== undefined ? responseData.data : responseData };
      }
    },

    get(url) { return this.request('GET', url); },
    post(url, data) { return this.request('POST', url, data); },
    put(url, data) { return this.request('PUT', url, data); },
    delete(url) { return this.request('DELETE', url); }
  };


  async function fetchDashboardData() {
    const totalUsersStatElement = document.getElementById('total-users-stat');
    const activeSubscriptionsStatElement = document.getElementById('active-subscriptions-stat');
    const apiCallsStatElement = document.getElementById('api-calls-stat');
    const recentActivityLogElement = document.getElementById('recent-activity-log');

    console.log('Fetching dashboard data from /api/v1/admin/stats');
    console.log('Admin token exists:', !!adminToken);

    try {
      const response = await fetch('/api/v1/admin/stats', {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthorized or forbidden, clear session and redirect to login
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          window.location.href = '/admin_login.html';
          return; // Stop further execution
        }
        // For other errors, try to parse the message or use a default
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch (e) { /* Ignore parsing error, use default */ }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Populate dashboard elements with real data
      if (totalUsersStatElement) totalUsersStatElement.textContent = data.stats?.totalUsers ?? '--';
      if (activeSubscriptionsStatElement) activeSubscriptionsStatElement.textContent = data.stats?.activeSubscriptions ?? '--';
      if (apiCallsStatElement) apiCallsStatElement.textContent = data.stats?.apiCallsToday ?? '--'; // Assuming 'apiCallsToday' from your controller
      
      if (recentActivityLogElement && data.activity && data.activity.length > 0) {
        let activityHTML = '<ul class="space-y-2 text-sm">';
        data.activity.slice(0, 5).forEach(act => { // Display latest 5 activities
          activityHTML += `<li class="p-2 bg-dark-700 rounded-md shadow">${new Date(act.timestamp).toLocaleString()}: ${act.message}</li>`;
        });
        activityHTML += '</ul>';
        recentActivityLogElement.innerHTML = activityHTML;
      } else if (recentActivityLogElement) {
        recentActivityLogElement.textContent = 'No recent activity.';
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      
      // Log detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error status:', error.response.status);
        console.error('Error headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      
      if (recentActivityLogElement) {
        recentActivityLogElement.textContent = 'Failed to load dashboard data. Check console for details.';
      }
      
      // Update stat elements to show an error state with more info
      const errorMessage = error.message || 'Error';
      if (totalUsersStatElement) totalUsersStatElement.textContent = 'Error';
      if (activeSubscriptionsStatElement) activeSubscriptionsStatElement.textContent = 'Error';
      if (apiCallsStatElement) apiCallsStatElement.textContent = 'Error';
    }
  }

  // User Management Globals
  let currentUserPage = 1;
  let currentUserSearchTerm = '';
  let userSearchTimeout = null;

  // --- Stripe Dashboard Data Functions ---
  async function fetchStripeDashboardData() {
    const stripeRevenueStatElement = document.getElementById('stripe-total-revenue-stat');
    const stripeRevenueStatusElement = document.getElementById('stripe-revenue-status');
    const stripeSubscriptionsTableBody = document.getElementById('stripe-subscriptions-table-body');

    try {
      const result = await api.get('/api/v1/admin/stripe-dashboard');
      console.log('Stripe Dashboard Data Result:', result);

      if (result.success) {
        const { balance, subscriptions } = result;

        // Update Stripe Total Revenue
        if (stripeRevenueStatElement) {
          if (balance.success && balance.data && balance.data.available) {
            // Assuming balance.data.available is an array of balances, sum them up or take the primary currency
            // This needs adjustment based on the actual structure of mcp2_retrieve_balance output if it ever works
            const totalRevenue = balance.data.available.reduce((acc, bal) => acc + bal.amount, 0);
            stripeRevenueStatElement.textContent = `${(totalRevenue / 100).toFixed(2)} ${balance.data.available[0]?.currency.toUpperCase() || ''}`;
            if (stripeRevenueStatusElement) stripeRevenueStatusElement.textContent = 'Last updated: Now';
          } else {
            stripeRevenueStatElement.textContent = 'N/A';
            if (stripeRevenueStatusElement) stripeRevenueStatusElement.textContent = balance.message || 'Could not retrieve revenue.';
          }
        }

        // Update Stripe Subscriptions Table
        if (stripeSubscriptionsTableBody) {
          if (Array.isArray(subscriptions) && subscriptions.length > 0) {
            stripeSubscriptionsTableBody.innerHTML = subscriptions.map(renderStripeSubscriptionRow).join('');
          } else {
            stripeSubscriptionsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">No Stripe subscriptions found or data is unavailable.</td></tr>';
          }
        }
      } else {
        if (stripeRevenueStatElement) stripeRevenueStatElement.textContent = 'Error';
        if (stripeRevenueStatusElement) stripeRevenueStatusElement.textContent = result.message || 'Failed to load Stripe revenue.';
        if (stripeSubscriptionsTableBody) stripeSubscriptionsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Failed to load Stripe subscriptions.</td></tr>';
        console.error('Failed to fetch Stripe dashboard data:', result.message);
      }
    } catch (error) {
      console.error('Error in fetchStripeDashboardData:', error);
      if (stripeRevenueStatElement) stripeRevenueStatElement.textContent = 'Error';
      if (stripeRevenueStatusElement) stripeRevenueStatusElement.textContent = 'Server error while fetching revenue.';
      if (stripeSubscriptionsTableBody) stripeSubscriptionsTableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-gray-400">Server error loading subscriptions.</td></tr>';
    }
  }

  function renderStripeSubscriptionRow(sub) {
    // Extract customer information - using the subscription object's direct properties
    const customerId = sub.customer_id || sub.customer || 'N/A';
    const customerName = sub.customer_name || 'N/A';
    const customerEmail = sub.customer_email || 'N/A';
    
    // Extract plan information - using the subscription object's direct properties
    const planName = sub.plan_name || sub.plan?.id || 'N/A';
    const planAmount = sub.plan_amount || sub.plan?.amount || 0;
    const planCurrency = sub.plan_currency || sub.plan?.currency || '';
    const amount = planAmount ? `${(planAmount / 100).toFixed(2)} ${planCurrency.toUpperCase()}` : 'N/A';
    
    // Format status
    const status = sub.status ? 
      sub.status.charAt(0).toUpperCase() + sub.status.slice(1).toLowerCase() : 
      'N/A';
    
    // Format dates - handle both string and timestamp formats
    const formatDate = (dateValue) => {
      if (!dateValue) return 'N/A';
      try {
        // Handle both string dates and timestamps
        const date = typeof dateValue === 'string' ? new Date(dateValue) : new Date(dateValue * 1000);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      } catch (e) {
        console.error('Error formatting date:', e, 'Value:', dateValue);
        return 'Invalid Date';
      }
    };
    
    // Handle different date formats in the subscription object
    const periodStart = formatDate(sub.current_period_start || sub.current_period_start_date);
    const periodEnd = formatDate(sub.current_period_end || sub.current_period_end_date);
    const createdDate = formatDate(sub.created || sub.created_date);

    // Get plan interval information
    const planInterval = sub.plan_interval || sub.plan?.interval || '';
    const planIntervalCount = sub.plan_interval_count || sub.plan?.interval_count || 1;
    
    return `
      <tr class="bg-dark-800 border-b border-dark-700 hover:bg-dark-700">
        <td class="px-6 py-4">
          <div class="font-medium text-white">${customerName}</div>
          <div class="text-sm text-gray-400">${customerEmail || customerId}</div>
        </td>
        <td class="px-6 py-4">
          <div class="font-medium text-white">${planName}</div>
          <div class="text-sm text-gray-400">${sub.plan_id || 'N/A'}</div>
        </td>
        <td class="px-6 py-4">
          <div class="font-medium text-white">${amount}</div>
          <div class="text-sm text-gray-400">
            ${planInterval ? `${planInterval}${planIntervalCount > 1 ? ` (Every ${planIntervalCount} ${planInterval}s)` : ''}` : ''}
          </div>
        </td>
        <td class="px-6 py-4">
          <span class="px-2 py-1 text-xs font-medium rounded-full ${status.toLowerCase() === 'active' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}">
            ${status}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-white">${periodStart} - ${periodEnd}</div>
          <div class="text-xs text-gray-400">
            ${sub.current_period_end ? `Renews on ${formatDate(sub.current_period_end)}` : ''}
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-gray-300">${createdDate}</td>
      </tr>
    `;
  }

  // --- User Management Functions ---
  function renderUserRow(user) {
    const joinedDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
    const statusClass = user.active ? 'bg-green-500 text-green-100' : 'bg-red-500 text-red-100';
    const statusText = user.active ? 'Active' : 'Inactive';
    // Determine subscription display
    let subscriptionDisplay = 'N/A';
    if (user.subscriptionSource === 'stripe' && user.stripePlan) {
        subscriptionDisplay = `Stripe: ${user.stripePlan} (${user.stripeSubscriptionStatus || 'unknown'})`;
    } else if (user.subscriptionType && user.subscriptionType !== 'none') {
        subscriptionDisplay = `Manual: ${user.subscriptionType}`;
    } else if (user.isStripeCustomer) {
        subscriptionDisplay = `Stripe Customer (Status: ${user.stripeSubscriptionStatus || 'unknown'})`;
    }

    return `
      <tr data-userid="${user.id || user.email}">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-100">${user.name || 'N/A'}</div>
          <div class="text-xs text-gray-400">${user.email}</div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
            ${statusText}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
          ${subscriptionDisplay}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${joinedDate}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button class="text-brand-blue hover:text-brand-blue-light mr-2 edit-user-btn" data-userid="${user.id || user.email}" title="Edit User"><i class="fas fa-edit"></i></button>
          <button class="text-red-500 hover:text-red-400 delete-user-btn" data-userid="${user.id || user.email}" title="Delete User"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
  }

  function renderUsersPagination(totalPages, currentPage) {
    const paginationControls = document.getElementById('users-pagination-controls');
    if (!paginationControls) return;
    paginationControls.innerHTML = ''; // Clear existing buttons

    if (totalPages <= 1) return;

    let paginationHTML = '';

    // Previous Button
    paginationHTML += `
      <button 
        class="px-3 py-1 rounded-md text-sm font-medium ${currentPage === 1 ? 'bg-dark-700 text-gray-500 cursor-not-allowed' : 'bg-brand-blue hover:bg-brand-blue-dark text-white'}"
        data-page="${currentPage - 1}" 
        ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left mr-1"></i> Prev
      </button>
    `;

    // Page Number Buttons (simplified for brevity, can be expanded)
    for (let i = 1; i <= totalPages; i++) {
        // Show first page, last page, current page, and pages around current page
        const showPage = (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1));
        const isEllipsis = (i === currentPage - 2 && currentPage > 3) || (i === currentPage + 2 && currentPage < totalPages - 2);

        if (isEllipsis) {
            paginationHTML += `<span class="px-3 py-1 text-gray-400">...</span>`;
        } else if (showPage) {
            paginationHTML += `
            <button 
                class="px-3 py-1 rounded-md text-sm font-medium ${i === currentPage ? 'bg-brand-blue-dark text-white ring-2 ring-brand-blue' : 'bg-dark-700 hover:bg-dark-600 text-gray-300'}"
                data-page="${i}">
                ${i}
            </button>
            `;
        }
    }

    // Next Button
    paginationHTML += `
      <button 
        class="px-3 py-1 rounded-md text-sm font-medium ${currentPage === totalPages ? 'bg-dark-700 text-gray-500 cursor-not-allowed' : 'bg-brand-blue hover:bg-brand-blue-dark text-white'}"
        data-page="${currentPage + 1}" 
        ${currentPage === totalPages ? 'disabled' : ''}>
        Next <i class="fas fa-chevron-right ml-1"></i>
      </button>
    `;

    paginationControls.innerHTML = paginationHTML;

    // Add event listeners to new pagination buttons
    paginationControls.querySelectorAll('button[data-page]').forEach(button => {
      button.addEventListener('click', (e) => {
        const page = parseInt(e.currentTarget.dataset.page);
        if (!isNaN(page)) {
          fetchAndDisplayUsers(page, currentUserSearchTerm);
        }
      });
    });
  }

  async function fetchAndDisplayUsers(page = 1, search = '') {
    console.log('fetchAndDisplayUsers called with page:', page, 'search:', search); // Debug: Check if function is called
    currentUserPage = page;
    currentUserSearchTerm = search;
    const usersTableBody = document.getElementById('users-table-body');
    const paginationControls = document.getElementById('users-pagination-controls'); // Re-select for safety

    if (!usersTableBody) return;

    usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-400">Loading users...</td></tr>';
    if (paginationControls) paginationControls.innerHTML = ''; // Clear pagination while loading

    try {
      const response = await api.get(`/api/v1/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
      console.log('API Response for /api/v1/admin/users:', response); // Added for debugging
      if (response.success && response.data) {
        const { users, totalPages, currentPage } = response.data;
        usersTableBody.innerHTML = ''; // Clear loading message

        if (Array.isArray(users) && users.length > 0) {
          users.forEach(user => {
            usersTableBody.innerHTML += renderUserRow(user);
          });
          // Event listeners for edit/delete are handled by delegation on usersTableBody
        } else {
          usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-400">No users found or user data is unavailable.</td></tr>';
        }
        renderUsersPagination(totalPages, currentPage);
      } else {
        usersTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-400">Error loading users: ${response.message || 'Unknown error'}</td></tr>`;
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      usersTableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-red-400">Failed to fetch users: ${error.message}</td></tr>`;
    }
  }

  // --- Top Voice Data Functions ---
  async function fetchTopVoiceData() {
    const totalAuthorsStat = document.getElementById('total-authors-stat');
    const totalPostsStat = document.getElementById('total-posts-stat');
    const totalCategoriesStat = document.getElementById('total-categories-stat');
    const authorsTableBody = document.getElementById('top-voice-authors-table-body');

    if (!totalAuthorsStat || !totalPostsStat || !totalCategoriesStat || !authorsTableBody) {
      console.error('One or more Top Voice Data DOM elements are missing.');
      return;
    }

    authorsTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-400">Loading Top Voice data...</td></tr>';

    try {
      const result = await api.get('/api/v1/admin/top-voices/stats');
      console.log('Top Voice Stats Result:', result);

      if (result.success && result.data) {
        const stats = result.data;
        totalAuthorsStat.textContent = stats.totalAuthors ?? '--';
        totalPostsStat.textContent = stats.totalPosts ?? '--';
        totalCategoriesStat.textContent = stats.totalTopics ?? '--';
        
        // Check for topicStats array (as per the console output)
        if (stats.topicStats && stats.topicStats.length > 0) {
          authorsTableBody.innerHTML = ''; // Clear loading message
          
          // Process all topics and their authors
          stats.topicStats.forEach(topic => {
            // For each topic, create a row for each sample author (if available)
            if (topic.sampleAuthors && topic.sampleAuthors.length > 0) {
              // Create rows for sample authors
              topic.sampleAuthors.forEach(author => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">${author.name}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${topic.topic || 'N/A'}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${author.postCount}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-indigo-400 hover:text-indigo-300 view-author-posts-button" data-author-id="${author.name}">View Posts</button>
                  </td>
                `;
                authorsTableBody.appendChild(row);
              });
            } else {
              // If no sample authors, create a summary row for the topic
              const row = document.createElement('tr');
              row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-200">Multiple Authors</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${topic.topic || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${topic.postCount} (${topic.authorCount} authors)</td>
              `;
              authorsTableBody.appendChild(row);
            }
          });
        } else {
          authorsTableBody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-400">No topic data available.</td></tr>';
        }
      } else {
        throw new Error(result.message || 'Failed to fetch Top Voice data');
      }
    } catch (error) {
      console.error('Error fetching Top Voice data:', error);
      totalAuthorsStat.textContent = 'Error';
      totalPostsStat.textContent = 'Error';
      totalCategoriesStat.textContent = 'Error';
      authorsTableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-red-400">Error loading data: ${error.message}</td></tr>`;
    }
  }

  async function refreshTopVoiceData() {
    const refreshButton = document.getElementById('refresh-top-voice-data-button');
    if(refreshButton) {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
    }
    
    try {
      const result = await api.post('/api/v1/admin/top-voices/refresh');
      if (result.success) {
        showToast('Top Voice data refresh initiated. It may take a few moments for new data to appear.', 'success');
        await fetchTopVoiceData(); // Re-fetch data after refresh
      } else {
        throw new Error(result.message || 'Failed to refresh Top Voice data');
      }
    } catch (error) {
      console.error('Error refreshing Top Voice data:', error);
      showToast(`Error refreshing data: ${error.message}`, 'error');
    }
    if(refreshButton) {
        refreshButton.disabled = false;
        refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Data';
    }
  }

  // Event listener for the refresh button
  const refreshTopVoiceDataButton = document.getElementById('refresh-top-voice-data-button');
  if (refreshTopVoiceDataButton) {
    refreshTopVoiceDataButton.addEventListener('click', refreshTopVoiceData);
  }

  // TODO: Add event listener for 'View Posts' buttons (requires modal or new view)
  // document.getElementById('top-voice-authors-table-body').addEventListener('click', (event) => {
  //   if (event.target.classList.contains('view-author-posts-button')) {
  //     const authorId = event.target.dataset.authorId;
  //     console.log('View posts for author:', authorId);
  //     // Implement logic to show posts for this author
  //   }
  // });

  // --- End Top Voice Data Functions ---

  // Event Listener for User Search
  const userSearchInput = document.getElementById('user-search-input');
  if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
      clearTimeout(userSearchTimeout);
      const searchTerm = e.target.value;
      userSearchTimeout = setTimeout(() => {
        fetchAndDisplayUsers(1, searchTerm);
      }, 500); // Debounce search by 500ms
    });
  }

  // --- End User Management Functions ---

  async function handleDeleteUserClick(userEmail) {
    if (!userEmail) {
      alert('User email is missing. Cannot delete.');
      return;
    }

    if (confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      try {
        const response = await api.delete(`/api/v1/admin/users/${encodeURIComponent(userEmail)}`);
        if (response.success) {
          alert(response.message || 'User deleted successfully.');
          fetchAndDisplayUsers(currentUserPage, currentUserSearchTerm); // Refresh the list
        } else {
          alert(`Error deleting user: ${response.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to delete user:', error);
        alert(`Failed to delete user: ${error.message}`);
      }
    }
  }

  // --- Toast Notification Function ---
  function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `fixed top-5 right-5 p-4 rounded-md shadow-lg text-white text-sm z-50 ${type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-5 right-5 z-50 space-y-2';
    document.body.appendChild(container);
    return container;
  }
  // --- End Toast Notification Function ---

  // Initialize the dashboard view and fetch data
  async function initializeDashboard() {
    console.log('Initializing dashboard...');
    await handleNavigation();
    
    // Fetch dashboard data after navigation is handled
    console.log('Fetching dashboard data...');
    try {
      await fetchDashboardData();
      console.log('Dashboard data fetched successfully');
    } catch (error) {
      console.error('Error initializing dashboard:', error);
    }
  }

  // Set up event listeners
  window.addEventListener('load', initializeDashboard);
  window.addEventListener('hashchange', handleNavigation);

  // Event Delegation for User Table Actions (Edit/Delete)
  const usersTableBody = document.getElementById('users-table-body');
  if (usersTableBody) {
    usersTableBody.addEventListener('click', function(event) {
      const target = event.target.closest('button'); // Get the button element
      if (!target) return; // Click was not on a button or its icon

      const userId = target.dataset.userid; // This should be the user's email or unique ID

      if (target.classList.contains('delete-user-btn')) {
        handleDeleteUserClick(userId);
      } else if (target.classList.contains('edit-user-btn')) {
        openEditUserModal(userId); // This function will be defined below
      }
    });
  }


  // --- Edit User Modal Logic ---
  const editUserModal = document.getElementById('edit-user-modal');
  const editUserForm = document.getElementById('edit-user-form');
  const closeEditUserModalBtn = document.getElementById('close-edit-user-modal-btn');
  const cancelEditUserBtn = document.getElementById('cancel-edit-user-btn');
  const editUserOriginalEmailField = document.getElementById('edit-user-original-email');
  const editUserEmailField = document.getElementById('edit-user-email');
  const editUserNameField = document.getElementById('edit-user-name');
  const editUserActiveField = document.getElementById('edit-user-active');
  const editUserSubscriptionTypeField = document.getElementById('edit-user-subscriptionType');
  const editUserNotesField = document.getElementById('edit-user-notes');

  async function openEditUserModal(userEmail) {
    console.log('Attempting to open edit modal for userEmail:', userEmail); // Debug log
    if (!editUserModal || !editUserForm) return;
    if (!userEmail) {
      alert('User identifier (email) is missing. Cannot fetch details.');
      return;
    }
    editUserForm.reset();

    try {
      const response = await api.get(`/api/v1/admin/users/${encodeURIComponent(userEmail)}`);
      // The user object is directly in response.data due to the api wrapper
      if (response.success && response.data) { 
        const user = response.data;
        editUserOriginalEmailField.value = user.email;
        editUserEmailField.value = user.email;
        editUserNameField.value = user.name || '';
        editUserActiveField.value = user.active ? 'true' : 'false';
        // Populate subscriptionType. Consider your data model: user.subscriptionType, user.stripePlan etc.
        let subTypeToDisplay = user.subscriptionType || '';
        if (!subTypeToDisplay && user.stripePlan) { // Example: fallback to stripePlan if direct type is missing
            subTypeToDisplay = user.stripePlan; 
        }
        editUserSubscriptionTypeField.value = subTypeToDisplay;
        editUserNotesField.value = user.adminNotes || user.notes || ''; // Prefer adminNotes if available
        
        editUserModal.classList.remove('hidden');
        editUserModal.classList.add('flex');
      } else {
        alert(`Error fetching user data: ${response.message || 'User not found.'}`);
      }
    } catch (error) {
      console.error('Failed to fetch user details for editing:', error);
      alert(`Failed to fetch user details: ${error.message}`);
    }
  }

  function closeEditUserModal() {
    if (!editUserModal) return;
    editUserModal.classList.add('hidden');
    editUserModal.classList.remove('flex');
    if (editUserForm) editUserForm.reset();
  }

  if (closeEditUserModalBtn) closeEditUserModalBtn.addEventListener('click', closeEditUserModal);
  if (cancelEditUserBtn) cancelEditUserBtn.addEventListener('click', closeEditUserModal);
  if (editUserModal) {
    editUserModal.addEventListener('click', (event) => {
      if (event.target === editUserModal) closeEditUserModal();
    });
  }

  if (editUserForm) {
    editUserForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const originalEmail = editUserOriginalEmailField.value;
      if (!originalEmail) {
        alert('Original user email not found. Cannot update.');
        return;
      }

      const updatedUserData = {
        name: editUserNameField.value.trim(),
        active: editUserActiveField.value === 'true',
        subscriptionType: editUserSubscriptionTypeField.value.trim(),
        // Ensure 'adminNotes' or 'notes' matches your backend updateUser expectation
        adminNotes: editUserNotesField.value.trim() 
      };

      try {
        const response = await api.put(`/api/v1/admin/users/${encodeURIComponent(originalEmail)}`, updatedUserData);
        if (response.success) {
          alert(response.message || 'User updated successfully!');
          closeEditUserModal();
          fetchAndDisplayUsers(currentUserPage, currentUserSearchTerm);
        } else {
          alert(`Error updating user: ${response.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to update user:', error);
        alert(`Failed to update user: ${error.message}`);
      }
    });
  }
  // --- End Edit User Modal Logic ---

  fetchDashboardData(); // Call the function to load data

  // Tabbed Navigation Logic
  const navLinks = document.querySelectorAll('aside .nav-link');
  const contentSections = document.querySelectorAll('main .content-section');

  function updateView(targetId) {
    console.log('Updating view to:', targetId);
    
    // Hide all content sections
    contentSections.forEach(section => {
      section.classList.add('hidden');
    });

    // Show the target section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      
      // Load section-specific data
      if (targetId === 'users-section') {
        console.log('Loading users data...');
        fetchAndDisplayUsers();
      } else if (targetId === 'top-voice-data-section') {
        fetchTopVoiceData();
      } else if (targetId === 'subscriptions-section') {
        console.log('Loading subscriptions data...');
        fetchStripeDashboardData();
      } else if (targetId === 'dashboard-section') {
        console.log('Refreshing dashboard data...');
        fetchDashboardData();
      }
    } else {
      console.error('Target section not found:', targetId);
    }

    // Update active states for navigation links
    navLinks.forEach(link => {
      const isActive = link.getAttribute('data-target') === targetId;
      link.classList.toggle('bg-brand-blue', isActive);
      link.classList.toggle('text-white', isActive);
      link.classList.toggle('hover:bg-dark-700', !isActive);
      link.classList.toggle('text-gray-200', !isActive);
    });
  }

  function handleNavigation() {
    let targetId = window.location.hash.substring(1); // Get 'users' from '#users'
    console.log('Handling navigation for hash:', targetId);
    
    if (!targetId || targetId === 'dashboard') {
      // Default to dashboard if no hash or hash is just #dashboard
      updateView('dashboard-section');
      if (!window.location.hash) {
        window.history.replaceState(null, null, '#dashboard');
      }
      return;
    }
    
    // For other hashes, ensure the targetId for the section includes '-section'
    const sectionId = targetId.endsWith('-section') ? targetId : targetId + '-section';
    
    const availableSections = Array.from(contentSections).map(s => s.id);
    if (availableSections.includes(sectionId)) {
      updateView(sectionId);
    } else {
      // Fallback to dashboard if the hash is invalid or section doesn't exist
      console.warn('Invalid section ID, falling back to dashboard:', sectionId);
      updateView('dashboard-section');
      window.history.replaceState(null, null, '#dashboard');
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const newHash = link.getAttribute('href'); // e.g., "#dashboard"
      if (window.location.hash !== newHash) {
        window.location.hash = newHash; // Triggers hashchange -> handleNavigation
      } else {
        // If hash is the same (e.g., clicking the active nav link again to "refresh")
        handleNavigation(); // Manually call to re-fetch data for the current view
      }
    });
  });

  // Listen for hash changes (e.g., browser back/forward buttons)
  window.addEventListener('hashchange', handleNavigation);

  // Initial view setup based on current hash or default
  handleNavigation(); // Initial view setup and data load for the current view

  // --- Manual Subscription Form Handling ---
  const manualSubForm = document.getElementById('manual-subscription-form');
  const manualSubMessage = document.getElementById('manual-sub-message');

  if (manualSubForm) {
    manualSubForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (manualSubMessage) manualSubMessage.textContent = ''; // Clear previous messages

      const email = document.getElementById('manual-sub-email').value.trim();
      const type = document.getElementById('manual-sub-type').value.trim() || 'premium'; // Default to premium if empty
      const notes = document.getElementById('manual-sub-notes').value.trim();

      if (!email) {
        if (manualSubMessage) {
          manualSubMessage.textContent = 'User Email is required.';
          manualSubMessage.className = 'mt-3 text-sm text-red-400';
        }
        return;
      }

      try {
        const payload = { email, type, notes };
        // 'api' object is defined at the top of the DOMContentLoaded scope
        const result = await api.post('/api/v1/admin/subscriptions/manual', payload);

        if (result.success) {
          if (manualSubMessage) {
            manualSubMessage.textContent = result.message || 'Manual subscription added successfully!';
            manualSubMessage.className = 'mt-3 text-sm text-green-400';
          }
          manualSubForm.reset(); // Clear the form
          // Refresh the Stripe subscriptions list. While manual subscriptions aren't Stripe ones,
          // this list is the current primary view for subscriptions in this section.
          // A more integrated solution might show all subscription types or have separate lists.
          fetchStripeDashboardData(); 
        } else {
          if (manualSubMessage) {
            manualSubMessage.textContent = result.message || 'Failed to add manual subscription.';
            manualSubMessage.className = 'mt-3 text-sm text-red-400';
          }
        }
      } catch (error) {
        console.error('Error submitting manual subscription:', error);
        if (manualSubMessage) {
          manualSubMessage.textContent = 'An error occurred. Please try again.';
          manualSubMessage.className = 'mt-3 text-sm text-red-400';
        }
      }
    });
  }
  // --- End Manual Subscription Form Handling ---
});
