process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { ApiError } = require("../src/utils/apiError");
const { signAccessToken } = require("../src/utils/jwt");
const templateService = require("../src/services/template.service");

jest.mock("../src/services/template.service", () => ({
  deleteTemplate: jest.fn(),
  getTemplate: jest.fn(),
  listTemplates: jest.fn(),
  saveTemplate: jest.fn(),
  updateTemplate: jest.fn(),
}));

const owner = {
  _id: new mongoose.Types.ObjectId(),
  email: "owner@example.com",
  role: "user",
};
const ownerToken = signAccessToken(owner);
const templateId = new mongoose.Types.ObjectId().toString();
const anotherTemplateId = new mongoose.Types.ObjectId().toString();
const templateValues = {
  category: "technology",
  subject: "Application for {{jobRole}} at {{companyName}}",
  body: "Hello {{hrName}}, I am interested in the {{jobRole}} role at {{companyName}}.",
};

describe("Email template APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/email-templates");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates or replaces a category template for the authenticated user", async () => {
    const template = { _id: templateId, ...templateValues };
    templateService.saveTemplate.mockResolvedValue(template);

    const response = await request(app)
      .put("/api/email-templates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(templateValues);

    expect(response.status).toBe(200);
    expect(templateService.saveTemplate).toHaveBeenCalledWith(
      owner._id.toString(),
      "technology",
      templateValues,
    );
    expect(response.body.data.template).toEqual(template);
  });

  it("lists only the authenticated user's templates", async () => {
    templateService.listTemplates.mockResolvedValue([
      { _id: templateId, ...templateValues },
    ]);

    const response = await request(app)
      .get("/api/email-templates")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(templateService.listTemplates).toHaveBeenCalledWith(
      owner._id.toString(),
    );
  });

  it("gets an owned template", async () => {
    templateService.getTemplate.mockResolvedValue({
      _id: templateId,
      ...templateValues,
    });

    const response = await request(app)
      .get(`/api/email-templates/${templateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(templateService.getTemplate).toHaveBeenCalledWith(
      owner._id.toString(),
      templateId,
    );
  });

  it("rejects access to another user's template", async () => {
    templateService.getTemplate.mockRejectedValue(
      new ApiError(404, "Email template not found", "TEMPLATE_NOT_FOUND"),
    );

    const response = await request(app)
      .get(`/api/email-templates/${anotherTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TEMPLATE_NOT_FOUND");
  });

  it("updates an owned template", async () => {
    templateService.updateTemplate.mockResolvedValue({
      _id: templateId,
      ...templateValues,
      subject: "Updated subject",
    });

    const response = await request(app)
      .patch(`/api/email-templates/${templateId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ subject: "Updated subject" });

    expect(response.status).toBe(200);
    expect(templateService.updateTemplate).toHaveBeenCalledWith(
      owner._id.toString(),
      templateId,
      { subject: "Updated subject" },
    );
  });

  it("rejects updates to another user's template", async () => {
    templateService.updateTemplate.mockRejectedValue(
      new ApiError(404, "Email template not found", "TEMPLATE_NOT_FOUND"),
    );

    const response = await request(app)
      .patch(`/api/email-templates/${anotherTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ subject: "Updated subject" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TEMPLATE_NOT_FOUND");
    expect(templateService.updateTemplate).toHaveBeenCalledWith(
      owner._id.toString(),
      anotherTemplateId,
      { subject: "Updated subject" },
    );
  });

  it("deletes an owned template", async () => {
    templateService.deleteTemplate.mockResolvedValue(undefined);

    const response = await request(app)
      .delete(`/api/email-templates/${templateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(templateService.deleteTemplate).toHaveBeenCalledWith(
      owner._id.toString(),
      templateId,
    );
  });

  it("rejects deletion of another user's template", async () => {
    templateService.deleteTemplate.mockRejectedValue(
      new ApiError(404, "Email template not found", "TEMPLATE_NOT_FOUND"),
    );

    const response = await request(app)
      .delete(`/api/email-templates/${anotherTemplateId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("TEMPLATE_NOT_FOUND");
  });

  it("returns a conflict when the category already exists", async () => {
    templateService.saveTemplate.mockRejectedValue({
      code: 11000,
      message: "duplicate key",
    });

    const response = await request(app)
      .put("/api/email-templates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(templateValues);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DUPLICATE_RECORD");
  });

  it("rejects invalid category, subject, and body values", async () => {
    const response = await request(app)
      .put("/api/email-templates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ category: "unknown", subject: " ", body: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(templateService.saveTemplate).not.toHaveBeenCalled();
  });

  it("rejects malformed template IDs", async () => {
    const response = await request(app)
      .get("/api/email-templates/not-an-id")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(templateService.getTemplate).not.toHaveBeenCalled();
  });
});
