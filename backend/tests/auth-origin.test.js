const cookieParser = require("cookie-parser");
const express = require("express");
const request = require("supertest");
const { errorHandler } = require("../src/middleware/errorHandler");
const { requireSameOrigin } = require("../src/middleware/auth");

const originalNodeEnv = process.env.NODE_ENV;
const originalFrontendUrl = process.env.FRONTEND_URL;

const app = express();
app.use(cookieParser());
app.post("/mutate", requireSameOrigin, (req, res) => {
  res.status(200).json({ success: true });
});
app.use(errorHandler);

describe("production request origin validation", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL = "https://app.example.test";
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
  });

  it("rejects cookie-authenticated mutations with no Origin", async () => {
    const response = await request(app)
      .post("/mutate")
      .set("Cookie", "jobpilot_auth=session-cookie");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORIGIN_REQUIRED");
  });

  it("rejects an untrusted Origin", async () => {
    const response = await request(app)
      .post("/mutate")
      .set("Origin", "https://attacker.example")
      .set("Cookie", "jobpilot_auth=session-cookie");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORIGIN_FORBIDDEN");
  });

  it("accepts a trusted frontend Origin", async () => {
    const response = await request(app)
      .post("/mutate")
      .set("Origin", "https://app.example.test")
      .set("Cookie", "jobpilot_auth=session-cookie");

    expect(response.status).toBe(200);
  });

  it("permits originless non-browser bearer requests", async () => {
    const response = await request(app)
      .post("/mutate")
      .set("Authorization", "Bearer fixture-token");

    expect(response.status).toBe(200);
  });

  it("keeps originless localhost development requests working", async () => {
    process.env.NODE_ENV = "development";

    const response = await request(app)
      .post("/mutate")
      .set("Cookie", "jobpilot_auth=session-cookie");

    expect(response.status).toBe(200);
  });
});
