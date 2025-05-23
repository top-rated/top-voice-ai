// d:\top-voice-ai\src\services\unipile_chat_service.js
const {
  startNewChat,
  sendMessageInChat,
  getAllAccounts, // Potentially useful for dynamic account selection later
} = require("../utils/unipile_integration.js");

const DEFAULT_SENDER_ACCOUNT_ID = process.env.DEFAULT_UNIPIL_ACCOUNT_ID || 'tuY5wcwTTIGLafdOElw5dw'; // Your primary Unipile account ID

/**
 * Sends a message via Unipile, primarily by starting a new chat.
 * Handles LinkedIn-specific options like InMail.
 *
 * @param {object} params - The parameters for sending the message.
 * @param {string} params.recipientProviderId - The provider-specific ID of the recipient (e.g., LinkedIn ID).
 * @param {string} params.messageText - The text of the message to send.
 * @param {string} [params.unipileAccountId=DEFAULT_SENDER_ACCOUNT_ID] - The Unipile account ID to send the message from.
 * @param {boolean} [params.isLinkedInInmail=false] - For LinkedIn, whether this is an InMail (requires Premium).
 * @param {string} [params.existingChatId] - If provided, will attempt to send to this existing chat ID instead of starting a new one.
 * @returns {Promise<object>} An object indicating success or failure, and relevant data.
 */
async function sendUnipileMessageViaChatbot({
  recipientProviderId,
  messageText,
  unipileAccountId = DEFAULT_SENDER_ACCOUNT_ID,
  isLinkedInInmail = false,
  existingChatId,
}) {
  if (!recipientProviderId && !existingChatId) {
    console.error("UnipileService: recipientProviderId or existingChatId is required.");
    return { success: false, error: "Recipient or Chat ID is required." };
  }
  if (!messageText) {
    console.error("UnipileService: messageText is required.");
    return { success: false, error: "Message text is required." };
  }

  try {
    let result;
    if (existingChatId) {
      console.log(`UnipileService: Sending message to existing chat ID: ${existingChatId}`);
      const messageDetails = {
        text: messageText,
      };
      result = await sendMessageInChat(existingChatId, messageDetails);
    } else {
      console.log(`UnipileService: Starting new chat with recipient: ${recipientProviderId}`);
      const chatDetails = {
        accountId: unipileAccountId,
        attendeesIds: [recipientProviderId],
        text: messageText,
      };

      // Check if the accountId implies LinkedIn to add specific options
      // This is a simple check; you might have a more robust way to determine the provider
      const account = await getUnipileAccountDetails(unipileAccountId); // Helper to get provider info

      if (account && account.provider && account.provider.toLowerCase() === 'linkedin') {
        chatDetails.linkedin = {
          api: 'classic', // Default, or determine from account details if possible
          inmail: isLinkedInInmail,
        };
        if (!isLinkedInInmail) {
          console.warn("UnipileService: Sending to LinkedIn without InMail. Ensure the recipient is a connection.");
        }
      }
      result = await startNewChat(chatDetails);
    }

    console.log("UnipileService: Message operation successful.", result);
    return { success: true, data: result };

  } catch (error) {
    console.error("UnipileService: Error sending Unipile message:", error.message);
    let errorMessage = "Failed to send message via Unipile.";
    if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return { success: false, error: errorMessage, details: error };
  }
}

/**
 * Helper function to get details of a specific Unipile account.
 * This is a placeholder; in a real scenario, you might cache this or fetch all once.
 */
async function getUnipileAccountDetails(accountId) {
  try {
    const accountsData = await getAllAccounts();
    if (accountsData && accountsData.items) {
      return accountsData.items.find(acc => acc.id === accountId);
    }
    return null;
  } catch (error) {
    console.error(`UnipileService: Error fetching account details for ${accountId}:`, error.message);
    return null;
  }
}

module.exports = {
  sendUnipileMessageViaChatbot,
  getUnipileAccountDetails // Export if needed elsewhere
};
