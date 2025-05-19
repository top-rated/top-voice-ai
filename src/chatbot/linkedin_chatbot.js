const { ChatOpenAI } = require("@langchain/openai");
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const dotenv = require("dotenv");
const { MemorySaver } = require("@langchain/langgraph");
const { SYSTEM_PROMPT } = require("../utils/system_prompt");

dotenv.config();

// Initialize the model
const model = new ChatOpenAI({
  model: "gpt-4o",
});

// Define tools
const getWeather = tool(
  (input) => {
    if (
      ["sf", "san francisco", "san francisco, ca"].includes(
        input.location.toLowerCase()
      )
    ) {
      return "It's 60 degrees and foggy.";
    } else {
      return "It's 90 degrees and sunny.";
    }
  },
  {
    name: "get_weather",
    description: "Call to get the current weather.",
    schema: z.object({
      location: z.string().describe("Location to get the weather for."),
    }),
  }
);

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
    tools: [getWeather],
    checkpointSaver: memory,
    stateModifier: prompt,
  });

  // Prepare input with user's query
  const inputs = {
    messages: [{ role: "user", content: query }],
  };

  // Process the query with thread_id in the configurable
  const stream = await agent.stream(inputs, {
    streamMode: "values",
    configurable: {
      thread_id: threadId,
    },
  });

  // Collect the response
  let response = "";
  for await (const { messages } of stream) {
    const msg = messages[messages?.length - 1];
    if (msg?.content) {
      response = msg.content;
    } else if (msg?.tool_calls?.length > 0) {
      // For tool calls, we might want to handle differently
      // For now, just convert to string
      response = JSON.stringify(msg.tool_calls);
    } else {
      response = JSON.stringify(msg);
    }
  }

  return response;
}

module.exports = {
  processQuery,
};
