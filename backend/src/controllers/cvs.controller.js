const cvService = require("../services/cv.service");

async function list(req, res) {
  const cvs = await cvService.listCvs(req.user.id);
  res.status(200).json({ success: true, message: "CVs retrieved", data: { cvs }, error: null });
}

async function upload(req, res) {
  const cv = await cvService.uploadCv(req.user.id, req.body.category, req.file);
  res.status(201).json({ success: true, message: "CV uploaded", data: { cv }, error: null });
}

async function downloadUrl(req, res) {
  const url = await cvService.getPrivateDownloadUrl(req.user.id, req.params.cvId);
  res.status(200).json({ success: true, message: "Secure CV URL created", data: { url }, error: null });
}

async function remove(req, res) {
  await cvService.deleteCv(req.user.id, req.params.cvId);
  res.status(200).json({ success: true, message: "CV deleted", data: null, error: null });
}

module.exports = { downloadUrl, list, remove, upload };
