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

function getCloudinaryFailureDetails(error, reasonOverride) {
  const status = Number(
    error?.http_code ||
      error?.statusCode ||
      error?.status ||
      error?.error?.http_code,
  );
  let reason = reasonOverride || "provider_error";

  if (!reasonOverride) {
    if (status === 401) reason = "authentication_rejected";
    else if (status === 403) reason = "permission_denied";
    else if (status === 400) reason = "upload_rejected";
    else if (status === 429) reason = "rate_limited";
    else if (status >= 500) reason = "provider_unavailable";
    else if (
      ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(
        error?.code,
      )
    ) {
      reason = "network_error";
    }
  }

  return {
    reason,
    ...(Number.isInteger(status) && status >= 100 && status <= 599
      ? { httpStatus: status }
      : {}),
  };
}

function uploadPdf(file, userId) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error, reasonOverride) => {
      if (settled) return;
      settled = true;
      const details = getCloudinaryFailureDetails(error, reasonOverride);
      console.error(
        "Cloudinary CV upload failed",
        details,
      );
      reject(
        new ApiError(
          502,
          "CV upload could not be completed",
          "CV_UPLOAD_FAILED",
          { reason: details.reason },
        ),
      );
    };

    try {
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
            fail(error);
            return;
          }
          if (!result?.public_id || !result?.secure_url || !result?.version) {
            fail(null, "invalid_provider_response");
            return;
          }
          if (settled) return;
          settled = true;
          resolve(result);
        },
      );
      stream.on?.("error", fail);
      stream.end(file.buffer);
    } catch (error) {
      fail(error);
    }
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
