const templateService = require("../services/template.service");

async function list(req, res) {
  const templates = await templateService.listTemplates(req.user.id);
  res.status(200).json({ success: true, message: "Email templates retrieved", data: { templates }, error: null });
}

async function getOne(req, res) {
  const template = await templateService.getTemplate(req.user.id, req.params.templateId);
  res.status(200).json({ success: true, message: "Email template retrieved", data: { template }, error: null });
}

async function createOrReplace(req, res) {
  const template = await templateService.saveTemplate(req.user.id, req.body.category, req.body);
  res.status(200).json({ success: true, message: "Email template saved", data: { template }, error: null });
}

async function update(req, res) {
  const template = await templateService.updateTemplate(req.user.id, req.params.templateId, req.body);
  res.status(200).json({ success: true, message: "Email template updated", data: { template }, error: null });
}

async function remove(req, res) {
  await templateService.deleteTemplate(req.user.id, req.params.templateId);
  res.status(200).json({ success: true, message: "Email template deleted", data: null, error: null });
}

module.exports = { createOrReplace, getOne, list, remove, update };
