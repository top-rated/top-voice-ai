const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const OUTPUT_DATA_DIR = path.join(__dirname, 'webhook_responses_data');

const webhooks = [
  {
    name: "LinkedIn Top Voices - Initial",
    url: "https://n8n.top-rated.pro/webhook/79d5f960-bb03-402f-810b-52996ba4ebfa"
  },
  {
    name: "LinkedIn Top Voices - Daily",
    url: "https://n8n.top-rated.pro/webhook/ac8b9ad5-045a-44b5-aa76-028b707bd108"
  },
/*
  {
    name: "LinkedIn Custom Profile Posts",
    url: "https://n8n.top-rated.pro/webhook/c77decca-081e-4019-9797-f058d024e558",
    // Example: params: { profile_url: "linkedin_profile_url_here" } // Replace with actual param name if different
    // For GET requests, parameters are usually query strings. If POST, body needs to be structured.
    // Assuming GET for now, and n8n webhook is configured to accept profile_url as a query param.
    // Example: https://n8n.top-rated.pro/webhook/c77decca-081e-4019-9797-f058d024e558?profile_url=YOUR_URL_ENCODED_LINKEDIN_PROFILE
    // We will need to construct the URL with query parameters.
    paramKey: "profile_url", // Key expected by the n8n webhook for the profile URL
    paramValue: "https://www.linkedin.com/in/raheesahmed/" // Example value
  },
  {
    name: "LinkedIn Keyword Search Posts",
    url: "https://n8n.top-rated.pro/webhook/67b40ba9-34fd-46e9-96f1-2466c504c2ec",
    // Example: params: { search_query: "keyword search string" } // Replace with actual param name
    // Assuming GET and n8n webhook accepts 'keywords' as a query param based on your description.
    // Example: https://n8n.top-rated.pro/webhook/67b40ba9-34fd-46e9-96f1-2466c504c2ec?keywords=YOUR_URL_ENCODED_KEYWORDS
    paramKey: "keywords", // Key expected by the n8n webhook for the search query
    paramValue: "AI in marketing" // Example value
  }
*/
];

const testWebhook = async (webhook) => {
  console.log(`\n--- Testing: ${webhook.name} ---`);
  let urlToCall = webhook.url;

  if (webhook.paramKey && webhook.paramValue) {
    // Construct URL with query parameters
    const params = new URLSearchParams();
    params.append(webhook.paramKey, webhook.paramValue);
    urlToCall = `${webhook.url}?${params.toString()}`;
  }

  try {
    console.log(`Requesting URL: ${urlToCall}`);
    // Note: n8n webhooks might require specific methods (e.g., POST for parameters in body)
    // or headers (e.g., Authorization). Adjust axios.get() or use axios.post() if needed.
    const response = await axios.get(urlToCall, {
      // Example headers if needed:
      // headers: {
      //   'Authorization': 'Basic YOUR_BASE64_ENCODED_CREDENTIALS',
      //   'Content-Type': 'application/json'
      // }
    });
    console.log(`Status: ${response.status}`);
    console.log('Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Save response to a file
    try {
      await fs.mkdir(OUTPUT_DATA_DIR, { recursive: true }); // Ensure directory exists
      const filename = webhook.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '') + '_response.json';
      const filePath = path.join(OUTPUT_DATA_DIR, filename);
      await fs.writeFile(filePath, JSON.stringify(response.data, null, 2));
      console.log(`Response saved to ${filePath}`);
    } catch (fileError) {
      console.error(`Error saving response to file for ${webhook.name}:`, fileError.message);
    }
  } catch (error) {
    console.error(`Error fetching from ${webhook.name} (${urlToCall}):`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      // console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.error('Error Request: No response received.');
    } else {
      console.error('Error Message:', error.message);
    }
  }
};

const runTests = async () => {
  console.log('Starting webhook tests...');
  for (const webhook of webhooks) {
    await testWebhook(webhook);
  }
  console.log('\n--- All tests complete ---');
  console.log('\nWebhook responses (if successful) are saved in the "webhook_responses_data" directory.');
  console.log('\nTo run this script: node test_webhook.js');
  console.log('Ensure you have axios installed (npm install axios or yarn add axios).');
};

runTests();
