const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Unipile API configuration
const UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL;
const UNIPILE_ACCESS_TOKEN = process.env.UNIPILE_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.ACCOUNT_ID;

// Webhook endpoint to receive LinkedIn message events
router.post('/webhook/linkedin/messages', async (req, res) => {
    try {
        const event = req.body;
        
        // Log the incoming webhook event for debugging
        console.log('Received webhook event:', JSON.stringify(event, null, 2));
        
        // Check if this is a new message event
        if (event.type === 'message.received') {
            const message = event.data;
            
            // Check if the message contains 'hello' (case insensitive)
            if (message.text && message.text.toLowerCase().includes('hello')) {
                // Send a response message
                await sendMessage(
                    message.chat_id,
                    'Hello! How can I help you?'
                );
            }
        }
        
        // Always send a 200 OK response to acknowledge receipt
        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Function to send a message to a chat
async function sendMessage(chatId, text) {
    try {
        const url = `${UNIPILE_BASE_URL}/chats/${chatId}/messages`;
        
        const response = await axios.post(
            url,
            {
                text,
                account_id: ACCOUNT_ID
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': UNIPILE_ACCESS_TOKEN,
                    'Accept': 'application/json'
                }
            }
        );
        
        console.log('Message sent successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = router;