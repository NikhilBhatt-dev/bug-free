const { CV } = require("../models");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const { ApiError } = require("../utils/apiError");

function assertCloudinaryConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(503, "CV storage is not configured", "CV_STORAGE_NOT_CONFIGURED");
  }
}

function assertPdfSignature(file) {
  if (!file?.buffer || file.buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new ApiError(400, "The uploaded file is not a valid PDF", "INVALID_CV_FILE");
  }
}

function uploadPdf(file, userId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "private",
        folder: `jobpilot/${userId}/cvs`,
        filename_override: file.originalname,
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(
            new ApiError(
              502,
              "CV upload could not be completed",
              "CV_UPLOAD_FAILED",
            ),
          );
          return;
        }
        resolve(result);
      },
    );
    stream.end(file.buffer);
  });
}

async function uploadCv(userId, category, file) {
  assertCloudinaryConfigured();
  if (!file) throw new ApiError(400, "A PDF CV file is required", "CV_FILE_REQUIRED");
  assertPdfSignature(file);

  const result = await uploadPdf(file, userId);
  const current = await CV.findOne({ userId, category });
  const values = {
    originalFileName: file.originalname,
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    cloudinaryPublicId: result.public_id,
    secureUrl: result.secure_url,
    version: result.version,
  };

  try {
    const cv = await CV.findOneAndUpdate(
      { userId, category },
      { $set: values, $setOnInsert: { userId, category } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    if (current) {
      await Promise.resolve(
        cloudinary.uploader.destroy(current.cloudinaryPublicId, {
          resource_type: "raw",
          type: "private",
        }),
      ).catch(() => {});
    }
    return cv;
  } catch (error) {
    await Promise.resolve(
      cloudinary.uploader.destroy(result.public_id, {
        resource_type: "raw",
        type: "private",
      }),
    ).catch(() => {});
    throw error;
  }
}

async function listCvs(userId) {
  return CV.find({ userId }).sort({ category: 1 }).lean();
}

async function getCv(userId, cvId) {
  const cv = await CV.findOne({ _id: cvId, userId });
  if (!cv) throw new ApiError(404, "CV not found", "CV_NOT_FOUND");
  return cv;
}

async function getPrivateDownloadUrl(userId, cvId) {
  assertCloudinaryConfigured();
  const cv = await getCv(userId, cvId);
  return cloudinary.utils.private_download_url(cv.cloudinaryPublicId, "pdf", {
    resource_type: "raw",
    type: "private",
    attachment: false,
  });
}

async function deleteCv(userId, cvId) {
  assertCloudinaryConfigured();
  const cv = await getCv(userId, cvId);
  await cloudinary.uploader.destroy(cv.cloudinaryPublicId, { resource_type: "raw", type: "private" });
  await CV.deleteOne({ _id: cv._id, userId });
}

module.exports = { deleteCv, getCv, getPrivateDownloadUrl, listCvs, uploadCv };
