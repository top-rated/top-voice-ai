// unipile_linkedin_autoresponder.js

/*
Example .env variables for this script (if not hardcoding):
UNIPILE_ACCOUNT_ID="tuY5wcwTTIGLafdOElw5dw"
UNIPILE_BASE_URL="https://api1.unipile.com:13153/api/v1"
UNIPILE_ACCESS_TOKEN="xg3SQMtu.Z1yl0+QHjVi2p7NdD3xVMfYY6c7qDPZPgMkha5Didb0="
CHATBOT_BASE_URL="http://localhost:3000"
LINKEDIN_PAGE_ID="107378314"
AUTORESPONDER_PORT=3001
*/

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// --- Configuration ---
const UNIPILE_ACCOUNT_ID = "tuY5wcwTTIGLafdOElw5dw"; // Your Unipile Account ID for LinkedIn
const UNIPILE_API_BASE_URL = "https://api1.unipile.com:13153/api/v1";
const UNIPILE_ACCESS_TOKEN = "xg3SQMtu.Z1yl0+QHjVi2p7NdD3xVMfYY6c7qDPZPgMkha5Didb0=";
const CHATBOT_API_URL = "http://localhost:3000/api/v1/linked"; // Your existing chatbot endpoint
const AUTORESPONDER_PORT = process.env.AUTORESPONDER_PORT || 3001;

// --- Unipile API Headers ---
const unipileApiHeaders = {
    'X-API-KEY': UNIPILE_ACCESS_TOKEN,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
};

