process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { signAccessToken } = require("../src/utils/jwt");
const emailService = require("../src/services/email.service");
const sentEmailService = require("../src/services/sent-email.service");

jest.mock("../src/services/email.service", () => ({
  cancelBatchItems: jest.fn(),
  confirmEmail: jest.fn(),
  createBatch: jest.fn(),
  getBatch: jest.fn(),
  getJob: jest.fn(),
  getSettings: jest.fn(),
  listBatches: jest.fn(),
  previewEmail: jest.fn(),
  updateSettings: jest.fn(),
}));

jest.mock("../src/services/sent-email.service", () => ({
  getSentEmail: jest.fn(),
  listSentEmails: jest.fn(),
}));

const user = {
  _id: new mongoose.Types.ObjectId(),
  email: "owner@example.com",
  role: "user",
};
const token = signAccessToken(user);

describe("Email workflow API authentication", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects unauthenticated preview and batch access", async () => {
    const preview = await request(app)
      .post("/api/email-preview/preview")
      .send({ applicationId: new mongoose.Types.ObjectId().toString() });
    const batches = await request(app).get("/api/email-batches");
    expect(preview.status).toBe(401);
    expect(batches.status).toBe(401);
  });

  it("returns preview results for an authenticated user", async () => {
    emailService.previewEmail.mockResolvedValue({
      recipient: "hr@example.com",
      subject: "Engineer",
      body: "Confirmed body",
      category: "technology",
    });
    const response = await request(app)
      .post("/api/email-preview/preview")
      .set("Authorization", `Bearer ${token}`)
      .send({ applicationId: new mongoose.Types.ObjectId().toString() });
    expect(response.status).toBe(200);
    expect(emailService.previewEmail).toHaveBeenCalledWith(
      user._id.toString(),
      expect.any(Object),
    );
  });

  it("creates a batch and validates ownership through the authenticated user", async () => {
    emailService.createBatch.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      status: "pending",
      items: [{ itemIdempotencyKey: "job-1", status: "pending" }],
    });
    const response = await request(app)
      .post("/api/email-batches")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idempotencyKey: "batch-key",
        items: [{
          snapshot: { applicationId: new mongoose.Types.ObjectId().toString() },
          confirmationToken: "valid",
        }],
      });
    expect(response.status).toBe(201);
  });

  it("reads and updates sending settings", async () => {
    emailService.getSettings.mockResolvedValue({
      emailDelayMs: 30000,
      dailySendingLimit: 20,
      pausedSending: false,
    });
    emailService.updateSettings.mockResolvedValue({
      emailDelayMs: 60000,
      dailySendingLimit: 10,
      pausedSending: false,
    });
    const get = await request(app)
      .get("/api/user-settings/sending")
      .set("Authorization", `Bearer ${token}`);
    const put = await request(app)
      .put("/api/user-settings/sending")
      .set("Authorization", `Bearer ${token}`)
      .send({ emailDelayMs: 60000, dailySendingLimit: 10 });
    expect(get.status).toBe(200);
    expect(put.status).toBe(200);
  });

  it("lists sent history only for the authenticated user", async () => {
    sentEmailService.listSentEmails.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    const response = await request(app)
      .get("/api/sent-emails")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(sentEmailService.listSentEmails).toHaveBeenCalledWith(
      user._id.toString(),
      expect.any(Object),
    );
  });
});
