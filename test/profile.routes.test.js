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
const profileRouter = require("../src/routes/profile.routes");
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
jest.mock("../src/controllers/profile.controller", () => ({
  analyzeProfiles: jest.fn((req, res) => {
    return res.status(202).json({
      message: "Profile analysis started",
      requestId: "test-request-id",
      status: "pending",
      estimatedTime: "15 seconds",
    });
  }),
  getProfilePosts: jest.fn((req, res) => {
    return res.status(200).json({
      profileId: req.params.profileId,
      posts: [
        { id: "post1", content: "Test post 1" },
        { id: "post2", content: "Test post 2" },
      ],
    });
  }),
  getAnalysisStatus: jest.fn((req, res) => {
    return res.status(200).json({
      requestId: req.params.requestId,
      status: "completed",
      results: [
        { url: "https://linkedin.com/in/raheesahmed", status: "success" },
      ],
    });
  }),
  getRecentProfiles: jest.fn((req, res) => {
    return res.status(200).json([
      { profileId: "profile1", name: "Test Profile 1" },
      { profileId: "profile2", name: "Test Profile 2" },
    ]);
  }),
  deleteProfileAnalysis: jest.fn((req, res) => {
    return res
      .status(200)
      .json({ message: "Profile analysis deleted successfully" });
  }),
}));

// Create Express app and use router
const app = express();
app.use(express.json());
app.use("/api/v1/profiles", profileRouter);

describe("Profile Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/v1/profiles/analyze", () => {
    it("should analyze profiles and return request ID", async () => {
      const response = await request(app)
        .post("/api/v1/profiles/analyze")
        .send({
          profileUrls: ["https://linkedin.com/in/test-profile"],
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty("requestId");
      expect(response.body).toHaveProperty("status", "pending");
      expect(verifyToken).toHaveBeenCalled();
      expect(verifySubscription).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/profiles/posts/:profileId", () => {
    it("should return posts for a specific profile", async () => {
      const response = await request(app).get(
        "/api/v1/profiles/posts/test-profile"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("posts");
      expect(response.body.profileId).toBe("test-profile");
      expect(response.body.posts).toHaveLength(2);
      expect(verifyToken).toHaveBeenCalled();
      expect(verifySubscription).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/profiles/status/:requestId", () => {
    it("should return status of a profile analysis request", async () => {
      const response = await request(app).get(
        "/api/v1/profiles/status/test-request-id"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
      expect(response.body.requestId).toBe("test-request-id");
      expect(verifyToken).toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/profiles/recent", () => {
    it("should return recently analyzed profiles", async () => {
      const response = await request(app).get("/api/v1/profiles/recent");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(verifyToken).toHaveBeenCalled();
    });
  });

  describe("DELETE /api/v1/profiles/:profileId", () => {
    it("should delete a profile analysis", async () => {
      const response = await request(app).delete(
        "/api/v1/profiles/test-profile"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "Profile analysis deleted successfully"
      );
      expect(verifyToken).toHaveBeenCalled();
    });
  });
});
