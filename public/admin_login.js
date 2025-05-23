document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMessageElement = document.getElementById('error-message');
  const loginButton = document.getElementById('login-button');
  const loginButtonText = document.getElementById('login-button-text');
  const loginSpinner = document.getElementById('login-spinner');

  // Set default credentials for easy testing as per user request
  emailInput.value = 'admin@topvoice.ai';
  passwordInput.value = 'admin@topvoice.ai';

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessageElement.textContent = '';
    loginButton.disabled = true;
    loginButtonText.textContent = 'Logging in...';
    loginSpinner.classList.remove('hidden');

    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch('/api/v1/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the token (e.g., in localStorage) for future authenticated requests
        if (data.token) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUser', JSON.stringify(data.user));
        }
        // Redirect to dashboard
        window.location.href = '/dashboard.html'; 
      } else {
        errorMessageElement.textContent = data.message || 'Login failed. Please check your credentials.';
      }
    } catch (error) {
      console.error('Login error:', error);
      errorMessageElement.textContent = 'An error occurred. Please try again.';
    } finally {
      loginButton.disabled = false;
      loginButtonText.textContent = 'Login';
      loginSpinner.classList.add('hidden');
    }
  });
});
