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
  verify: jest.fn(),
  sign: jest.fn().mockReturnValue("mocked-token"),
}));

// Import router and middleware
const searchRouter = require("../src/routes/search.routes");
const {
  verifyToken,
  verifySubscription,
} = require("../src/middleware/auth.middleware");

// Mock middleware
jest.mock("../src/middleware/auth.middleware", () => ({
  verifyToken: jest.fn((req, res, next) => {
    req.user = { id: "test-user-id" };
    next();
  }),
  verifySubscription: jest.fn((req, res, next) => {
    req.user.subscription = { status: "active" };
    next();
  }),
}));

// Mock controller methods
jest.mock("../src/controllers/search.controller", () => ({
  searchByKeywords: jest.fn((req, res) => {
    return res.status(202).json({
      message: "Search started",
      searchId: "test-search-id",
      status: "pending",
      estimatedTime: "10 seconds",
    });
  }),
  getSearchResults: jest.fn((req, res) => {
    return res.status(200).json({
      posts: [
        { id: "post1", content: "Test post 1", author: "Test Author 1" },
        { id: "post2", content: "Test post 2", author: "Test Author 2" },
      ],
    });
  }),
  getSearchStatus: jest.fn((req, res) => {
    return res.status(200).json({
      searchId: req.params.searchId,
      status: "completed",
      resultCount: 2,
    });
  }),
  getRecentSearches: jest.fn((req, res) => {
    return res.status(200).json([
      { searchId: "search1", keywords: "marketing", timeframe: "past-24h" },
      { searchId: "search2", keywords: "ai", timeframe: "past-week" },
    ]);
  }),
  deleteSearch: jest.fn((req, res) => {
    return res.status(200).json({ message: "Search deleted successfully" });
  }),
}));

// Create Express app and use router
const app = express();
app.use(express.json());
app.use("/api/v1/search", searchRouter);

describe("Search Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/search/keywords", () => {
    it("should search by keywords and return search ID", async () => {
      const response = await request(app).post("/api/v1/search/keywords").send({
        keywords: "digital marketing",
        timeframe: "past-24h",
      });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty("searchId");
      expect(response.body).toHaveProperty("status", "pending");
      expect(verifyToken).toHaveBeenCalled();
      expect(verifySubscription).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/search/results/:searchId", () => {
    it("should return results for a specific search", async () => {
      const response = await request(app).get(
        "/api/v1/search/results/test-search-id"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("posts");
      expect(Array.isArray(response.body.posts)).toBe(true);
      expect(response.body.posts).toHaveLength(2);
      expect(verifyToken).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/search/recent", () => {
    it("should return recent searches", async () => {
      const response = await request(app).get("/api/v1/search/recent");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(verifyToken).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/v1/search/:searchId", () => {
    it("should delete a search", async () => {
      const response = await request(app).delete(
        "/api/v1/search/test-search-id"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Search deleted successfully"
      );
      expect(verifyToken).toHaveBeenCalled();
    });
  });
});
