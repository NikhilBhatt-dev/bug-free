const { EmailJob, SentEmail, CV, UserSettings } = require("../models");
const gmailService = require("./gmail.service");

let timer = null;
let shuttingDown = false;

function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function isQuotaError(error) {
  return gmailService.isGmailRateLimitError(error);
}

function isAuthorizationError(error) {
  const status = error?.code || error?.response?.status;
  return status === 401 || status === 403 ||
    error?.code === "GMAIL_NOT_CONNECTED";
}

async function pauseForReason(userId, batchId, reason) {
  await Promise.all([
    EmailJob.updateOne(
      { _id: batchId, userId },
      { $set: { status: "paused", pauseReason: reason, pausedAt: new Date(), nextRunAt: null } },
    ),
    UserSettings.updateOne(
      { userId },
      { $set: { pausedSending: true, pauseReason: reason, pausedAt: new Date() } },
      { upsert: true, runValidators: true },
    ),
  ]);
}

async function recoverAfterRestart() {
  await EmailJob.updateMany(
    { status: "processing" },
    {
      $set: {
        status: "uncertain",
        pauseReason: "Server stopped during Gmail processing",
      },
    },
  );
  await EmailJob.updateMany(
    { status: "paused", nextRunAt: { $lte: new Date() } },
    { $set: { status: "pending", nextRunAt: new Date() } },
  );
}

async function processItem(batch, item) {
  const cv = await CV.findOne({
    _id: item.cvReference?.cvId,
    userId: batch.userId,
  });
  if (!cv) {
    item.status = "failed";
    item.error = "The confirmed CV is no longer available";
    item.attempts = (item.attempts || 0) + 1;
    return;
  }

  try {
    const result = await gmailService.sendEmail(batch.userId, {
      recipient: item.recipient,
      subject: item.subject,
      body: item.body,
    }, cv);

    const idempotencyKey = item.itemIdempotencyKey ||
      `${batch._id.toString()}:${item.applicationId.toString()}`;
    let sentEmail = await SentEmail.findOne({
      userId: batch.userId,
      idempotencyKey,
    });
    if (!sentEmail) {
      try {
        sentEmail = await SentEmail.create({
          userId: batch.userId,
          applicationId: item.applicationId,
          emailJobId: batch._id,
          batchId: batch._id,
          recipient: item.recipient,
          subject: item.subject,
          body: item.body,
          companyName: item.companyName,
          jobRole: item.jobRole,
          category: item.category,
          cvReference: item.cvReference,
          status: "sent",
          sentAt: new Date(),
          gmailMessageId: result?.data?.id || null,
          gmailThreadId: result?.data?.threadId || null,
          idempotencyKey,
          sentDateKey: getUtcDateKey(),
        });
      } catch (error) {
        if (error?.code === 11000) {
          sentEmail = await SentEmail.findOne({ userId: batch.userId, idempotencyKey });
        } else {
          item.status = "uncertain";
          item.error = "Gmail accepted the send, but history persistence failed";
          return;
        }
      }
    }
    item.status = "sent";
    item.sentEmailId = sentEmail._id;
    item.error = null;
  } catch (error) {
    if (isQuotaError(error)) {
      item.status = "pending";
      item.error = "Gmail quota or rate limit reached";
      batch._pauseReason = "Gmail quota or rate limit reached";
      return;
    }
    if (isAuthorizationError(error)) {
      item.status = "uncertain";
      item.error = "Gmail authorization was rejected or expired";
      batch._pauseReason = "Gmail authorization is disconnected or expired";
      return;
    }
    item.attempts = (item.attempts || 0) + 1;
    item.status = item.attempts >= 3 ? "failed" : "pending";
    item.error = item.status === "failed"
      ? "Gmail send failed after 3 attempts"
      : "Gmail send failed; retry scheduled";
  }
}

async function processBatch(batch) {
  const settings = await UserSettings.findOne({ userId: batch.userId }).lean();
  if (settings?.pausedSending) {
    batch.status = "paused";
    batch.pauseReason = settings.pauseReason || "Sending is paused";
    batch.pausedAt = new Date();
    await batch.save();
    return;
  }

  const sentToday = await SentEmail.countDocuments({
    userId: batch.userId,
    sentDateKey: getUtcDateKey(),
    status: "sent",
  });
  const limit = Math.min(settings?.dailySendingLimit || 20, 20);

  for (let index = 0; index < batch.items.length; index += 1) {
    if (shuttingDown) break;
    const item = batch.items[index];
    if (item.status !== "pending") continue;
    if (sentToday >= limit) {
      await pauseForReason(
        batch.userId,
        batch._id,
        "The 20-email daily sending limit is reached",
      );
      return;
    }
    await processItem(batch, item);
    if (batch._pauseReason) {
      await pauseForReason(batch.userId, batch._id, batch._pauseReason);
      return;
    }
    await batch.save();
    if (item.status === "sent") sentToday += 1;
    if (index < batch.items.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, batch.delayMs));
    }
  }

  const remaining = batch.items.some((item) => item.status === "pending");
  const failed = batch.items.every((item) => ["sent", "failed", "skipped", "uncertain"].includes(item.status));
  if (remaining) {
    batch.status = "pending";
    batch.nextRunAt = new Date(Date.now() + batch.delayMs);
  } else if (failed) {
    batch.status = batch.items.some((item) => item.status === "uncertain")
      ? "uncertain"
      : "completed";
  } else {
    batch.status = "completed";
  }
  batch.completedAt = remaining ? null : new Date();
  await batch.save();
}

async function workerTick() {
  if (shuttingDown) return;
  const batches = await EmailJob.find({
    status: "pending",
    nextRunAt: { $lte: new Date() },
  }).sort({ createdAt: 1 }).limit(25);

  for (const batch of batches) {
    if (shuttingDown) break;
    const claimed = await EmailJob.findOneAndUpdate(
      { _id: batch._id, status: "pending" },
      { $set: { status: "processing", startedAt: batch.startedAt || new Date() } },
      { new: true },
    );
    if (claimed) await processBatch(claimed);
  }
}

function startWorker() {
  recoverAfterRestart().catch(() => {});
  if (timer) return;
  timer = setInterval(() => {
    workerTick().catch(() => {});
  }, 5000);
  if (timer.unref) timer.unref();
  workerTick().catch(() => {});
}

async function stopWorker() {
  shuttingDown = true;
  if (timer) clearInterval(timer);
  timer = null;
  await EmailJob.updateMany(
    { status: "processing" },
    {
      $set: {
        status: "uncertain",
        pauseReason: "Server stopped during Gmail processing",
      },
    },
  );
}

module.exports = {
  processBatch,
  recoverAfterRestart,
  startWorker,
  stopWorker,
  workerTick,
};