// --- Webhook Endpoint for Unipile ---
app.post('/unipile-webhook', async (req, res) => {
    console.log('Received webhook notification from Unipile:');
    console.log(JSON.stringify(req.body, null, 2));

    // Extract necessary information from the Unipile webhook payload
    // The exact structure might vary, adjust based on actual Unipile webhook data for 'message_received'
    const webhookData = req.body;

    // Assuming the webhook directly sends message details
    // Or it might send a list of events, and you need to find the 'message_received' one.
    // For this example, let's assume a structure where chat_id and message content are available.
    // This will likely need adjustment based on the actual payload from Unipile.

    let threadId; // This is the chat_id from Unipile
    let query;    // This is the incoming message content
    let senderIsNotSelf = true; // Basic check to avoid replying to our own messages

    // Example: Extracting from a common Unipile message structure
    // IMPORTANT: You MUST inspect the actual webhook payload from Unipile for 'message_received' 
    // and adjust the following lines to correctly parse chat_id and message content.
    if (webhookData.object === 'event' && webhookData.type === 'message.created') { // Hypothetical structure
        const message = webhookData.data?.message;
        if (message) {
            threadId = message.chat_id;
            query = message.text_content; // Or message.content, message.text etc.
            // Add a check to ensure the message is not from the bot itself if possible
            // e.g., by checking message.sender_id against your bot's Unipile identity if known
            // For now, we'll assume any incoming message should be replied to.
        }
    } else if (webhookData.chat_id && webhookData.message) { // Another possible direct structure
        threadId = webhookData.chat_id;
        query = webhookData.message; // Assuming message is a string
        // Potentially check webhookData.sender or similar to avoid self-reply
    }
    // Add more robust parsing based on actual Unipile webhook structure for LinkedIn page messages
    // It's common for webhooks to send an array of events or a nested object.
    // For example, if it's an array of messages:
    else if (Array.isArray(webhookData.messages) && webhookData.messages.length > 0) {
        const latestMessage = webhookData.messages[webhookData.messages.length - 1];
        threadId = latestMessage.chat_id;
        query = latestMessage.text; // or latestMessage.content.text, etc.
        // Check if latestMessage.from_me is false or sender_id is not your page's ID
        if (latestMessage.from_me === true) {
            senderIsNotSelf = false;
            console.log("Skipping reply to self.");
        }
    } else if (webhookData.event === 'message_received' && webhookData.data) { // Structure from Unipile docs example
        threadId = webhookData.data.chat_id;
        query = webhookData.data.message; // This might be an object, ensure you get text
        if (typeof query === 'object' && query !== null && query.text) {
            query = query.text;
        }
        // Check sender to avoid loop - webhookData.data.sender.is_me or similar
        if (webhookData.data.sender && webhookData.data.sender.is_me) {
            senderIsNotSelf = false;
            console.log("Skipping reply to self (based on sender.is_me).");
        }
    }


    if (threadId && query && senderIsNotSelf) {
        console.log(`Extracted - Thread ID (Chat ID): ${threadId}, Query: ${query}`);

        try {
            // 1. Get auto-reply from your chatbot
            console.log(`Sending to chatbot: ${CHATBOT_API_URL}`);
            const chatbotResponse = await axios.post(CHATBOT_API_URL, {
                threadId: threadId, // Your chatbot expects threadId
                query: query
            });

            const botReply = chatbotResponse.data; // Assuming your chatbot returns { response: "reply text" } or similar
            let replyText;

            if (botReply && botReply.response) {
                replyText = botReply.response;
            } else if (typeof botReply === 'string') { // If chatbot returns a plain string
                replyText = botReply;
            } else if (chatbotResponse.data && chatbotResponse.data.length > 0 && chatbotResponse.data[0].text) {
                // If chatbot returns an array of message objects like Langchain LCEL
                replyText = chatbotResponse.data[0].text.value; 
            } else {
                console.error('Chatbot response format not recognized:', botReply);
                res.status(500).send('Error: Chatbot response format not recognized');
                return;
            }

            console.log(`Chatbot reply: ${replyText}`);

            // 2. Send the reply back to LinkedIn via Unipile
            const unipileReplyUrl = `${UNIPILE_API_BASE_URL}/chats/${threadId}/messages`;
            const unipileReplyPayload = {
                text: replyText
                // You might need to specify 'account_id': UNIPILE_ACCOUNT_ID if the API requires it for sending
            };

            console.log(`Sending reply to Unipile: ${unipileReplyUrl}`);
            console.log(`Payload: ${JSON.stringify(unipileReplyPayload)}`);

            await axios.post(unipileReplyUrl, unipileReplyPayload, { headers: unipileApiHeaders });
            console.log('Successfully sent reply via Unipile.');
            res.status(200).send('Webhook processed and reply sent.');

        } catch (error) {
            console.error('Error processing webhook or sending reply:', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
            if (error.response && error.response.data && error.response.data.message) {
                 console.error('Unipile API Error:', error.response.data.message);
            }
            res.status(500).send('Error processing webhook.');
        }
    } else if (!senderIsNotSelf) {
        console.log('Message was from self, no reply sent.');
        res.status(200).send('Webhook received, message from self, no action taken.');
    } else {
        console.warn('Webhook received, but could not extract threadId or query, or sender check failed.');
        console.warn('Request Body:', JSON.stringify(req.body, null, 2));
        res.status(400).send('Webhook received, but essential data missing or invalid.');
    }
});

// --- Health Check Endpoint ---
app.get('/health', (req, res) => {
    res.status(200).send('Autoresponder service is healthy.');
});

// --- Start Server ---
app.listen(AUTORESPONDER_PORT, () => {
    console.log(`Unipile LinkedIn Autoresponder service started on port ${AUTORESPONDER_PORT}`);
    console.log(`Listening for webhooks at /unipile-webhook`);
    console.log(`Ensure this service is publicly accessible or use ngrok for Unipile to reach it.`);
    console.log(`---`);
    console.log(`Remember to configure a Unipile webhook:`);
    console.log(`  Request URL: [Your Public URL]/unipile-webhook`);
    console.log(`  Source: messaging`);
    console.log(`  Events: ["message_received"]`);
    console.log(`  Account IDs: ["${UNIPILE_ACCOUNT_ID}"]`);
    console.log(`---`);
});

module.exports = app; // For potential testing or programmatic use
