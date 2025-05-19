const { ChatOpenAI } = require("@langchain/openai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const dotenv = require("dotenv");
const { MemorySaver } = require("@langchain/langgraph");
const { SYSTEM_PROMPT } = require("../utils/system_prompt");
const { getAllApiTools } = require("../utils/api_tools");

dotenv.config();

// Initialize the model
const model = new ChatOpenAI({
  model: "gpt-4o",
});

// Get all API tools
const apiTools = getAllApiTools();

const prompt = SYSTEM_PROMPT;

// Create a memory store to maintain conversation history
const memoryStore = new Map();

/**
 * Process a user query and return a response
 * @param {string} threadId - Unique identifier for the conversation thread
 * @param {string} query - User's query/message
 * @returns {Promise<string>} - The assistant's response
 */
async function processQuery(threadId, query) {
  // Initialize or retrieve memory for this thread
  if (!memoryStore.has(threadId)) {
    memoryStore.set(threadId, new MemorySaver());
  }
  const memory = memoryStore.get(threadId);

  // Create agent with thread-specific memory
  const agent = createReactAgent({
    llm: model,
    tools: apiTools,
    checkpointSaver: memory,
    stateModifier: prompt,
  });

  // Prepare input with user's query
  const inputs = {
    messages: [{ role: "user", content: query }],
  };

  // Process the query with thread_id in the configurable
  const result = await agent.invoke(inputs, {
    configurable: {
      thread_id: threadId,
    },
  });

  // Get the final response from the last message
  const messages = result.messages;
  const lastMessage = messages[messages.length - 1];

  // Return the content of the last message
  return lastMessage.content;
}

module.exports = {
  processQuery,
};
