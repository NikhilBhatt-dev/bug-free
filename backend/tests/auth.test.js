process.env.JWT_SECRET = "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const express = require("express");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { authenticate, requireSelf } = require("../src/middleware/auth");
const { errorHandler } = require("../src/middleware/errorHandler");
const { signAccessToken } = require("../src/utils/jwt");

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

  it("rejects malformed tokens", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer malformed-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_INVALID");
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
