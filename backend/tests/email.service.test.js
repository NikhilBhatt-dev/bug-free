process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";

const mongoose = require("mongoose");

jest.mock("../src/models", () => ({
  Application: { findOne: jest.fn() },
  CV: { findOne: jest.fn() },
  EmailTemplate: { findOne: jest.fn() },
  EmailJob: { create: jest.fn(), findOne: jest.fn(), findOneAndUpdate: jest.fn() },
  SentEmail: { countDocuments: jest.fn(), findOne: jest.fn() },
  UserSettings: { findOne: jest.fn(), updateOne: jest.fn() },
}));

const { Application, CV, EmailTemplate, EmailJob, SentEmail, UserSettings } =
  require("../src/models");
const emailService = require("../src/services/email.service");

describe("Email preview and batch service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates a preview with the category-matched CV and rendered placeholders", async () => {
    const applicationId = new mongoose.Types.ObjectId();
    const templateId = new mongoose.Types.ObjectId();
    const cvId = new mongoose.Types.ObjectId();
    Application.findOne.mockResolvedValue({
      _id: applicationId,
      companyName: "Example Inc.",
      jobRole: "Engineer",
      hrEmail: "hr@example.com",
      hrName: "Taylor",
      category: "technology",
    });
    EmailTemplate.findOne.mockResolvedValue({
      _id: templateId,
      subject: "Application for {{jobRole}} at {{companyName}}",
      body: "Hello {{hrName}}.",
    });
    CV.findOne.mockResolvedValue({
      _id: cvId,
      category: "technology",
      cloudinaryPublicId: "cv-123",
      originalFileName: "resume.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 100,
    });

    const preview = await emailService.previewEmail("user-1", {
      applicationId: applicationId.toString(),
    });

    expect(preview.subject).toBe("Application for Engineer at Example Inc.");
    expect(preview.body).toBe("Hello Taylor.");
    expect(preview.selectedCv.cvId).toBe(cvId);
    expect(preview.confirmationToken).toEqual(expect.any(String));
  });

  it("rejects preview when no matching-category CV exists", async () => {
    Application.findOne.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      companyName: "Example Inc.",
      jobRole: "Engineer",
      hrEmail: "hr@example.com",
      hrName: null,
      category: "finance",
    });
    EmailTemplate.findOne.mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      subject: "Application for {{jobRole}}",
      body: "Hello {{hrName}}",
    });
    CV.findOne.mockResolvedValue(null);

    await expect(
      emailService.previewEmail("user-1", {
        applicationId: new mongoose.Types.ObjectId().toString(),
      }),
    ).rejects.toMatchObject({ code: "MATCHING_CV_REQUIRED" });
  });

  it("accepts an immutable confirmed snapshot", async () => {
    const applicationId = new mongoose.Types.ObjectId();
    const templateId = new mongoose.Types.ObjectId();
    const cvId = new mongoose.Types.ObjectId();
    Application.findOne.mockResolvedValue({
      _id: applicationId,
      companyName: "Example Inc.",
      jobRole: "Engineer",
      hrEmail: "hr@example.com",
      category: "technology",
    });
    EmailTemplate.findOne.mockResolvedValue({
      _id: templateId,
      category: "technology",
    });
    CV.findOne.mockResolvedValue({
      _id: cvId,
      category: "technology",
    });

    EmailTemplate.findOne.mockResolvedValue({
      _id: templateId,
      subject: "Application for {{jobRole}}",
      body: "Confirmed body",
      category: "technology",
    });
    const preview = await emailService.previewEmail("user-1", {
      applicationId: applicationId.toString(),
    });
    const snapshot = {
      applicationId: preview.applicationId,
      recipient: preview.recipient,
      subject: preview.subject,
      body: preview.body,
      companyName: preview.companyName,
      jobRole: preview.jobRole,
      hrName: preview.hrName,
      category: preview.category,
      templateId: preview.templateId,
      cvReference: preview.cvReference,
    };

    const confirmed = await emailService.confirmEmail("user-1", {
      snapshot,
      confirmationToken: preview.confirmationToken,
    });
    expect(confirmed.body).toBe("Confirmed body");
  });

  it("rejects batch sizes above 10 and duplicate recipients", async () => {
    await expect(
      emailService.createBatch("user-1", {
        idempotencyKey: "batch-1",
        items: [],
      }),
    ).rejects.toMatchObject({ code: "INVALID_BATCH_SIZE" });
  });
});
