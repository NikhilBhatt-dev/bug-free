process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { signAccessToken } = require("../src/utils/jwt");
const { Application, SentEmail, EmailJob } = require("../src/models");

jest.mock("../src/models", () => ({
  Application: {
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
  SentEmail: {
    countDocuments: jest.fn(),
  },
  EmailJob: {
    countDocuments: jest.fn(),
  },
}));

const user = {
  _id: new mongoose.Types.ObjectId(),
  email: "owner@example.com",
  role: "user",
};
const token = signAccessToken(user);

describe("Analytics summary API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated analytics access", async () => {
    const response = await request(app).get("/api/analytics/summary");
    expect(response.status).toBe(401);
  });

  it("returns ownership-scoped numerical summary", async () => {
    Application.countDocuments.mockResolvedValue(4);
    Application.aggregate
      .mockResolvedValueOnce([
        { _id: "saved", count: 2 },
        { _id: "applied", count: 2 },
      ])
      .mockResolvedValueOnce([
        { _id: "technology", count: 3 },
        { _id: "design", count: 1 },
      ]);
    SentEmail.countDocuments
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2);
    EmailJob.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);

    const response = await request(app)
      .get("/api/analytics/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.summary).toEqual({
      totalApplications: 4,
      applicationsByStatus: { saved: 2, applied: 2 },
      applicationsByCategory: { technology: 3, design: 1 },
      totalEmailsSent: 6,
      emailsSentToday: 2,
      uncertainEmailJobs: 1,
      failedEmailJobs: 3,
    });
  });
});
