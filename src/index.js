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
const licenseRoutes = require("./routes/license.routes");
const adminRoutes = require("./routes/admin.routes");
const stripeRoutes = require("./routes/stripe.routes"); // Added Stripe routes

const { processQuery } = require("./chatbot/linkedin_chatbot");

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
const API_PREFIX = "/api/v1"; // Hardcode for now since .env isn't being read properly
console.log(`Registering admin routes at: ${API_PREFIX}/admin`);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/top-voices`, topVoicesRoutes);
app.use(`${API_PREFIX}/profiles`, profileRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/license`, licenseRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/stripe`, stripeRoutes); // Added Stripe routes



// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

// Admin dashboard route
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "admin-dashboard.html"));
});

// Privacy policy route
app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "privacy.html"));
});

// API documentation route
app.get("/api-docs", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "api.html"));
});

// chat route
app.post("/api/v1/chat", async (req, res) => {
  const { threadId, query } = req.body;
  console.log(`Chat request received - ThreadID: ${threadId}, Query: ${query}`);

  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Flush the headers to establish the connection

  // Send initial connection confirmation event
  const initialEvent = { type: "connected", data: "Connection established" };
  res.write(`data: ${JSON.stringify(initialEvent)}\n\n`);
  console.log("SSE connection established, sent initial event");

  try {
    console.log("Calling processQuery function...");
    const stream = await processQuery(threadId, query);
    console.log("Process query returned a stream, beginning iteration...");

    for await (
      const { messages } of stream
    ) {
      let msg = messages[messages?.length - 1];
      if (msg?.content) {
        console.log(msg.content);
        const contentEvent = { type: "content_chunk", data: msg.content };
        res.write(`data: ${JSON.stringify(contentEvent)}\n\n`);
        console.log(`Sent content chunk: ${msg.content}`);
      } else if (msg?.tool_calls?.length > 0) {
        console.log(msg.tool_calls);
        const toolEvent = { type: "tool_invocation", data: msg.tool_calls };
        res.write(`data: ${JSON.stringify(toolEvent)}\n\n`);
        console.log(`Sent tool invocation: ${JSON.stringify(msg.tool_calls)}`);
      } else {
        console.log(msg);
        const unknownEvent = { type: "unknown", data: msg };
        res.write(`data: ${JSON.stringify(unknownEvent)}\n\n`);
        console.log(`Sent unknown event: ${JSON.stringify(msg)}`);
      }
      console.log("-----\n");
      
    }
  } catch (error) {
    console.error("Error during chat processing:", error);
    // Send an error event to the client before closing
    const errorEvent = { type: "error", data: "An error occurred on the server." };
    res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    console.log("Error event sent to client");
  } finally {
    console.log("Ending SSE stream");
    res.end(); // End the SSE stream
  }
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
