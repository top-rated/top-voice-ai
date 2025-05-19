const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const NodeCache = require("node-cache");

// Create mocks
jest.mock("node-cache");
jest.mock("jsonwebtoken");

// Mock JWT verify
jwt.sign.mockReturnValue("test-token");
jwt.verify.mockImplementation((token, secret) => {
  return { id: "test-user-id" };
});

// Import router and middleware
let authRouter;
let authController;

// We'll mock the controller here to isolate the routes
jest.mock("../src/controllers/auth.controller", () => ({
  register: jest.fn((req, res) => {
    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: "new-user-id",
        email: req.body.email,
        createdAt: new Date().toISOString(),
      },
      token: "test-token",
    });
  }),
  login: jest.fn((req, res) => {
    return res.status(200).json({
      message: "Login successful",
      user: {
        id: "test-user-id",
        email: req.body.email,
      },
      token: "test-token",
    });
  }),
  verifySubscription: jest.fn((req, res) => {
    return res.status(200).json({
      isSubscribed: true,
      subscription: {
        status: "active",
        plan: "pro",
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
  }),
  handleGumroadWebhook: jest.fn((req, res) => {
    return res.status(200).json({ message: "Webhook received" });
  }),
  getSubscriptionStatus: jest.fn((req, res) => {
    return res.status(200).json({
      isSubscribed: true,
      subscription: {
        status: "active",
        plan: "pro",
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
    });
  }),
}));

// Mock middleware
jest.mock("../src/middleware/auth.middleware", () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  }),
}));

// Setup express app for testing
let app;

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Import the modules fresh for each test to avoid caching issues
    jest.isolateModules(() => {
      authRouter = require("../src/routes/auth.routes");
      authController = require("../src/controllers/auth.controller");
    });

    // Create Express app and use router
    app = express();
    app.use(express.json());
    app.use("/api/v1/auth", authRouter);
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user and return token", async () => {
      const response = await request(app).post("/api/v1/auth/register").send({
        email: "newuser@example.com",
        password: "Password123!",
        name: "New User",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe("newuser@example.com");
      expect(authController.register).toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login a user and return token", async () => {
      const response = await request(app).post("/api/v1/auth/login").send({
        email: "existing@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(authController.login).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/auth/verify-subscription", () => {
    it("should verify subscription if authenticated", async () => {
      const response = await request(app)
        .get("/api/v1/auth/verify-subscription")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isSubscribed", true);
      expect(response.body).toHaveProperty("subscription");
      expect(response.body.subscription).toHaveProperty("status", "active");
      expect(authController.verifySubscription).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/auth/subscription-status", () => {
    it("should return subscription status if authenticated", async () => {
      const response = await request(app)
        .get("/api/v1/auth/subscription-status")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isSubscribed", true);
      expect(response.body).toHaveProperty("subscription");
      expect(response.body.subscription).toHaveProperty("status", "active");
      expect(authController.getSubscriptionStatus).toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/auth/gumroad-webhook", () => {
    it("should handle Gumroad webhook", async () => {
      const response = await request(app)
        .post("/api/v1/auth/gumroad-webhook")
        .send({
          product_id: "test-product",
          email: "user@example.com",
          status: "active",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Webhook received");
      expect(authController.handleGumroadWebhook).toHaveBeenCalled();
    });
  });
});
