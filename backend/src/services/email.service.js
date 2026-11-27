const crypto = require("crypto");
const { Application, CV, EmailTemplate, EmailJob, SentEmail, UserSettings } = require("../models");
const { ApiError } = require("../utils/apiError");
const { renderPlaceholders } = require("./template.service");

const MAX_BATCH_SIZE = 10;
const DAILY_LIMIT = 20;

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function createConfirmationToken(snapshot) {
  const payload = Buffer.from(stableStringify(snapshot), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifyConfirmationToken(snapshot, token) {
  if (typeof token !== "string") return false;
  const [payload, signature, extra] = token.split(".");
  const expectedPayload = Buffer.from(stableStringify(snapshot), "utf8").toString("base64url");
  if (!payload || !signature || extra !== undefined || payload !== expectedPayload) return false;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "")
    .update(payload)
    .digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  return signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

async function previewEmail(userId, input) {
  const application = await Application.findOne({ _id: input.applicationId, userId });
  if (!application) throw new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND");

  let template;
  if (input.templateId) {
    template = await EmailTemplate.findOne({
      _id: input.templateId,
      userId,
      category: application.category,
      isActive: true,
    });
  } else {
    template = await EmailTemplate.findOne({
      userId,
      category: application.category,
      isActive: true,
    });
  }
  if (!template) {
    throw new ApiError(
      404,
      "No active email template exists for this application category",
      "EMAIL_TEMPLATE_NOT_FOUND",
    );
  }

  const cv = await CV.findOne({ userId, category: application.category });
  if (!cv) {
    throw new ApiError(
      400,
      `Upload a CV for the ${application.category} category before previewing this email`,
      "MATCHING_CV_REQUIRED",
      { category: application.category },
    );
  }

  const recipient = String(input.recipient || application.hrEmail).toLowerCase().trim();
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    throw new ApiError(400, "A valid recipient email is required", "INVALID_RECIPIENT");
  }

  const placeholders = {
    companyName: application.companyName,
    jobRole: application.jobRole,
    hrName: input.hrName || application.hrName || "Hiring Team",
  };
  const subject = renderPlaceholders(template.subject, placeholders);
  const body = renderPlaceholders(template.body, placeholders);
  const snapshot = {
    applicationId: application._id.toString(),
    recipient,
    subject,
    body,
    companyName: application.companyName,
    jobRole: application.jobRole,
    hrName: placeholders.hrName,
    category: application.category,
    templateId: template._id.toString(),
    cvReference: {
      cvId: cv._id.toString(),
      cloudinaryPublicId: cv.cloudinaryPublicId,
      originalFileName: cv.originalFileName,
    },
  };

  return {
    ...snapshot,
    selectedCv: {
      cvId: cv._id,
      category: cv.category,
      originalFileName: cv.originalFileName,
      fileSizeBytes: cv.fileSizeBytes,
    },
    attachment: {
      fileName: cv.originalFileName,
      mimeType: cv.mimeType,
      cvId: cv._id,
    },
    confirmationToken: createConfirmationToken(snapshot),
  };
}

async function confirmEmail(userId, input) {
  if (!input.snapshot || !verifyConfirmationToken(input.snapshot, input.confirmationToken)) {
    throw new ApiError(400, "The email confirmation is missing or invalid", "EMAIL_CONFIRMATION_INVALID");
  }
  const application = await Application.findOne({ _id: input.snapshot.applicationId, userId });
  if (!application) throw new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND");
  const cv = await CV.findOne({
    _id: input.snapshot.cvReference.cvId,
    userId,
    category: input.snapshot.category,
  });
  if (!cv) throw new ApiError(400, "The confirmed CV is no longer available", "CONFIRMED_CV_MISSING");
  const template = await EmailTemplate.findOne({
    _id: input.snapshot.templateId,
    userId,
    category: input.snapshot.category,
  });
  if (!template) throw new ApiError(404, "The confirmed template is no longer available", "CONFIRMED_TEMPLATE_MISSING");

  return {
    ...input.snapshot,
    confirmedAt: new Date(),
  };
}

async function countSentToday(userId) {
  const sent = await SentEmail.countDocuments({
    userId,
    sentDateKey: getUtcDateKey(),
    status: "sent",
  });
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const reservedBatches = await EmailJob.find({
    userId,
    createdAt: { $gte: start },
    status: { $in: ["pending", "processing", "paused", "uncertain"] },
  }).lean();
  const reserved = reservedBatches.reduce((total, batch) =>
    total + (batch.items || []).filter((item) =>
      ["pending", "processing", "sending"].includes(item.status),
    ).length,
  0);
  return sent + reserved;
}

async function createBatch(userId, input) {
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > MAX_BATCH_SIZE) {
    throw new ApiError(400, "A batch must contain between 1 and 10 confirmed emails", "INVALID_BATCH_SIZE");
  }
  const applicationIds = new Set();
  const recipients = new Set();
  const items = [];

  for (const item of input.items) {
    if (!item.snapshot || !verifyConfirmationToken(item.snapshot, item.confirmationToken)) {
      throw new ApiError(400, "Every batch item must have a valid confirmation", "EMAIL_CONFIRMATION_INVALID");
    }
    const applicationId = item.snapshot.applicationId;
    const recipient = item.snapshot.recipient;
    if (applicationIds.has(applicationId)) {
      throw new ApiError(409, "Duplicate application submissions are not allowed", "DUPLICATE_APPLICATION");
    }
    if (recipients.has(recipient)) {
      throw new ApiError(409, "Duplicate recipients are not allowed in one batch", "DUPLICATE_RECIPIENT");
    }
    applicationIds.add(applicationId);
    recipients.add(recipient);

    const application = await Application.findOne({ _id: applicationId, userId });
    if (!application) throw new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND");
    const cv = await CV.findOne({
      _id: item.snapshot.cvReference.cvId,
      userId,
      category: item.snapshot.category,
    });
    if (!cv) throw new ApiError(400, "A confirmed CV is missing", "CONFIRMED_CV_MISSING");

    items.push({
      applicationId,
      status: "pending",
      attempts: 0,
      companyName: item.snapshot.companyName,
      jobRole: item.snapshot.jobRole,
      category: item.snapshot.category,
      recipient,
      subject: item.snapshot.subject,
      body: item.snapshot.body,
      cvReference: item.snapshot.cvReference,
      confirmedAt: new Date(),
      itemIdempotencyKey: crypto.createHash("sha256").update(stableStringify(item.snapshot)).digest("hex"),
    });
  }

  const sentToday = await countSentToday(userId);
  if (sentToday + items.length > DAILY_LIMIT) {
    throw new ApiError(
      429,
      "The batch would exceed the 20-email daily limit",
      "DAILY_EMAIL_LIMIT_EXCEEDED",
      { sentToday, limit: DAILY_LIMIT },
    );
  }

  const idempotencyKey = String(input.idempotencyKey || "").trim();
  if (!idempotencyKey || idempotencyKey.length > 128) {
    throw new ApiError(400, "An idempotency key is required", "IDEMPOTENCY_KEY_REQUIRED");
  }
  try {
    const settings = await UserSettings.findOne({ userId }).lean();
    const delayMs = settings?.emailDelayMs || 30000;
    return await EmailJob.create({
      userId,
      items,
      status: "pending",
      delayMs,
      confirmedAt: new Date(),
      nextRunAt: new Date(),
      idempotencyKey,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const existing = await EmailJob.findOne({ userId, idempotencyKey });
      if (existing) return existing;
    }
    throw error;
  }
}

async function listBatches(userId, query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const filter = { userId };
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    EmailJob.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    EmailJob.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getBatch(userId, batchId) {
  const batch = await EmailJob.findOne({ _id: batchId, userId });
  if (!batch) throw new ApiError(404, "Email batch not found", "EMAIL_BATCH_NOT_FOUND");
  return batch;
}

async function getJob(userId, batchId, itemIdempotencyKey) {
  const batch = await EmailJob.findOne({ _id: batchId, userId });
  if (!batch) throw new ApiError(404, "Email batch not found", "EMAIL_BATCH_NOT_FOUND");
  const item = batch.items.find((entry) => entry.itemIdempotencyKey === itemIdempotencyKey);
  if (!item) throw new ApiError(404, "Email job not found", "EMAIL_JOB_NOT_FOUND");
  return { batchId: batch._id, item };
}

async function cancelBatchItems(userId, batchId) {
  const batch = await EmailJob.findOne({ _id: batchId, userId });
  if (!batch) throw new ApiError(404, "Email batch not found", "EMAIL_BATCH_NOT_FOUND");
  if (!["pending", "paused"].includes(batch.status)) {
    throw new ApiError(409, "This batch can no longer be cancelled", "EMAIL_BATCH_NOT_CANCELLABLE");
  }
  batch.status = "cancelled";
  batch.completedAt = new Date();
  batch.items.forEach((item) => {
    if (item.status === "pending") {
      item.status = "skipped";
      item.error = "Cancelled by user";
    }
  });
  await batch.save();
  return batch;
}

async function getSettings(userId) {
  const settings = await UserSettings.findOne({ userId }).lean();
  return {
    dailySendingLimit: Math.min(settings?.dailySendingLimit || 20, DAILY_LIMIT),
    emailDelayMs: settings?.emailDelayMs || 30000,
    timezone: settings?.timezone || "UTC",
    pausedSending: settings?.pausedSending || false,
    pauseReason: settings?.pauseReason || null,
  };
}

async function updateSettings(userId, input) {
  const update = {};
  if (input.emailDelayMs !== undefined) update.emailDelayMs = input.emailDelayMs;
  if (input.timezone !== undefined) update.timezone = input.timezone;
  if (input.dailySendingLimit !== undefined) update.dailySendingLimit = Math.min(input.dailySendingLimit, DAILY_LIMIT);
  if (input.resumeSending === true) {
    update.pausedSending = false;
    update.pauseReason = null;
    update.pausedAt = null;
  }
  await UserSettings.updateOne(
    { userId },
    { $set: update, $setOnInsert: { userId } },
    { upsert: true, runValidators: true },
  );
  if (input.resumeSending === true) {
    await EmailJob.updateMany(
      { userId, status: "paused" },
      { $set: { status: "pending", nextRunAt: new Date(), pauseReason: null, pausedAt: null } },
    );
  }
  return getSettings(userId);
}

module.exports = {
  confirmEmail,
  createBatch,
  cancelBatchItems,
  getBatch,
  getJob,
  getSettings,
  listBatches,
  previewEmail,
  updateSettings,
};
