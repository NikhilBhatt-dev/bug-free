const sentEmailService = require("../services/sent-email.service");

async function list(req, res) {
  const data = await sentEmailService.listSentEmails(req.user.id, req.query);
  res.status(200).json({ success: true, message: "Sent emails retrieved", data, error: null });
}

async function getOne(req, res) {
  const sentEmail = await sentEmailService.getSentEmail(req.user.id, req.params.sentEmailId);
  res.status(200).json({ success: true, message: "Sent email retrieved", data: { sentEmail }, error: null });
}

module.exports = { getOne, list };
