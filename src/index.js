require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
const bodyParser = require("body-parser");

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
          "www.googletagmanager.com",
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
app.use(express.raw({ type: "application/json" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" })); // Add support for URL-encoded bodies
app.use(morgan("dev")); // Logging
app.use(bodyParser.json());
// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());
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
  res.redirect("/");
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

// Unipile configuration
const UNIPILE_BASE_URL =
  process.env.UNIPILE_BASE_URL || "https://api1.unipile.com:13153";
const UNIPILE_ACCESS_TOKEN = process.env.UNIPILE_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.ACCOUNT_ID;

// Fallback auto-reply message (used when AI processing fails)
const AUTO_REPLY_MESSAGE = "Thanks! I will be back soon 😊";

// Store processed message IDs to avoid duplicate replies
const processedMessages = new Set();

// Initialize Unipile client
const client = new UnipileClient(UNIPILE_BASE_URL, UNIPILE_ACCESS_TOKEN);

// Helper function to send message via Unipile SDK
async function sendReply(accountId, chatId, message, originalMessageId) {
  try {
    console.log(`🚀 Sending reply to chat ${chatId} for account ${accountId}`);

    const response = await client.messaging.sendMessage({
      account_id: accountId,
      chat_id: chatId,
      text: message,
    });

    console.log(`✅ Reply sent successfully:`, response);
    return response;
  } catch (error) {
    console.error(`❌ Error sending reply:`, {
      message: error.message,
      response: error.response?.data || error.data,
      status: error.response?.status || error.status,
    });
    throw error;
  }
}

// Main webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    console.log("\n🔔 Webhook received!");
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const webhookData = req.body;

    // Extract message details from Unipile webhook format
    const messageId = webhookData.message_id;
    const chatId = webhookData.chat_id;
    const accountId = webhookData.account_id || ACCOUNT_ID;
    const sender = webhookData.sender;
    const messageText = webhookData.message;
    const timestamp = webhookData.timestamp;

    console.log(`📩 Message received:`, {
      messageId,
      chatId,
      accountId,
      sender: sender?.name || sender,
      messageText: messageText?.substring(0, 100) + "...",
      timestamp,
    });

    // Skip if no required data
    if (!messageId || !chatId || !messageText) {
      console.log("⚠️  Missing required data, skipping");
      return res.status(200).json({
        status: "ignored",
        reason: "missing_required_data",
        received: { messageId, chatId, messageText },
      });
    }

    // Avoid replying to our own messages or duplicate processing
    if (processedMessages.has(messageId)) {
      console.log("⚠️  Message already processed, skipping");
      return res
        .status(200)
        .json({ status: "ignored", reason: "already_processed" });
    }

    // Skip if the message is from ourselves (avoid infinite loops)
    if (
      sender?.attendee_name &&
      (sender.attendee_name.toLowerCase().includes("top-voice.ai") ||
        sender.attendee_name.toLowerCase().includes("lisa green") ||
        sender.attendee_provider_id === "79109442")
    ) {
      console.log("⚠️  Message from our own account, skipping");
      return res.status(200).json({ status: "ignored", reason: "own_message" });
    }

    // Also skip if message text matches our auto-reply (additional safety)
    if (messageText && messageText.trim() === AUTO_REPLY_MESSAGE.trim()) {
      console.log("⚠️  Message matches our auto-reply text, skipping");
      return res
        .status(200)
        .json({ status: "ignored", reason: "auto_reply_detected" });
    }

    // Mark message as processed
    processedMessages.add(messageId);

    // Process the query using LinkedIn chatbot and send intelligent reply
    try {
      console.log(`🤖 Processing LinkedIn query with threadId: ${chatId}`);

      // Use processLinkedInQuery to generate intelligent response
      const intelligentResponse = await processLinkedInQuery(
        chatId,
        messageText
      );

      console.log(
        `🧠 Generated response: ${intelligentResponse?.substring(0, 100)}...`
      );

      // Send the intelligent response
      await sendReply(accountId, chatId, intelligentResponse, messageId);

      res.status(200).json({
        status: "success",
        message: "Intelligent reply sent",
        messageId,
        chatId,
        threadId: chatId,
        reply: intelligentResponse?.substring(0, 200) + "...", // Truncate for logging
      });
    } catch (replyError) {
      console.error(
        "❌ Failed to process query or send reply:",
        replyError.message
      );

      // Fallback to auto-reply if AI processing fails
      try {
        console.log("🔄 Falling back to auto-reply due to error");
        await sendReply(accountId, chatId, AUTO_REPLY_MESSAGE, messageId);
        res.status(200).json({
          status: "fallback_success",
          message: "Fallback auto-reply sent due to AI processing error",
          messageId,
          chatId,
          error: replyError.message,
          reply: AUTO_REPLY_MESSAGE,
        });
      } catch (fallbackError) {
        console.error("❌ Even fallback failed:", fallbackError.message);
        res.status(200).json({
          status: "webhook_received",
          error: "failed_to_reply",
          messageId,
          chatId,
          aiError: replyError.message,
          fallbackError: fallbackError.message,
        });
      }
    }
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(200).json({
      status: "error",
      message: error.message,
    });
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down webhook server...");
  process.exit(0);
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
