// d:\top-voice-ai\src\test_unipile_linkedin_link.js
require('dotenv').config({ path: '../.env' }); // Load .env variables from the root directory

const {
  getAllAccounts,
  getAllChats,
} = require("./utils/unipile_integration.js");

// Attempt to use the ACCOUNT_ID from .env, otherwise, we'll search for a LinkedIn account.
const TARGET_LINKEDIN_ACCOUNT_ID_FROM_ENV = process.env.ACCOUNT_ID;
const UNIPILE_ACCESS_TOKEN_FROM_ENV = process.env.UNIPILE_ACCESS_TOKEN;

async function testLinkedInConnection() {
  console.log("Starting Unipile LinkedIn Link Test...");

  if (!UNIPILE_ACCESS_TOKEN_FROM_ENV) {
    console.error("Error: UNIPILE_ACCESS_TOKEN is not set in your .env file.");
    console.error("Please ensure your .env file (in the project root d:\top-voice-ai) contains:");
    console.error('UNIPILE_ACCESS_TOKEN="your_actual_unipile_access_token"');
    return;
  }
  console.log(`Using UNIPILE_ACCESS_TOKEN from .env: ${UNIPILE_ACCESS_TOKEN_FROM_ENV.substring(0, 10)}...`);

  let linkedInAccountId = TARGET_LINKEDIN_ACCOUNT_ID_FROM_ENV;

  try {
    console.log("\nFetching all Unipile accounts...");
    const accountsData = await getAllAccounts();

    if (!accountsData || !accountsData.items || accountsData.items.length === 0) {
      console.error("No Unipile accounts found. Please ensure accounts are linked in Unipile.");
      return;
    }

    console.log("Available Unipile Accounts:");
    accountsData.items.forEach(acc => {
      console.log(`- Name: ${acc.name}, ID: ${acc.id}, Provider: ${acc.provider}, Type: ${acc.type}`);
    });

    let linkedInAccount;
    if (linkedInAccountId) {
        linkedInAccount = accountsData.items.find(acc => acc.id === linkedInAccountId);
        if (linkedInAccount && (!linkedInAccount.provider || linkedInAccount.provider.toLowerCase() !== 'linkedin')) {
            console.warn(`Warning: Account ID ${linkedInAccountId} from .env might not be a LinkedIn account (Provider: ${linkedInAccount.provider}). Proceeding, but please verify.`);
        } else if (!linkedInAccount) {
            console.warn(`Warning: Account ID ${linkedInAccountId} from .env was not found. Will try to find another LinkedIn account.`);
            linkedInAccountId = null; // Reset to allow search
        }
    }
    
    if (!linkedInAccountId) {
        // If no specific ID was provided or found, try to find the first LinkedIn account
        linkedInAccount = accountsData.items.find(acc => acc.provider && acc.provider.toLowerCase() === 'linkedin');
        if (linkedInAccount) {
            linkedInAccountId = linkedInAccount.id;
            console.log(`\nFound LinkedIn account by provider: ${linkedInAccount.name} (ID: ${linkedInAccountId})`);
        }
    }

    if (!linkedInAccountId || !linkedInAccount) {
      console.error("\nCould not identify a LinkedIn account. Please check your linked accounts in Unipile or set the correct ACCOUNT_ID in your .env file for your LinkedIn Unipile account.");
      return;
    }

    console.log(`\nProceeding with LinkedIn account: ${linkedInAccount.name} (ID: ${linkedInAccountId})`);

    console.log(`\nFetching recent chats for LinkedIn account ID: ${linkedInAccountId} (Limit 5)...`);
    const chatsData = await getAllChats({ account_id: linkedInAccountId, limit: 5 });

    if (chatsData && chatsData.items && chatsData.items.length > 0) {
      console.log(`Successfully fetched ${chatsData.items.length} recent chat(s) for ${linkedInAccount.name}:
`);
      chatsData.items.forEach((chat, index) => {
        console.log(`  Chat ${index + 1}:`);
        console.log(`    ID: ${chat.id}`);
        console.log(`    Name: ${chat.name || 'N/A'}`);
        console.log(`    Provider ID: ${chat.provider_id || 'N/A'}`);
        console.log(`    Last Message: ${chat.last_message ? chat.last_message.text.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`    Unread: ${chat.unread_count > 0}`);
        console.log(`    Attendees: ${chat.attendees ? chat.attendees.map(a => a.name || a.id).join(', ') : 'N/A'}`);
        console.log('    ----');
      });
      console.log("\nLinkedIn link test successful! Able to fetch chats.");
    } else if (chatsData && chatsData.items && chatsData.items.length === 0) {
      console.log(`No recent chats found for ${linkedInAccount.name}. This might be normal if there's no recent activity, or it could indicate an issue if you expect chats.`);
      console.log("LinkedIn link test partially successful (connection made, but no chats). Please verify on Unipile/LinkedIn.");
    } else {
      console.error("Failed to fetch chats or unexpected response format.", chatsData);
    }

  } catch (error) {
    console.error("\nError during LinkedIn connection test:", error.message);
    if (error.response && error.response.data) {
        console.error("Error details from API:", error.response.data);
    }
  }
}

testLinkedInConnection();
