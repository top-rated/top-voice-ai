const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Directory to save API endpoint responses
const OUTPUT_DATA_DIR = path.join(__dirname, 'api_responses_data'); // Changed directory name

// Configure your application's base URL (ensure your app server is running)
const APP_BASE_URL = process.env.APP_URL || 'http://localhost:3000'; // Default to port 3000

const endpointsToTest = [
  {
    name: "App API - Refresh All Top Voices Data",
    method: "GET",
    url: `${APP_BASE_URL}/api/v1/top-voices/refresh-all`,
    description: "Triggers initial data pull and processing, creates/updates src/data/top_voices.json"
  },
  {
    name: "App API - Get Trending Posts",
    method: "GET",
    url: `${APP_BASE_URL}/api/v1/top-voices/trending`,
    description: "Triggers daily data pull and trending processing, creates/updates src/data/trending_posts.json"
  }
];

const testEndpoint = async (endpoint) => {
  console.log(`\n--- Testing Endpoint: ${endpoint.name} ---`);
  console.log(`Description: ${endpoint.description}`);
  console.log(`Requesting ${endpoint.method} ${endpoint.url}`);

  try {
    const config = { method: endpoint.method, url: endpoint.url };
    const response = await axios(config);

    console.log(`Status: ${response.status}`);
    console.log('Response Data from API:');
    console.log(JSON.stringify(response.data, null, 2));

    // Save API response to a file
    try {
      await fs.mkdir(OUTPUT_DATA_DIR, { recursive: true }); // Ensure directory exists
      const filename = endpoint.name.toLowerCase().replace(/[^a-z0-9_]/gi, '_') + '_response.json';
      const filePath = path.join(OUTPUT_DATA_DIR, filename);
      await fs.writeFile(filePath, JSON.stringify(response.data, null, 2));
      console.log(`API Response saved to ${filePath}`);
    } catch (fileError) {
      console.error(`Error saving API response to file for ${endpoint.name}:`, fileError.message);
    }

    console.log(`\n>>> After calling ${endpoint.name}, check your src/data/ directory for updated files (top_voices.json or trending_posts.json).`);

  } catch (error) {
    console.error(`Error calling endpoint ${endpoint.name} (${endpoint.url}):`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('Error Request: No response received. Is your application server running at ' + APP_BASE_URL + '?');
    } else {
      console.error('Error Message:', error.message);
    }
  }
};

const runTests = async () => {
  console.log('Starting application API endpoint tests...');
  console.log(`Ensure your application server is running and accessible at ${APP_BASE_URL}`);
  console.log('This script will trigger endpoints that should update files in d:\\top-voice-ai\\src\\data\\');
  
  for (const endpoint of endpointsToTest) {
    await testEndpoint(endpoint);
  }
  console.log('\n--- All endpoint tests complete ---');
  console.log(`API responses (if successful) are saved in the "${path.basename(OUTPUT_DATA_DIR)}" directory.`);
  console.log('The primary outcome to check is the creation/update of files in your application\'s src/data directory.');
  console.log('\nTo run this script: node test_webhook.js');
  console.log('Ensure you have axios installed (npm install axios or yarn add axios).');
  console.log('You might need to set APP_URL environment variable if your app is not on http://localhost:3000.');
};

runTests();
