process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { ApiError } = require("../src/utils/apiError");
const { signAccessToken } = require("../src/utils/jwt");
const applicationService = require("../src/services/application.service");

jest.mock("../src/services/application.service", () => ({
  createApplication: jest.fn(),
  deleteApplication: jest.fn(),
  exportApplications: jest.fn(),
  getApplication: jest.fn(),
  listApplications: jest.fn(),
  updateApplication: jest.fn(),
}));

const ownedUser = {
  _id: new mongoose.Types.ObjectId(),
  email: "owner@example.com",
  role: "user",
};
const ownedToken = signAccessToken(ownedUser);
const applicationId = new mongoose.Types.ObjectId().toString();
const anotherApplicationId = new mongoose.Types.ObjectId().toString();

const validApplication = {
  companyName: "Example Inc.",
  jobRole: "Backend Engineer",
  hrEmail: "hr@example.com",
  category: "technology",
  status: "saved",
};

describe("Application APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated access", async () => {
    const response = await request(app).get("/api/applications");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("creates an application for the authenticated user", async () => {
    const created = { _id: applicationId, ...validApplication };
    applicationService.createApplication.mockResolvedValue(created);

    const response = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${ownedToken}`)
      .send(validApplication);

    expect(response.status).toBe(201);
    expect(applicationService.createApplication).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      validApplication,
    );
    expect(response.body.data.application).toEqual(created);
  });

  it("lists only applications for the authenticated user", async () => {
    applicationService.listApplications.mockResolvedValue({
      items: [{ _id: applicationId, ...validApplication }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });

    const response = await request(app)
      .get(
        "/api/applications?page=1&limit=20&status=saved&category=technology&search=Example&sortBy=companyName&sortOrder=asc",
      )
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(applicationService.listApplications).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      expect.objectContaining({
        page: "1",
        limit: "20",
        status: "saved",
        category: "technology",
        search: "Example",
        sortBy: "companyName",
        sortOrder: "asc",
      }),
    );
  });

  it("gets an owned application", async () => {
    applicationService.getApplication.mockResolvedValue({
      _id: applicationId,
      ...validApplication,
    });

    const response = await request(app)
      .get(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(applicationService.getApplication).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      applicationId,
    );
  });

  it("rejects access to another user's application", async () => {
    applicationService.getApplication.mockRejectedValue(
      new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND"),
    );

    const response = await request(app)
      .get(`/api/applications/${anotherApplicationId}`)
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("APPLICATION_NOT_FOUND");
  });

  it("updates an owned application", async () => {
    const updated = {
      _id: applicationId,
      ...validApplication,
      status: "applied",
    };
    applicationService.updateApplication.mockResolvedValue(updated);

    const response = await request(app)
      .patch(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${ownedToken}`)
      .send({ status: "applied" });

    expect(response.status).toBe(200);
    expect(applicationService.updateApplication).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      applicationId,
      { status: "applied" },
    );
  });

  it("deletes an owned application", async () => {
    applicationService.deleteApplication.mockResolvedValue(undefined);

    const response = await request(app)
      .delete(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(applicationService.deleteApplication).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      applicationId,
    );
  });

  it("rejects unauthenticated CSV and XLSX exports", async () => {
    const csvResponse = await request(app).get(
      "/api/applications/export?format=csv",
    );
    const xlsxResponse = await request(app).get(
      "/api/applications/export?format=xlsx",
    );

    expect(csvResponse.status).toBe(401);
    expect(xlsxResponse.status).toBe(401);
  });

  it("exports CSV with authentication and active filters", async () => {
    applicationService.exportApplications.mockResolvedValue({
      contentType: "text/csv; charset=utf-8",
      fileName: "jobpilot-applications.csv",
      data: '"Company","Job Role"\n"Example Inc.","Backend Engineer"',
    });

    const response = await request(app)
      .get(
        "/api/applications/export?format=csv&status=saved&category=technology&sortBy=companyName&sortOrder=desc",
      )
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(applicationService.exportApplications).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      expect.objectContaining({
        format: "csv",
        status: "saved",
        category: "technology",
        sortBy: "companyName",
        sortOrder: "desc",
      }),
      "csv",
    );
  });

  it("exports XLSX with authentication", async () => {
    applicationService.exportApplications.mockResolvedValue({
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: "jobpilot-applications.xlsx",
      data: Buffer.from("xlsx"),
    });

    const response = await request(app)
      .get("/api/applications/export?format=xlsx")
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });
});
