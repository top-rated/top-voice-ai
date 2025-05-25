const { ChatOpenAI } = require("@langchain/openai");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const dotenv = require("dotenv");
const { MemorySaver } = require("@langchain/langgraph");
const { SYSTEM_PROMPT } = require("./src/utils/system_prompt");
const { getAllApiTools } = require("./src/utils/api_tools");
const { HumanMessage } = require("@langchain/core/messages");
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

  let inputs = { messages: [{ role: "user", content: query }] };
let config = { configurable: { thread_id: threadId} };
let stream = await agent.stream(inputs, {
  ...config,
  streamMode: "values",
});

for await (const { messages } of stream) {
    let msg = messages[messages?.length - 1];
    if (msg?.content) {
      console.log(msg);
    } else if (msg?.tool_calls?.length > 0) {
      console.log(msg.tool_calls);
    } else {
      console.log(msg);
    }
    console.log("-----\n");
  }
}
  



processQuery("1", "who are trending top voices");