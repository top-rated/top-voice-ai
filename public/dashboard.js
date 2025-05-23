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
      if (recentActivityLogElement) recentActivityLogElement.textContent = 'Failed to load dashboard data.';
      // Optionally update stat elements to show an error state
      if (totalUsersStatElement) totalUsersStatElement.textContent = 'Error';
      if (activeSubscriptionsStatElement) activeSubscriptionsStatElement.textContent = 'Error';
      if (apiCallsStatElement) apiCallsStatElement.textContent = 'Error';
    }
  }

  // User Management Globals
  let currentUserPage = 1;
  let currentUserSearchTerm = '';
  let userSearchTimeout = null;

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

        if (users && users.length > 0) {
          users.forEach(user => {
            usersTableBody.innerHTML += renderUserRow(user);
          });
          // Event listeners for edit/delete are handled by delegation on usersTableBody
        } else {
          usersTableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-400">No users found.</td></tr>';
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
    // Hide all content sections
    contentSections.forEach(section => {
      section.classList.add('hidden');
    });

    // Show the target section
    const activeSection = document.getElementById(targetId);
    if (activeSection) {
      activeSection.classList.remove('hidden');
      // If the users section is being shown, fetch and display the users
      if (targetId === 'users-section') {
        fetchAndDisplayUsers(); // Call with default page 1 and no search
      }
    }

    // Update active states for navigation links
    navLinks.forEach(link => {
      link.classList.remove('bg-brand-blue', 'text-white');
      link.classList.add('hover:bg-dark-700', 'text-gray-200'); // Ensure default non-active styles
      if (link.dataset.target === targetId) {
        link.classList.add('bg-brand-blue', 'text-white');
        link.classList.remove('hover:bg-dark-700', 'text-gray-200');
      }
    });
  }

  function handleNavigation() {
    let targetId = window.location.hash.substring(1); // Get 'users' from '#users'
    if (!targetId) {
      targetId = 'dashboard'; // Default to dashboard
    }
    // Ensure the targetId for the section includes '-section'
    const sectionId = targetId.endsWith('-section') ? targetId : targetId + '-section';
    
    const availableSections = Array.from(contentSections).map(s => s.id);
    if (availableSections.includes(sectionId)){
        updateView(sectionId);
    } else {
        // Fallback to dashboard if the hash is invalid or section doesn't exist
        updateView('dashboard-section');
        window.location.hash = '#dashboard'; // Correct the hash
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault(); // Prevent default anchor behavior
      const targetSectionId = link.dataset.target;
      // Update hash, which will trigger the hashchange listener
      window.location.hash = targetSectionId.replace('-section', ''); 
    });
  });

  // Listen for hash changes (e.g., browser back/forward buttons)
  window.addEventListener('hashchange', handleNavigation);

  // Initial view setup based on current hash or default
  handleNavigation();

});
