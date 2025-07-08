require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Import routes
const authRoutes = require("./routes/auth.routes");
const topVoicesRoutes = require("./routes/topVoices.routes");
const profileRoutes = require("./routes/profile.routes");
const searchRoutes = require("./routes/search.routes");
const adminRoutes = require("./routes/admin.routes");
const stripeRoutes = require("./routes/stripe.routes"); // Added Stripe routes

// Import usage middleware
const {
  usageLimitMiddleware,
  trackUsageMiddleware,
} = require("./middleware/usage.middleware");

const { processQuery } = require("./chatbot/linkedin_chatbot");
const { UnipileClient } = require("unipile-node-sdk");
const { processLinkedInQuery } = require("./chatbot/linkedin_chatbot");
const recentlySentMessageIds = new Set();

// Initialize express app
const app = express();

// Trust proxy - required for express-rate-limit behind proxy
app.set("trust proxy", 1);

// Set up middleware
// Configure Helmet with custom CSP to allow external scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-eval'",
          "'unsafe-inline'",
          "cdn.tailwindcss.com",
          "unpkg.com",
          "cdn.jsdelivr.net",
          "api.leadpipe.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "cdn.tailwindcss.com",
          "cdnjs.cloudflare.com",
          "fonts.googleapis.com",
        ],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "api.leadpipe.com"],
        fontSrc: [
          "'self'",
          "cdnjs.cloudflare.com",
          "fonts.gstatic.com",
          "fonts.googleapis.com",
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: "50mb" })); // Parse JSON bodies with increased size limit
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // Add support for URL-encoded bodies
app.use(morgan("dev")); // Logging

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use("/api", apiLimiter);

// API routes
// const API_PREFIX = process.env.API_V1_PREFIX;
const API_PREFIX = "/api/v1";
console.log(`Registering admin routes at: ${API_PREFIX}/admin`);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/top-voices`, topVoicesRoutes);
app.use(`${API_PREFIX}/profiles`, profileRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/stripe`, stripeRoutes); // Added Stripe routes

// Test endpoint for debugging Unipile connection
app.post("/api/v1/test-unipile", async (req, res) => {
  console.log("=== TESTING UNIPILE CONNECTION ===");
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  const { chat_id, message } = req.body;

  if (!chat_id || !message) {
    return res.status(400).json({
      error: "Missing chat_id or message",
      required: ["chat_id", "message"],
    });
  }

  try {
    // Test the processLinkedInQuery function
    console.log("Testing processLinkedInQuery...");
    const reply = await processLinkedInQuery(chat_id, message);
    console.log("processLinkedInQuery result:", reply);

    // Test sending message
    console.log("Testing sendUnipileMessage...");
    const sentMessageId = await sendUnipileMessage(chat_id, reply);
    console.log("sendUnipileMessage result:", sentMessageId);

    res.json({
      success: true,
      processedMessage: reply,
      sentMessageId: sentMessageId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    res.status(500).json({
      error: error.message,
      stack: error.stack,
    });
  }
});

// Test webhook endpoint - just logs everything
app.post("/api/v1/test-webhook", (req, res) => {
  console.log("=== TEST WEBHOOK RECEIVED ===");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("Query:", JSON.stringify(req.query, null, 2));

  res.json({
    received: true,
    timestamp: new Date().toISOString(),
    body: req.body,
    headers: req.headers,
  });
});

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Admin dashboard route
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "dashboard.html"));
});

// Privacy policy route
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "privacy.html"));
});

// API documentation route
app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "api.html"));
});

// Stripe payment success and cancel routes
app.get("/payment-success", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "payment-success.html"));
});

app.get("/payment-cancelled", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "payment-cancelled.html"));
});

