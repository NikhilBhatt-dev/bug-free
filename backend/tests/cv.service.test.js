const { ApiError } = require("../src/utils/apiError");

const mockDestroy = jest.fn();
const mockUploadStream = jest.fn();

jest.mock("../src/models", () => ({
  CV: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock("../src/config/cloudinary", () => ({
  isCloudinaryConfigured: jest.fn(() => true),
  cloudinary: {
    uploader: {
      upload_stream: (...args) => mockUploadStream(...args),
      destroy: (...args) => mockDestroy(...args),
    },
  },
}));

const { CV } = require("../src/models");
const cvService = require("../src/services/cv.service");

describe("CV service Cloudinary safety", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadStream.mockReset();
    mockDestroy.mockReset();
  });

  it("does not touch the database when Cloudinary upload fails", async () => {
    mockUploadStream.mockImplementation((options, callback) => ({
      end: jest.fn(() => callback(new Error("provider failure"))),
    }));

    await expect(
      cvService.uploadCv(
        "6b084ad86629da63beb44419",
        "technology",
        {
          buffer: Buffer.from("%PDF-test"),
          originalname: "resume.pdf",
          mimetype: "application/pdf",
          size: 12,
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "CV_UPLOAD_FAILED",
    });

    expect(CV.findOne).not.toHaveBeenCalled();
    expect(CV.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("cleans up a newly uploaded file when the database update fails", async () => {
    mockUploadStream.mockImplementation((options, callback) => ({
      end: jest.fn(() =>
        callback(null, {
          public_id: "new-cv",
          secure_url: "https://example.com/new-cv",
          version: 1,
        }),
      ),
    }));
    CV.findOne.mockResolvedValue(null);
    CV.findOneAndUpdate.mockRejectedValue(new Error("database failure"));

    await expect(
      cvService.uploadCv(
        "6b084ad86629da63beb44419",
        "technology",
        {
          buffer: Buffer.from("%PDF-test"),
          originalname: "resume.pdf",
          mimetype: "application/pdf",
          size: 12,
        },
      ),
    ).rejects.toThrow("database failure");

    expect(mockDestroy).toHaveBeenCalledWith("new-cv", {
      resource_type: "raw",
      type: "private",
    });
  });

  it("replaces the same-category CV and cleans up the previous file", async () => {
    mockUploadStream.mockImplementation((options, callback) => ({
      end: jest.fn(() =>
        callback(null, {
          public_id: "replacement-cv",
          secure_url: "https://example.com/replacement-cv",
          version: 2,
        }),
      ),
    }));
    CV.findOne.mockResolvedValue({
      cloudinaryPublicId: "old-cv",
    });
    CV.findOneAndUpdate.mockResolvedValue({
      _id: "cv-id",
      category: "technology",
      cloudinaryPublicId: "replacement-cv",
    });
    mockDestroy.mockResolvedValue({ result: "ok" });

    const result = await cvService.uploadCv(
      "6b084ad86629da63beb44419",
      "technology",
      {
        buffer: Buffer.from("%PDF-replacement"),
        originalname: "replacement.pdf",
        mimetype: "application/pdf",
        size: 18,
      },
    );

    expect(result.cloudinaryPublicId).toBe("replacement-cv");
    expect(CV.findOneAndUpdate).toHaveBeenCalledWith(
      {
        userId: "6b084ad86629da63beb44419",
        category: "technology",
      },
      expect.objectContaining({
        $set: expect.objectContaining({
          cloudinaryPublicId: "replacement-cv",
        }),
      }),
      expect.objectContaining({ upsert: true }),
    );
    expect(mockDestroy).toHaveBeenCalledWith("old-cv", {
      resource_type: "raw",
      type: "private",
    });
  });

  it("rejects invalid PDF signatures before database or upload work", async () => {
    await expect(
      cvService.uploadCv(
        "6b084ad86629da63beb44419",
        "technology",
        {
          buffer: Buffer.from("not a pdf"),
          originalname: "resume.pdf",
          mimetype: "application/pdf",
          size: 9,
        },
      ),
    ).rejects.toBeInstanceOf(ApiError);

    expect(CV.findOne).not.toHaveBeenCalled();
    expect(CV.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mockUploadStream).not.toHaveBeenCalled();
  });
});
