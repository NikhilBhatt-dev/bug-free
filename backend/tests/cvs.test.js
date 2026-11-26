process.env.JWT_SECRET =
  "test-only-jwt-secret-that-is-not-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");
const { ApiError } = require("../src/utils/apiError");
const { signAccessToken } = require("../src/utils/jwt");
const cvService = require("../src/services/cv.service");

jest.mock("../src/services/cv.service", () => ({
  deleteCv: jest.fn(),
  getPrivateDownloadUrl: jest.fn(),
  listCvs: jest.fn(),
  uploadCv: jest.fn(),
}));

const ownedUser = {
  _id: new mongoose.Types.ObjectId(),
  email: "owner@example.com",
  role: "user",
};
const ownedToken = signAccessToken(ownedUser);
const cvId = new mongoose.Types.ObjectId().toString();
const anotherCvId = new mongoose.Types.ObjectId().toString();

describe("CV APIs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects unauthenticated CV access", async () => {
    const response = await request(app).get("/api/cvs");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTH_REQUIRED");
  });

  it("allows an authenticated PDF upload", async () => {
    const uploaded = {
      _id: cvId,
      userId: ownedUser._id.toString(),
      category: "technology",
      originalFileName: "resume.pdf",
    };
    cvService.uploadCv.mockResolvedValue(uploaded);
    const pdf = Buffer.from("%PDF-1.7\nmock pdf");

    const response = await request(app)
      .post("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`)
      .field("category", "technology")
      .attach("file", pdf, {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(cvService.uploadCv).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      "technology",
      expect.objectContaining({ originalname: "resume.pdf" }),
    );
    expect(response.body.data.cv).toEqual(uploaded);
  });

  it("rejects files larger than 5 MB", async () => {
    const response = await request(app)
      .post("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`)
      .field("category", "technology")
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "large.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CV_FILE_TOO_LARGE");
  });

  it("rejects non-PDF MIME types", async () => {
    const response = await request(app)
      .post("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`)
      .field("category", "technology")
      .attach("file", Buffer.from("not a pdf"), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_CV_FILE");
  });

  it("rejects PDF MIME types with invalid PDF content", async () => {
    cvService.uploadCv.mockRejectedValue(
      new ApiError(400, "The uploaded file is not a valid PDF", "INVALID_CV_FILE"),
    );

    const response = await request(app)
      .post("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`)
      .field("category", "technology")
      .attach("file", Buffer.from("not a pdf"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_CV_FILE");
  });

  it("lists only the authenticated user's CVs", async () => {
    cvService.listCvs.mockResolvedValue([
      { _id: cvId, category: "technology" },
    ]);

    const response = await request(app)
      .get("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(cvService.listCvs).toHaveBeenCalledWith(ownedUser._id.toString());
  });

  it("creates or replaces a CV for the same user and category", async () => {
    const replacement = {
      _id: cvId,
      userId: ownedUser._id,
      category: "technology",
      originalFileName: "replacement.pdf",
    };
    cvService.uploadCv.mockResolvedValue(replacement);

    const response = await request(app)
      .post("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`)
      .field("category", "technology")
      .attach("file", Buffer.from("%PDF-replacement"), {
        filename: "replacement.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(201);
    expect(cvService.uploadCv).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      "technology",
      expect.any(Object),
    );
  });

  it("rejects access to another user's CV", async () => {
    cvService.getPrivateDownloadUrl.mockRejectedValue(
      new ApiError(404, "CV not found", "CV_NOT_FOUND"),
    );

    const response = await request(app)
      .get(`/api/cvs/${anotherCvId}/access`)
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CV_NOT_FOUND");
  });

  it("rejects deletion of another user's CV", async () => {
    cvService.deleteCv.mockRejectedValue(
      new ApiError(404, "CV not found", "CV_NOT_FOUND"),
    );

    const response = await request(app)
      .delete(`/api/cvs/${anotherCvId}`)
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("CV_NOT_FOUND");
  });

  it("allows deletion of an owned CV", async () => {
    cvService.deleteCv.mockResolvedValue(undefined);

    const response = await request(app)
      .delete(`/api/cvs/${cvId}`)
      .set("Authorization", `Bearer ${ownedToken}`);

    expect(response.status).toBe(200);
    expect(cvService.deleteCv).toHaveBeenCalledWith(
      ownedUser._id.toString(),
      cvId,
    );
  });

  it("does not expose Cloudinary configuration failures", async () => {
    cvService.uploadCv.mockRejectedValue(
      new ApiError(
        503,
        "CV storage is not configured",
        "CV_STORAGE_NOT_CONFIGURED",
      ),
    );

    const response = await request(app)
      .post("/api/cvs")
      .set("Authorization", `Bearer ${ownedToken}`)
      .field("category", "technology")
      .attach("file", Buffer.from("%PDF-cloudinary"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: "CV_STORAGE_NOT_CONFIGURED" },
    });
  });
});
