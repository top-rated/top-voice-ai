const { AzureChatOpenAI } = require("@langchain/openai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const dotenv = require("dotenv");
const { MemorySaver } = require("@langchain/langgraph");
const { getSystemPrompt } = require("../utils/systemPromptManager");
const { getAllApiTools } = require("../utils/api_tools");
const { HumanMessage } = require("@langchain/core/messages");
dotenv.config();

const azureConfig = {
  model: process.env.MODEL_NAME,
  azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIApiInstanceName: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
  azureOpenAIApiDeploymentName: process.env.MODEL_NAME,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
};

const llm = new AzureChatOpenAI(azureConfig);

// Get all API tools
const apiTools = getAllApiTools();

// We'll load the prompt dynamically during processing
let cachedPrompt = null;
let lastPromptFetchTime = 0;
const PROMPT_CACHE_TTL = 60000; // 1 minute in milliseconds

// Create a memory store to maintain conversation history
const memoryStore = new Map();

/**
 * Get the current system prompt with caching
 * @returns {Promise<string>} - The current system prompt
 */
async function getCurrentPrompt() {
  const now = Date.now();

  // Use cached prompt if it's still fresh
  if (cachedPrompt && now - lastPromptFetchTime < PROMPT_CACHE_TTL) {
    return cachedPrompt;
  }

  try {
    // Fetch fresh prompt
    cachedPrompt = await getSystemPrompt();
    lastPromptFetchTime = now;
    return cachedPrompt;
  } catch (error) {
    console.error("Error fetching system prompt:", error);
    // If we have a cached version, use it as fallback
    if (cachedPrompt) {
      console.log("Using cached prompt as fallback");
      return cachedPrompt;
    }
    // Last resort fallback - throw error
    throw new Error(
      "Failed to get system prompt and no cached version available"
    );
  }
}

/**
 * Process a user query and return a response
 * @param {string} threadId - Unique identifier for the conversation thread
 * @param {string} query - User's query/message
 * @returns {Promise<string>} - The assistant's response
 */
async function processQuery(threadId, query) {
  // Get current prompt
  const prompt = await getCurrentPrompt();

  // Initialize or retrieve memory for this thread
  if (!memoryStore.has(threadId)) {
    memoryStore.set(threadId, new MemorySaver());
  }
  const memory = memoryStore.get(threadId);

  // Create agent with thread-specific memory
  const agent = createReactAgent({
    llm: llm,
    tools: apiTools,
    checkpointSaver: memory,
    stateModifier: prompt,
  });

  // Prepare input with user's query
  const inputs = {
    messages: [{ role: "user", content: query }],
  };
  const config = { configurable: { thread_id: threadId } };

  // Process the query with thread_id in the configurable and stream the response
  const stream = agent.stream(inputs, {
    ...config,
    streamMode: "values",
  });

  // Return the stream to be handled by the API route
  return stream;
}

async function processLinkedInQuery(threadId, query) {
  // Get current prompt
  const basePrompt = await getCurrentPrompt();

  // Initialize or retrieve memory for this thread
  if (!memoryStore.has(threadId)) {
    memoryStore.set(threadId, new MemorySaver());
  }
  const memory = memoryStore.get(threadId);

  const newPrompt = `NOTE:Markdown is not allowed on LinkedIn so always use LinkedIn styling here is the base prompt: ${basePrompt} `;

  // Create agent with thread-specific memory
  const agent = createReactAgent({
    llm: llm,
    tools: apiTools,
    checkpointSaver: memory,
    stateModifier: newPrompt,
  });

  // Process the query with thread_id in the configurable and stream the response
  const agentFinalState = await agent.invoke(
    { messages: [new HumanMessage(query)] },
    { configurable: { thread_id: threadId } }
  );

  const response =
    agentFinalState.messages[agentFinalState.messages.length - 1].content;

  return response;
}
module.exports = {
  processQuery,
  processLinkedInQuery,
};
