const jwt = require("jsonwebtoken");
const {
  verifyToken,
  verifySubscription,
} = require("../src/middleware/auth.middleware");

// Mock JWT
jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {
        authorization: "Bearer valid-token",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe("verifyToken", () => {
    it("should call next() if token is valid", () => {
      jwt.verify.mockImplementation((token, secret) => {
        return { id: "user-123" };
      });

      verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalled();
      expect(req.user).toEqual({ id: "user-123" });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 401 if no token is provided", () => {
      req.headers.authorization = undefined;

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "No token provided" });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is invalid", () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Invalid token" });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("verifySubscription", () => {
    it("should call next() if user has active subscription", () => {
      req.user = {
        hasActiveSubscription: true,
      };

      verifySubscription(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 403 if user has no subscription", () => {
      req.user = {};

      verifySubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "This feature requires a paid subscription",
        subscriptionUrl:
          "https://linkedingpt.gumroad.com/l/subscribe?wanted=true",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should return 403 if subscription is not active", () => {
      req.user = {
        hasActiveSubscription: false,
      };

      verifySubscription(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: "This feature requires a paid subscription",
        subscriptionUrl:
          "https://linkedingpt.gumroad.com/l/subscribe?wanted=true",
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
