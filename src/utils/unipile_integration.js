const dotenv = require("dotenv");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');

dotenv.config();

const UNIPILE_BASE_URL = "https://api1.unipile.com:13153/api/v1";
const UNIPILE_ACCESS_TOKEN = process.env.UNIPILE_ACCESS_TOKEN || 'xg3SQMtu.Z1yl0+QHjVi2p7NdD3xVMfYY6c7qDPZPgMkha5Didb0=';

const headers = {
  'X-API-Key': UNIPILE_ACCESS_TOKEN,
  'Content-Type': 'application/json'
};

async function getAllAccounts() {
  try {
    console.log('Sending request to Unipile API...');
    console.log('Endpoint:', `${UNIPILE_BASE_URL}/accounts`);
    
    const response = await fetch(`${UNIPILE_BASE_URL}/accounts`, {
      method: 'GET',
      headers: headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('Raw API response:', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.error('getAllAccounts: Empty response from API');
      return null;
    }
    
    if (data.items && Array.isArray(data.items)) {
      console.log(`Found ${data.items.length} accounts`);
      return data;
    } else {
      console.warn('getAllAccounts: Unexpected response format. Expected items array but got:', 
        Object.keys(data));
      return data; // Return the full response for debugging
    }
  } catch (error) {
    console.error('Error in getAllAccounts:');
    console.error('- Message:', error.message);
    
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    
    throw error;
  }
}

const fetchAndLogUnipileAccounts = async () => {
  console.log('Starting fetchAndLogUnipileAccounts function...');
  try {
    const response = await getAllAccounts();
    if (response && response.items) {
      console.log(`Successfully retrieved ${response.items.length} accounts`);
      // Log each account's name and ID for verification
      response.items.forEach((account, index) => {
        console.log(`[${index + 1}] ${account.name} (${account.id})`);
      });
      return response;
    } else {
      console.log("No accounts found in the response");
      return null;
    }
  } catch (error) {
    // This will catch errors re-thrown by getAllAccounts
    console.error("Error within fetchAndLogUnipileAccounts execution:", error.message);
    return null; // Indicate failure
  }
};


// Example usage:
// const { fetchAndLogUnipileAccounts, getAllAccounts } = require('./utils/unipile_integration');

// // To fetch and log all accounts (as the original script did):
// fetchAndLogUnipileAccounts().then(result => {
//   if (result) {
//     console.log("Accounts fetched successfully by the imported function.");
//   } else {
//     console.log("Imported function completed, but no data or an error occurred.");
//   }
// });

// // Or, to just get the account data without automatic logging:
// async function manageAccounts() {
//   try {
//     const accountsData = await getAllAccounts();
//     if (accountsData && accountsData.items) {
//       console.log(`Retrieved ${accountsData.items.length} accounts:`);
//       // Process accountsData.items as needed
//       accountsData.items.forEach(acc => console.log(acc.name));
//     } else {
//       console.log("No accounts data retrieved.");
//     }
//   } catch (error) {
//     console.error("Error managing accounts:", error.message);
//   }
// }

// manageAccounts();



async function getAllChats(queryParams = {}) {
  try {
    let url = `${UNIPILE_BASE_URL}/chats`;
    const params = new URLSearchParams();

    // Append query parameters if they exist
    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && queryParams[key] !== undefined) {
        params.append(key, queryParams[key]);
      }
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    console.log('Sending request to Unipile API for chats...');
    console.log('Endpoint:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`, data);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('Raw API response (chats):', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.error('getAllChats: Empty response from API');
      return null;
    }
    
    // Assuming the response structure is similar to getAllAccounts with an 'items' array
    if (data.items && Array.isArray(data.items)) {
      console.log(`Found ${data.items.length} chats`);
      return data;
    } else {
      console.warn('getAllChats: Unexpected response format. Expected items array but got:', 
        Object.keys(data));
      return data; // Return the full response for debugging
    }
  } catch (error) {
    console.error('Error in getAllChats:');
    console.error('- Message:', error.message);
    
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    
    throw error;
  }
}


async function startNewChat(chatDetails) {
  const { 
    accountId, 
    attendeesIds, 
    text,
    subject,
    linkedin, 
    attachments, 
    voiceMessage, 
    videoMessage 
  } = chatDetails;

  if (!accountId || !attendeesIds || !Array.isArray(attendeesIds) || attendeesIds.length === 0) {
    console.error('startNewChat: accountId and a non-empty array of attendeesIds are required.');
    throw new Error('accountId and attendeesIds are required.');
  }

  const form = new FormData();

  form.append('account_id', accountId);
  attendeesIds.forEach(id => form.append('attendees_ids', id));

  if (text) {
    form.append('text', text);
  }
  if (subject) {
    form.append('subject', subject);
  }

  if (linkedin && typeof linkedin === 'object') {
    for (const key in linkedin) {
      if (linkedin.hasOwnProperty(key)) {
        form.append(`linkedin[${key}]`, linkedin[key]);
      }
    }
  }

  if (attachments && Array.isArray(attachments)) {
    attachments.forEach(file => {
      if (file && file.stream && file.filename) {
        form.append('attachments', file.stream, file.filename);
      }
    });
  }

  if (voiceMessage && voiceMessage.stream && voiceMessage.filename) {
    form.append('voice_message', voiceMessage.stream, voiceMessage.filename);
  }

  if (videoMessage && videoMessage.stream && videoMessage.filename) {
    form.append('video_message', videoMessage.stream, videoMessage.filename);
  }

  const requestHeaders = {
    ...form.getHeaders(), // Gets Content-Type with boundary
    'X-API-Key': UNIPILE_ACCESS_TOKEN,
    'accept': 'application/json'
  };

  try {
    console.log('Starting new chat via Unipile API...');
    console.log('Endpoint:', `${UNIPILE_BASE_URL}/chats`);
    
    const response = await fetch(`${UNIPILE_BASE_URL}/chats`, {
      method: 'POST',
      headers: requestHeaders,
      body: form
    });
    
    const data = await response.json();
    
    if (response.status === 201) {
      console.log('Successfully started new chat:', JSON.stringify(data, null, 2));
      return data; // Expected: { object: 'ChatStarted', chat_id: 'string', message_id: 'string' }
    } else {
      console.error(`HTTP error! status: ${response.status}`, data);
      throw new Error(`HTTP error! status: ${response.status} - ${data.type || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in startNewChat:');
    console.error('- Message:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    throw error;
  }
}


async function sendMessageInChat(chatId, messageDetails = {}) {
  if (!chatId) {
    console.error('sendMessageInChat: chatId is required.');
    throw new Error('chatId is required.');
  }

  const {
    text,
    accountId,
    threadId,
    quoteId,
    voiceMessage,
    videoMessage,
    attachments
  } = messageDetails;

  const form = new FormData();

  if (text) {
    form.append('text', text);
  }
  if (accountId) {
    form.append('account_id', accountId);
  }
  if (threadId) {
    form.append('thread_id', threadId);
  }
  if (quoteId) {
    form.append('quote_id', quoteId);
  }

  if (attachments && Array.isArray(attachments)) {
    attachments.forEach(file => {
      if (file && file.stream && file.filename) {
        form.append('attachments', file.stream, file.filename);
      }
    });
  }

  if (voiceMessage && voiceMessage.stream && voiceMessage.filename) {
    form.append('voice_message', voiceMessage.stream, voiceMessage.filename);
  }

  if (videoMessage && videoMessage.stream && videoMessage.filename) {
    form.append('video_message', videoMessage.stream, videoMessage.filename);
  }

  // Check if form is empty (e.g. only chatId provided with no actual message content/text/attachments)
  // The API might require at least 'text' or an attachment.
  // This check is basic; specific API requirements should be reviewed.
  if (form.getBuffer().length === 0 && !text) { // form-data specific way to check if empty
      // Or, more simply, if (!text && (!attachments || attachments.length === 0) && !voiceMessage && !videoMessage)
      console.warn('sendMessageInChat: Attempting to send an empty message. API might reject this.');
      // Potentially throw error or proceed, depending on desired strictness
  }

  const requestHeaders = {
    ...form.getHeaders(), // Gets Content-Type with boundary
    'X-API-Key': UNIPILE_ACCESS_TOKEN,
    'accept': 'application/json'
  };

  const url = `${UNIPILE_BASE_URL}/chats/${chatId}/messages`;

  try {
    console.log(`Sending message to chat ${chatId} via Unipile API...`);
    console.log('Endpoint:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: form
    });

    const data = await response.json();

    if (response.status === 201) {
      console.log('Successfully sent message:', JSON.stringify(data, null, 2));
      return data; // Expected: { object: 'MessageSent', message_id: 'string' }
    } else {
      console.error(`HTTP error! status: ${response.status}`, data);
      throw new Error(`HTTP error! status: ${response.status} - ${data.type || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in sendMessageInChat:');
    console.error('- Message:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    throw error;
  }
}


async function getMessagesInChat(chatId, queryParams = {}) {
  if (!chatId) {
    console.error('getMessagesInChat: chatId is required.');
    throw new Error('chatId is required.');
  }

  try {
    let url = `${UNIPILE_BASE_URL}/chats/${chatId}/messages`;
    const params = new URLSearchParams();

    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && queryParams[key] !== undefined) {
        params.append(key, queryParams[key]);
      }
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    console.log(`Fetching messages for chat ${chatId}...`);
    console.log('Endpoint:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`, data);
      throw new Error(`HTTP error! status: ${response.status} - ${data.type || 'Unknown error'}`);
    }
    
    console.log('Raw API response (messages in chat):', JSON.stringify(data, null, 2));
    return data; // Expected: { object: 'MessageList', items: [], cursor: 'string' | null }
  } catch (error) {
    console.error('Error in getMessagesInChat:');
    console.error('- Message:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    throw error;
  }
}

async function getMessageById(messageId) {
  if (!messageId) {
    console.error('getMessageById: messageId is required.');
    throw new Error('messageId is required.');
  }

  try {
    const url = `${UNIPILE_BASE_URL}/messages/${messageId}`;
    console.log(`Fetching message by ID ${messageId}...`);
    console.log('Endpoint:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`, data);
      throw new Error(`HTTP error! status: ${response.status} - ${data.type || 'Unknown error'}`);
    }
    
    console.log('Raw API response (message by ID):', JSON.stringify(data, null, 2));
    return data; // Expected: { object: 'Message', ...message_details }
  } catch (error) {
    console.error('Error in getMessageById:');
    console.error('- Message:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    throw error;
  }
}

async function getAllMessagesGlobal(queryParams = {}) {
  try {
    let url = `${UNIPILE_BASE_URL}/messages`;
    const params = new URLSearchParams();

    for (const key in queryParams) {
      if (queryParams.hasOwnProperty(key) && queryParams[key] !== undefined) {
        params.append(key, queryParams[key]);
      }
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    console.log('Fetching all messages globally...');
    console.log('Endpoint:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`, data);
      throw new Error(`HTTP error! status: ${response.status} - ${data.type || 'Unknown error'}`);
    }
    
    console.log('Raw API response (all messages global):', JSON.stringify(data, null, 2));
    return data; // Expected: { object: 'MessageList', items: [], cursor: 'string' | null }
  } catch (error) {
    console.error('Error in getAllMessagesGlobal:');
    console.error('- Message:', error.message);
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    throw error;
  }
}

async function getAllWebhooks(queryParams = {}) {
  try {
    let url = `${UNIPILE_BASE_URL}/webhooks`;
    const params = new URLSearchParams();

    // Append query parameters if they exist
    if (queryParams.cursor) {
      params.append('cursor', queryParams.cursor);
    }
    if (queryParams.limit) {
      params.append('limit', queryParams.limit);
    }

    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    console.log('Sending request to Unipile API for webhooks...');
    console.log('Endpoint:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers // Assuming 'headers' is defined globally with API key
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`, data);
      // Log more details from the Unipile error structure if available
      if (data && data.type && data.message) {
        console.error(`Unipile Error Type: ${data.type}, Message: ${data.message}`);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('Raw API response (webhooks):', JSON.stringify(data, null, 2));
    
    if (!data) {
      console.error('getAllWebhooks: Empty response from API');
      return null;
    }
    
    // Assuming the response structure has an 'items' array and 'cursor'
    if (data.items && Array.isArray(data.items)) {
      console.log(`Found ${data.items.length} webhooks`);
      return data; // Contains items and potentially a cursor
    } else {
      console.warn('getAllWebhooks: Unexpected response format. Expected "items" array. Got:', 
        Object.keys(data));
      return data; // Return the full response for debugging
    }
  } catch (error) {
    console.error('Error in getAllWebhooks:');
    console.error('- Message:', error.message);
    
    if (error.response) { // If fetch itself threw an error with a response object
      console.error('- Status:', error.response.status);
      console.error('- Status Text:', error.response.statusText);
    }
    // If the error object has a 'type' (from Unipile's structured errors parsed above)
    if (error.type) {
        console.error(`- Unipile Error Type: ${error.type}`);
    }
    
    throw error; // Re-throw the error to be handled by the caller
  }
}

module.exports = {
  fetchAndLogUnipileAccounts,
  getAllAccounts,
  getAllChats,
  startNewChat,
  sendMessageInChat,
  getMessagesInChat,
  getMessageById,
  getAllMessagesGlobal,
  getAllWebhooks
};