// chat route with usage limiting
app.post(
  "/api/v1/chat",
  usageLimitMiddleware({ limit: 5 }),
  trackUsageMiddleware,
  async (req, res) => {
    const { threadId, query } = req.body;

    console.log(
      `Chat request received - ThreadID: ${threadId}, Query: ${query}`
    );

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // Flush the headers to establish the connection

    // Send initial connection confirmation event
    const initialEvent = { type: "connected", data: "Connection established" };
    res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);
    // Express doesn't have flush() method - using write() is sufficient for SSE
    console.log("SSE connection established, sent initial event");

    try {
      console.log("Calling processQuery function...");
      const stream = await processQuery(threadId, query);
      console.log("Process query returned a stream, beginning iteration...");

      // Enhanced logging to debug LangGraph streaming
      for await (const chunk of stream) {
        console.log("DEBUG - Full chunk:", JSON.stringify(chunk, null, 2));

        // For streaming completion from LLM, the expected token format is in chunk.messages[last].content
        if (chunk && chunk.messages && chunk.messages.length > 0) {
          const msg = chunk.messages[chunk.messages.length - 1];
          console.log("DEBUG - Last message:", JSON.stringify(msg, null, 2));

          // Check if this is an actual completion token
          if (msg?.content !== undefined && typeof msg.content === "string") {
            console.log("DEBUG - Found content token:", msg.content);
            // Send actual content to client for streaming display
            const contentEvent = { type: "content_chunk", data: msg.content };
            res.write(`data: ${JSON.stringify(contentEvent)}\n\n`);
            console.log(`Sent content chunk: "${msg.content}"`);
          }
          // Handle tool calls
          else if (msg?.tool_calls && msg.tool_calls.length > 0) {
            const toolEvent = { type: "tool_invocation", data: msg.tool_calls };
            res.write(`data: ${JSON.stringify(toolEvent)}\n\n`);
            console.log(
              `Sent tool invocation: ${JSON.stringify(msg.tool_calls)}`
            );
          }
          // Handle tool results
          else if (msg?.name) {
            const toolResultEvent = { type: "tool_result", data: msg };
            res.write(`data: ${JSON.stringify(toolResultEvent)}\n\n`);
            console.log(
              `Sent tool result: ${
                msg.content?.substring(0, 30) || "No content"
              }`
            );
          }
          // Special case for empty content but valid message - could be start of token stream
          else if (msg?.content === "") {
            console.log("DEBUG - Found empty content token");
            const emptyContentEvent = { type: "content_chunk", data: "" };
            res.write(`data: ${JSON.stringify(emptyContentEvent)}\n\n`);
          }
          // Handle any other message types - let's check for completion messages with specific format
          else {
            // Try to extract useful content from the message
            let extractedContent = "";

            // Check if message is a constructor with an id - might be initialization message
            if (msg?.type === "constructor" && msg?.id) {
              console.log("DEBUG - Constructor message, skipping");
              continue; // Skip constructor messages
            }

            const unknownEvent = { type: "unknown", data: msg };
            res.write(`data: ${JSON.stringify(unknownEvent)}\n\n`);
            console.log(
              `Sent unknown message type: ${JSON.stringify(msg).substring(
                0,
                100
              )}`
            );
          }
        } else if (chunk) {
          console.log(
            "Received non-message chunk:",
            JSON.stringify(chunk).substring(0, 100)
          );
        }
      }

      // Send a completion event to properly signal the end of the stream
      const completionEvent = { type: "complete", data: "Stream complete" };
      res.write(`data: ${JSON.stringify(completionEvent)}\n\n`);
    } catch (error) {
      console.error("Error during chat processing:", error);
      // Send an error event to the client before closing
      const errorEvent = {
        type: "error",
        data: error.message || "An error occurred on the server.",
      };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      console.log("Error event sent to client");
    } finally {
      console.log("Ending SSE stream");
      res.end(); // End the SSE stream
    }
  }
);

// Unipile Configuration and Helper
const UNIPILE_BASE_URL = process.env.UNIPILE_BASE_URL;
const UNIPILE_ACCESS_TOKEN = process.env.UNIPILE_ACCESS_TOKEN;

// Debug environment variables
console.log("Environment variables loaded:");
console.log("UNIPILE_BASE_URL:", UNIPILE_BASE_URL ? "✓" : "✗");
console.log("UNIPILE_ACCESS_TOKEN:", UNIPILE_ACCESS_TOKEN ? "✓" : "✗");
console.log("ACCOUNT_ID:", process.env.ACCOUNT_ID ? "✓" : "✗");

