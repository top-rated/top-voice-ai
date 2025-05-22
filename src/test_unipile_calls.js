const { getAllAccounts, getAllChats } = require('./utils/unipile_integration');

async function runTests() {
  console.log("--- Starting Unipile API Tests ---");

  // Test 1: Get All Accounts
  console.log("\n--- Test 1: Calling getAllAccounts() ---");
  try {
    const accountsData = await getAllAccounts();
    if (accountsData) {
      console.log("getAllAccounts() successful. Response:");
      console.log(JSON.stringify(accountsData, null, 2));
      
      // Example: Log specific details if accountsData.items exists
      if (accountsData.items && Array.isArray(accountsData.items)) {
        console.log(`\nFound ${accountsData.items.length} accounts:`);
        accountsData.items.forEach((account, index) => {
          console.log(`  [${index + 1}] ID: ${account.id}, Provider: ${account.provider}, Login: ${account.login}, Name: ${account.name}`);
        });
      } else {
        console.log("\nNote: accountsData.items was not found or not an array. Full response logged above.");
      }
    } else {
      console.log("getAllAccounts() did not return data.");
    }
  } catch (error) {
    console.error("Error during getAllAccounts() test:", error.message);
    if (error.response) {
        console.error("API Response Error Details:", error.response)
    }
  }

  // Test 2: Get All Chats (Optional - can be enabled after accounts test)
  // console.log("\n--- Test 2: Calling getAllChats() ---");
  // try {
  //   // You might want to pass specific queryParams, e.g., { account_id: 'some_account_id_from_test_1' }
  //   const chatsData = await getAllChats({ limit: 5 }); // Example: limit to 5 chats
  //   if (chatsData) {
  //     console.log("getAllChats() successful. Response:");
  //     console.log(JSON.stringify(chatsData, null, 2));
  //   } else {
  //     console.log("getAllChats() did not return data.");
  //   }
  // } catch (error) {
  //   console.error("Error during getAllChats() test:", error.message);
  // }

  console.log("\n--- Unipile API Tests Finished ---");
}

runTests();
