// Test script for API tools
const { getAllApiTools } = require('./src/utils/api_tools');

// Get all tools
const tools = getAllApiTools();

// Print tool names and descriptions
console.log('Available API Tools:');
tools.forEach((tool, index) => {
  console.log(`${index + 1}. ${tool.name}: ${tool.description}`);
});

console.log(`\nTotal tools: ${tools.length}`);
