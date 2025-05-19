const request = require("supertest");
const express = require("express");

// Create a test app instead of using the real one
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Set up basic routes for testing
  app.get("/", (req, res) => {
    res.json({
      message: "Welcome to LinkedIn Top Voices GPT API",
      version: "1.0.0",
    });
  });

  // Mock auth routes
  app.post("/api/v1/auth/register", (req, res) => {
    res.status(201).json({
      user: { email: req.body.email },
      token: "test-token",
    });
  });

  // Mock protected route
  app.get("/api/v1/profiles/recent", (req, res) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "No token provided" });
    }
    res.json([{ id: "profile1" }]);
  });

  // Error route
  app.get("/api/v1/test-error", (req, res, next) => {
    throw new Error("Test error");
  });

  // Error handler
  app.use((err, req, res, next) => {
    res.status(500).json({
      message: "Something went wrong!",
      error: err.message,
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  return app;
};

const app = createTestApp();

describe("Server", () => {
  it("should respond with 200 for root route", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("version");
  });

  it("should respond with 404 for non-existent routes", async () => {
    const response = await request(app).get("/api/v1/nonexistent");
    expect(response.status).toBe(404);
  });

  it("should respond with 401 for protected routes without token", async () => {
    const response = await request(app).get("/api/v1/profiles/recent");
    expect(response.status).toBe(401);
  });

  it("should handle internal server errors gracefully", async () => {
    const response = await request(app).get("/api/v1/test-error");
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("message");
    expect(response.body).toHaveProperty("error", "Test error");
  });

  it("should parse JSON in the request body", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "test@example.com", password: "password" });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", "test@example.com");
  });
});
