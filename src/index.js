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
  res.send(`
    <html>
      <head><title>Payment Successful</title></head>
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1>Thank You!</h1>
        <p>Your payment was successful and your subscription is now active.</p>
        <p><a href="/">Go to Homepage</a></p> 
      </body>
    </html>
  `);
});

app.get("/payment-cancelled", (req, res) => {
  res.send(`
    <html>
      <head><title>Payment Cancelled</title></head>
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h1>Payment Cancelled</h1>
        <p>Your payment process was cancelled. You have not been charged.</p>
        <p>If you'd like to try again, please restart the process from the chatbot.</p>
        <p><a href="/">Go to Homepage</a></p>
      </body>
    </html>
  `);
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

async function sendUnipileMessage(chat_id, text, account_id = null) {
  if (!UNIPILE_BASE_URL || !UNIPILE_ACCESS_TOKEN) {
    console.error(
      "Unipile configuration (UNIPILE_BASE_URL or UNIPILE_ACCESS_TOKEN) is missing from .env file."
    );
    return null; // Return null or throw an error to indicate failure
  }
  try {
    const client = new UnipileClient(UNIPILE_BASE_URL, UNIPILE_ACCESS_TOKEN);

    // Prepare message payload
    const messagePayload = {
      chat_id,
      text,
    };

    // If account_id is provided, add it to the payload for organization accounts
    if (account_id) {
      messagePayload.account_id = account_id;
    }

    const response = await client.messaging.sendMessage(messagePayload);
    console.log(
      "Unipile message sent successfully to chat_id:",
      chat_id,
      "Account ID:",
      account_id || "default",
      "Response:",
      JSON.stringify(response)
    );

    // Check if the response contains a message_id
    if (response && response.message_id) {
      const sentMessageId = response.message_id;
      recentlySentMessageIds.add(sentMessageId);
      console.log(
        `Added message_id ${sentMessageId} to recentlySentMessageIds.`
      );
      // Remove the ID after a timeout (e.g., 60 seconds)
      setTimeout(() => {
        recentlySentMessageIds.delete(sentMessageId);
        console.log(
          `Removed message_id ${sentMessageId} from recentlySentMessageIds after timeout.`
        );
      }, 60000); // 60 seconds
      return sentMessageId; // Return the message ID
    } else {
      console.warn(
        "Unipile sendMessage response did not include a message_id:",
        response
      );
      return null; // Indicate no message_id was found
    }
  } catch (error) {
    console.error(
      "Error sending Unipile message to chat_id:",
      chat_id,
      "Account ID:",
      account_id || "default",
      error
    );
    return null; // Return null or throw
  }
}

//linkedin webhook route with usage limiting
app.post(
  "/api/v1/linked/webhook",
  usageLimitMiddleware({ limit: 5 }),
  async (req, res) => {
    const {
      account_id,
      chat_id,
      message,
      message_id,
      sender,
      subject,
      timestamp,
      account_info,
    } = req.body;

    // Enhanced logging for better debugging including account_info
    console.log(
      `LinkedIn Webhook received - AccountID: ${account_id}, ChatID: ${chat_id}, Message: "${message}", MessageID: ${message_id}, Sender: ${JSON.stringify(
        sender
      )}, AccountInfo: ${JSON.stringify(account_info)}`
    );

    // Return early if essential data is missing
    if (!chat_id || !message) {
      console.warn(
        "LinkedIn webhook missing required data (chat_id or message)"
      );
      return res
        .status(400)
        .json({ status: "error", message: "Missing required parameters" });
    }

    // CRITICAL: Check if this message_id was recently sent by the bot to avoid echo responses
    if (message_id && recentlySentMessageIds.has(message_id)) {
      console.log(
        `Ignoring webhook for recently sent message_id ${message_id} (echo).`
      );
      recentlySentMessageIds.delete(message_id); // Remove it now as it's been processed as an echo
      return res.status(200).json({
        status: "received",
        message: "Webhook for self-sent message (echo) ignored.",
      });
    }

    // Enhanced echo prevention for different account types
    const targetAccountId = process.env.ACCOUNT_ID;
    const targetCompanyId = process.env.COMPANY_MAILBOX_ID; // Should be set to "79109442"

    // Check if sender is our own account (personal profile)
    if (sender && sender.id === targetAccountId) {
      console.log(
        `Ignoring webhook for message from our own personal account ${targetAccountId}.`
      );
      return res.status(200).json({
        status: "received",
        message: "Webhook for self-sent message ignored.",
      });
    }

    // Enhanced check for organization accounts - check if sender is our own company page
    if (sender && sender.attendee_provider_id === targetCompanyId) {
      console.log(
        `Ignoring webhook for message from our own company page ${targetCompanyId}.`
      );
      return res.status(200).json({
        status: "received",
        message: "Webhook for self-sent company message ignored.",
      });
    }

    // Additional check: If this is an organization account and sender matches the company mailbox_id
    if (
      account_info &&
      account_info.feature === "organization" &&
      account_info.mailbox_id &&
      sender &&
      sender.attendee_provider_id === account_info.mailbox_id
    ) {
      console.log(
        `Ignoring webhook: sender ${sender.attendee_provider_id} matches organization mailbox_id ${account_info.mailbox_id}.`
      );
      return res.status(200).json({
        status: "received",
        message: "Webhook for organization self-message ignored.",
      });
    }

    // Check for specific Top-Voice.AI organization case
    if (
      account_info &&
      account_info.feature === "organization" &&
      account_info.name === "Top-Voice.AI" &&
      account_info.mailbox_id === "79109442" &&
      sender &&
      sender.attendee_name === "Top-Voice.AI"
    ) {
      console.log(
        `Ignoring webhook: message from our own Top-Voice.AI organization page.`
      );
      return res.status(200).json({
        status: "received",
        message: "Webhook for Top-Voice.AI self-message ignored.",
      });
    }

    // Check if usage limit was exceeded
    if (req.limitExceededResponse) {
      console.log(
        `Usage limit exceeded for chat_id ${chat_id}, sending limit message`
      );

      try {
        const sentMessageId = await sendUnipileMessage(
          chat_id,
          req.limitExceededResponse,
          account_id
        );
        if (sentMessageId) {
          console.log(
            `Successfully sent limit exceeded message (ID: ${sentMessageId}) for chat_id ${chat_id}`
          );
        }
      } catch (error) {
        console.error(
          `Error sending limit exceeded message to chat_id ${chat_id}:`,
          error
        );
      }

      return; // Don't process further
    }

    // Acknowledge webhook receipt immediately for non-echo messages
    res.status(200).json({
      status: "received",
      message: "Webhook received and processing initiated.",
    });

    try {
      // Add a small delay to avoid rate limiting (50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Process the message with the LinkedIn chatbot
      const fullReplyMessage = await processLinkedInQuery(chat_id, message);
      console.log("Generated reply message:", fullReplyMessage);

      // Check if we have a valid response
      const hasContent =
        typeof fullReplyMessage === "string" &&
        fullReplyMessage.trim().length > 0;

      if (hasContent) {
        console.log(
          `Sending reply to LinkedIn chat_id ${chat_id}: "${fullReplyMessage}"`
        );

        // Use account_id when sending message for organization accounts
        const sentMessageId = await sendUnipileMessage(
          chat_id,
          fullReplyMessage,
          account_id
        );

        if (sentMessageId) {
          console.log(
            `Successfully sent reply (ID: ${sentMessageId}) for chat_id ${chat_id} using account_id ${account_id}.`
          );

          // Track usage after successful message sending (only if not exempt)
          if (req.usageInfo && !req.exemptFromUsage) {
            try {
              const {
                incrementUsage,
              } = require("./storage/subscription.storage");
              await incrementUsage(req.usageInfo.userIdentifier, {
                message: message.substring(0, 100),
                chat_id: chat_id,
                endpoint: req.path,
                method: req.method,
              });
              console.log(`Usage tracked for LinkedIn chat_id ${chat_id}`);
            } catch (error) {
              console.error("Error tracking LinkedIn usage:", error);
            }
          }
        } else {
          console.warn(
            `Message processed but failed to send reply to chat_id ${chat_id}.`
          );
        }
      } else {
        console.log(
          `No reply content generated by processLinkedInQuery for chat_id ${chat_id}.`
        );
      }
    } catch (error) {
      console.error(
        `Error processing LinkedIn webhook for chat_id ${chat_id}:`,
        error
      );
    }
  }
);

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
