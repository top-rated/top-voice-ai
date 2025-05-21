// Test script for the fixed chatbot with API tools
const { processQuery } = require('./src/chatbot/linkedin_chatbot');

async function testChatbot() {
  try {
    // Generate a unique thread ID for this test
    const threadId = `test-${Date.now()}`;
    
    // Test with a query that should trigger the top voices tool
    const query = "What are the top voices on LinkedIn?";
    
    console.log(`Sending query: "${query}"`);
    console.log('Waiting for response...');
    
    // Process the query
    const response = await processQuery(threadId, query);
    
    console.log('\nResponse:');
    console.log(response);
  } catch (error) {
    console.error('Error testing chatbot:', error);
  }
}

// Run the test
testChatbot();
