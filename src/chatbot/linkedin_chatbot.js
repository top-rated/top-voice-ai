const { AzureChatOpenAI } = require("@langchain/openai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const dotenv = require("dotenv");
const { MemorySaver } = require("@langchain/langgraph");
const { getSystemPrompt } = require("../utils/systemPromptManager");
const { getAllApiTools } = require("../utils/api_tools");
const { HumanMessage } = require("@langchain/core/messages");
dotenv.config();
const { linkedInSystemPrompt } = require("../utils/linked_system_prompt");

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
  // Initialize or retrieve memory for this thread
  if (!memoryStore.has(threadId)) {
    memoryStore.set(threadId, new MemorySaver());
  }
  const memory = memoryStore.get(threadId);

  const newPrompt = linkedInSystemPrompt;

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

  // 🛡️ FORCE REMOVE ALL MARKDOWN - LinkedIn doesn't support it!
  const cleanedResponse = cleanMarkdownForLinkedIn(response);

  return cleanedResponse;
}

/**
 * Remove all markdown formatting and convert to LinkedIn-friendly format
 * @param {string} text - Text that may contain markdown
 * @returns {string} - Clean text without any markdown
 */
function cleanMarkdownForLinkedIn(text) {
  if (!text) return text;

  let cleaned = text;

  // Remove bold markdown and convert to UPPERCASE
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, (match, content) => {
    return content.toUpperCase();
  });

  // Remove alternative bold markdown and convert to UPPERCASE
  cleaned = cleaned.replace(/__([^_]+)__/g, (match, content) => {
    return content.toUpperCase();
  });

  // Remove italic markdown and convert to UPPERCASE
  cleaned = cleaned.replace(/\*([^*]+)\*/g, (match, content) => {
    return content.toUpperCase();
  });

  // Remove alternative italic markdown and convert to UPPERCASE
  cleaned = cleaned.replace(/_([^_]+)_/g, (match, content) => {
    return content.toUpperCase();
  });

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```/g, "").trim();
  });

  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // Remove headers (# ## ###)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, "$1");

  // Remove blockquotes
  cleaned = cleaned.replace(/^>\s+(.+)$/gm, "$1");

  // Convert markdown links to plain text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  console.log("🧹 Cleaned markdown from response");
  console.log("Original length:", text.length);
  console.log("Cleaned length:", cleaned.length);

  return cleaned;
}
module.exports = {
  processQuery,
  processLinkedInQuery,
};
