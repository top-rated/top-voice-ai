const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const NodeCache = require("node-cache");
const axios = require("axios");

// Create mocks
jest.mock("axios");
jest.mock("node-cache");

// Mock JWT verify
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockReturnValue({ id: "test-user-id" }),
  sign: jest.fn().mockReturnValue("mocked-token"),
}));

// Import router and middleware
const topVoicesRouter = require("../src/routes/topVoices.routes");
const { verifyToken } = require("../src/middleware/auth.middleware");

// Mock middleware
jest.mock("../src/middleware/auth.middleware", () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  }),
}));

// Mock controller methods
jest.mock("../src/controllers/topVoices.controller", () => ({
  getAllTopVoices: jest.fn((req, res) => {
    return res.status(200).json({
      voices: [
        { id: "voice1", name: "Top Voice 1", followers: 50000 },
        { id: "voice2", name: "Top Voice 2", followers: 40000 },
      ],
    });
  }),
  getTopics: jest.fn((req, res) => {
    return res
      .status(200)
      .json([
        "Technology",
        "Money & Finance",
        "VC & Entrepreneurship",
        "Media",
        "Education",
        "Healthcare",
        "Marketing & Social",
        "Management & Culture",
      ]);
  }),
  getTopVoicesByTopic: jest.fn((req, res) => {
    const topicId = req.params.topicId || "Technology";
    return res.status(200).json({
      topic: topicId,
      voices: [
        { id: "voice1", name: "Top Voice 1", followers: 50000 },
        { id: "voice2", name: "Top Voice 2", followers: 40000 },
      ],
    });
  }),
  getAuthorPosts: jest.fn((req, res) => {
    return res.status(200).json({
      authorId: req.params.authorId,
      posts: [
        { id: "post1", content: "Sample post 1", likes: 500 },
        { id: "post2", content: "Sample post 2", likes: 400 },
      ],
    });
  }),
  getTrendingPosts: jest.fn((req, res) => {
    return res.status(200).json({
      timeframe: req.query.timeframe || "week",
      posts: [
        { id: "trending1", content: "Trending post 1", engagement: 1500 },
        { id: "trending2", content: "Trending post 2", engagement: 1200 },
      ],
    });
  }),
  refreshTopVoicesData: jest.fn((req, res) => {
    return res.status(200).json({
      message: "Top voices data refresh initiated",
      status: "pending",
    });
  }),
}));

// Create Express app and use router
const app = express();
app.use(express.json());
app.use("/api/v1/top-voices", topVoicesRouter);

describe("Top Voices Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/v1/top-voices", () => {
    it("should return all top voices", async () => {
      const response = await request(app).get("/api/v1/top-voices");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("voices");
      expect(Array.isArray(response.body.voices)).toBe(true);
    });
  });

  describe("GET /api/v1/top-voices/topics", () => {
    it("should return available topics", async () => {
      const response = await request(app).get("/api/v1/top-voices/topics");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toContain("Technology");
    });
  });

  describe("GET /api/v1/top-voices/topic/:topicId", () => {
    it("should return top voices for a specific topic", async () => {
      const response = await request(app).get(
        "/api/v1/top-voices/topic/Technology"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("topic", "Technology");
      expect(response.body).toHaveProperty("voices");
      expect(Array.isArray(response.body.voices)).toBe(true);
    });
  });

  describe("GET /api/v1/top-voices/author/:authorId", () => {
    it("should return posts for a specific author", async () => {
      const response = await request(app).get(
        "/api/v1/top-voices/author/voice1"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("authorId", "voice1");
      expect(response.body).toHaveProperty("posts");
      expect(Array.isArray(response.body.posts)).toBe(true);
    });
  });

  describe("GET /api/v1/top-voices/trending", () => {
    it("should return trending posts", async () => {
      const response = await request(app)
        .get("/api/v1/top-voices/trending")
        .query({ timeframe: "week" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("timeframe", "week");
      expect(response.body).toHaveProperty("posts");
      expect(Array.isArray(response.body.posts)).toBe(true);
    });
  });

  describe("GET /api/v1/top-voices/refresh", () => {
    it("should refresh top voices data if authenticated", async () => {
      const response = await request(app)
        .get("/api/v1/top-voices/refresh")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("status", "pending");
      expect(verifyToken).toHaveBeenCalled();
    });
  });
});