//linkedin webhook route with usage limiting

// ============================================
// WEBHOOK TEST SERVER
// ============================================

// Test webhook endpoint
app.post("/api/v1/linked/webhook", async (req, res) => {
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Full request body:", JSON.stringify(req.body, null, 2));

  const { chat_id, message, message_id, sender, account_info } = req.body;

  // Log individual fields
  console.log(`Chat ID: ${chat_id}`);
  console.log(`Message: ${message}`);
  console.log(`Message ID: ${message_id}`);
  console.log(`Sender:`, JSON.stringify(sender));
  console.log(`Account Info:`, JSON.stringify(account_info));

  // Validate required fields
  if (!chat_id || !message) {
    console.warn("Missing required data (chat_id or message)");
    return res.status(400).json({
      status: "error",
      message: "Missing required parameters",
    });
  }

  // 🛡️ PREVENT INFINITE LOOP - Don't reply to our own messages!
  const myPersonalAccountId = ACCOUNT_ID; // Individual account
  const myOrganizationId = account_info?.mailbox_id; // Organization page ID
  const senderAccountId = sender?.attendee_provider_id;

  console.log(`🔍 Checking sender: ${senderAccountId}`);
  console.log(`   vs Personal Account: ${myPersonalAccountId}`);
  console.log(`   vs Organization ID: ${myOrganizationId}`);
  console.log(`   Sender Name: ${sender?.attendee_name}`);

  // Check if message is from our personal account OR our organization page
  const isMyMessage =
    senderAccountId === myPersonalAccountId ||
    senderAccountId === myOrganizationId ||
    sender?.attendee_name === "Cloud Nine" ||
    sender?.attendee_name === "Rahees Ahmed";

  if (isMyMessage) {
    console.log("🛑 IGNORING - This is my own message, won't reply to myself!");
    return res.json({
      status: "ignored",
      reason: "Own message detected - preventing infinite loop",
      sender: sender?.attendee_name,
      sender_id: senderAccountId,
      timestamp: new Date().toISOString(),
    });
  }

  // Respond immediately
  res.status(200).json({
    status: "received",
    message: "Webhook received and processing initiated.",
    timestamp: new Date().toISOString(),
  });

  try {
    // Process the message (simulate AI response)
    const replyMessage = await processLinkedInQuery(chat_id, message);
    console.log(`Generated reply: ${replyMessage}`);

    // Send reply using Unipile
    console.log("Attempting to send reply via Unipile...");
    const sentMessageId = await sendUnipileMessage(chat_id, replyMessage);

    if (sentMessageId) {
      console.log(`✅ Successfully sent reply! Message ID: ${sentMessageId}`);
    } else {
      console.log("❌ Failed to send reply");
    }
  } catch (error) {
    console.error("Error processing webhook:", error);
  }
});

// Function to send message via Unipile
async function sendUnipileMessage(chat_id, text) {
  try {
    console.log(`Sending message to chat_id: ${chat_id}`);
    console.log(`Message text: ${text}`);

    const messagePayload = {
      chat_id,
      text,
      account_id: ACCOUNT_ID,
    };

    console.log("Message payload:", JSON.stringify(messagePayload, null, 2));

    const response = await client.messaging.sendMessage(messagePayload);
    console.log("Unipile response:", JSON.stringify(response, null, 2));

    if (response && response.message_id) {
      return response.message_id;
    } else {
      console.warn("No message_id in response:", response);
      return null;
    }
  } catch (error) {
    console.error("Error sending Unipile message:", error);

    // Log more details about the error
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    if (error.body) {
      try {
        const errorText = await error.body.text();
        console.error("Error body:", errorText);
      } catch (bodyError) {
        console.error("Could not read error body:", bodyError);
      }
    }
    return null;
  }
}

app.get(async (req, res) => {
  res.send("LinkedIN Route is working...");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
