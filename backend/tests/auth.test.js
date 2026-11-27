process.env.JWT_SECRET = "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const express = require("express");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { authenticate, requireSelf } = require("../src/middleware/auth");
const { errorHandler } = require("../src/middleware/errorHandler");
const { signAccessToken } = require("../src/utils/jwt");
const { passport } = require("../src/config/passport");

const user = {
  _id: new mongoose.Types.ObjectId(),
  email: "user@example.com",
  role: "user",
};

describe("authentication and authorization", () => {
  const token = signAccessToken(user);

  it("rejects unauthenticated access to the current-user endpoint", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("accepts a valid bearer token without exposing the token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      id: user._id.toString(),
      email: "user@example.com",
      role: "user",
    });
    expect(JSON.stringify(response.body)).not.toContain(token);
  });

  it("clears the auth cookie with matching production cross-site options", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousCookieSecure = process.env.COOKIE_SECURE;
    const previousSameSite = process.env.COOKIE_SAME_SITE;
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SECURE = "false";
    process.env.COOKIE_SAME_SITE = "lax";

    try {
      const response = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      const clearedCookie = response.headers["set-cookie"].find((cookie) =>
        cookie.startsWith("jobpilot_auth="),
      );
      expect(clearedCookie).toContain("Path=/");
      expect(clearedCookie).toContain("HttpOnly");
      expect(clearedCookie).toContain("Secure");
      expect(clearedCookie).toContain("SameSite=None");
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousCookieSecure === undefined)
        delete process.env.COOKIE_SECURE;
      else process.env.COOKIE_SECURE = previousCookieSecure;
      if (previousSameSite === undefined)
        delete process.env.COOKIE_SAME_SITE;
      else process.env.COOKIE_SAME_SITE = previousSameSite;
    }
  });

  it("rejects malformed tokens", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer malformed-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_INVALID");
  });

  it("preserves Google OAuth callback handling without an Origin header", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://app.example.test";
    const authenticateSpy = jest
      .spyOn(passport, "authenticate")
      .mockImplementation(
        (strategy, options, callback) => (req, res) => callback(null, null),
      );

    try {
      const response = await request(app)
        .get("/api/auth/google/callback?state=matching-state")
        .set("Cookie", "jobpilot_oauth_state=matching-state");

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        "https://app.example.test/login?error=google_login_failed",
      );
    } finally {
      authenticateSpy.mockRestore();
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = previousFrontendUrl;
    }
  });

  it("prevents a user from passing another user's id in a protected route", async () => {
    const protectedApp = express();
    protectedApp.get(
      "/users/:userId",
      authenticate,
      requireSelf(),
      (req, res) => {
        res.status(200).json({ success: true });
      },
    );
    protectedApp.use(errorHandler);

    const response = await request(protectedApp)
      .get(`/users/${new mongoose.Types.ObjectId()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("RESOURCE_FORBIDDEN");
  });
});
