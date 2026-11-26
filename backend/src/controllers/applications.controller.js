const applicationService = require("../services/application.service");

async function list(req, res) {
  const data = await applicationService.listApplications(req.user.id, req.query);
  res.status(200).json({ success: true, message: "Applications retrieved", data, error: null });
}

async function getOne(req, res) {
  const application = await applicationService.getApplication(req.user.id, req.params.applicationId);
  res.status(200).json({ success: true, message: "Application retrieved", data: { application }, error: null });
}

async function create(req, res) {
  const application = await applicationService.createApplication(req.user.id, req.body);
  res.status(201).json({ success: true, message: "Application created", data: { application }, error: null });
}

async function update(req, res) {
  const application = await applicationService.updateApplication(req.user.id, req.params.applicationId, req.body);
  res.status(200).json({ success: true, message: "Application updated", data: { application }, error: null });
}

async function remove(req, res) {
  await applicationService.deleteApplication(req.user.id, req.params.applicationId);
  res.status(200).json({ success: true, message: "Application permanently deleted", data: null, error: null });
}

async function exportRecords(req, res) {
  const result = await applicationService.exportApplications(req.user.id, req.query, req.query.format);
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.status(200).send(result.data);
}

module.exports = { create, exportRecords, getOne, list, remove, update };
