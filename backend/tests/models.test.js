const mongoose = require("mongoose");
const {
  Application,
  CV,
  EmailJob,
  EmailTemplate,
  SentEmail,
  User,
  UserSettings,
} = require("../src/models");

const userId = new mongoose.Types.ObjectId();
const applicationId = new mongoose.Types.ObjectId();
const cvId = new mongoose.Types.ObjectId();

async function getValidationErrors(document) {
  try {
    await document.validate();
    return null;
  } catch (error) {
    return error.errors;
  }
}

describe("Mongoose model validation and indexes", () => {
  it("validates required User fields and normalizes email", async () => {
    const invalidUser = new User({ displayName: "Missing Email" });
    const invalidUserErrors = await getValidationErrors(invalidUser);
    expect(invalidUserErrors.email).toBeDefined();

    const user = new User({
      googleId: "google-user-id",
      email: "PERSON@EXAMPLE.COM",
      displayName: "Person",
    });
    expect(await getValidationErrors(user)).toBeNull();
    expect(user.email).toBe("person@example.com");
  });

  it("enforces application categories and email validation", async () => {
    const application = new Application({
      userId,
      companyName: "Example Inc.",
      jobRole: "Developer",
      hrEmail: "not-an-email",
      category: "not-a-category",
    });
    const validationErrors = await getValidationErrors(application);

    expect(validationErrors.hrEmail).toBeDefined();
    expect(validationErrors.category).toBeDefined();
  });

  it("declares a unique user/category index for CVs", () => {
    const indexes = CV.schema.indexes();
    const categoryIndex = indexes.find(
      ([fields]) => fields.userId === 1 && fields.category === 1,
    );
    expect(categoryIndex[1].unique).toBe(true);
  });

  it("validates template, sent-email, and job safety bounds", async () => {
    const template = new EmailTemplate({
      userId,
      category: "technology",
      subject: "",
      body: "",
    });
    const templateErrors = await getValidationErrors(template);
    expect(templateErrors.subject).toBeDefined();

    const sentEmail = new SentEmail({
      userId,
      applicationId,
      recipient: "person@example.com",
      subject: "Hello",
      body: "Message",
      cvReference: {
        cvId,
        cloudinaryPublicId: "cv",
        originalFileName: "cv.pdf",
      },
    });
    const sentEmailErrors = await getValidationErrors(sentEmail);
    expect(sentEmailErrors.idempotencyKey).toBeDefined();

    const job = new EmailJob({ userId, items: [], delayMs: 500 });
    const jobErrors = await getValidationErrors(job);
    expect(jobErrors.items).toBeDefined();
    expect(jobErrors.delayMs).toBeDefined();
  });

  it("limits settings to JobPilot's daily cap", async () => {
    const settings = new UserSettings({ userId, dailySendingLimit: 21 });
    const settingsErrors = await getValidationErrors(settings);
    expect(settingsErrors.dailySendingLimit).toBeDefined();
  });
});
