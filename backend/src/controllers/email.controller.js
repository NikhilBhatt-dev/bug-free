const emailService = require("../services/email.service");

async function preview(req, res) {
  const preview = await emailService.previewEmail(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Email preview generated",
    data: { preview },
    error: null,
  });
}

async function confirm(req, res) {
  const confirmed = await emailService.confirmEmail(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Email confirmed",
    data: { confirmed },
    error: null,
  });
}

async function createBatch(req, res) {
  const batch = await emailService.createBatch(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Email batch created",
    data: { batch, batchId: batch._id, jobIds: batch.items.map((item) => item.itemIdempotencyKey) },
    error: null,
  });
}

async function listBatches(req, res) {
  const data = await emailService.listBatches(req.user.id, req.query);
  res.status(200).json({ success: true, message: "Email batches retrieved", data, error: null });
}

async function getBatch(req, res) {
  const batch = await emailService.getBatch(req.user.id, req.params.batchId);
  res.status(200).json({ success: true, message: "Email batch retrieved", data: { batch }, error: null });
}

async function getJob(req, res) {
  const job = await emailService.getJob(req.user.id, req.params.batchId, req.params.jobKey);
  res.status(200).json({ success: true, message: "Email job retrieved", data: { job }, error: null });
}

async function cancelBatch(req, res) {
  const batch = await emailService.cancelBatchItems(req.user.id, req.params.batchId);
  res.status(200).json({ success: true, message: "Pending email jobs cancelled", data: { batch }, error: null });
}

async function getSettings(req, res) {
  const settings = await emailService.getSettings(req.user.id);
  res.status(200).json({ success: true, message: "Sending settings retrieved", data: { settings }, error: null });
}

async function updateSettings(req, res) {
  const settings = await emailService.updateSettings(req.user.id, req.body);
  res.status(200).json({ success: true, message: "Sending settings updated", data: { settings }, error: null });
}

module.exports = {
  cancelBatch,
  confirm,
  createBatch,
  getBatch,
  getJob,
  getSettings,
  listBatches,
  preview,
  updateSettings,
};
