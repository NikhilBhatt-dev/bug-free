const { SentEmail } = require("../models");
const { ApiError } = require("../utils/apiError");

async function listSentEmails(userId, query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const filter = { userId, status: "sent" };
  if (query.category) filter.category = query.category;
  if (query.applicationId) filter.applicationId = query.applicationId;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { recipient: { $regex: escaped, $options: "i" } },
      { companyName: { $regex: escaped, $options: "i" } },
      { jobRole: { $regex: escaped, $options: "i" } },
      { subject: { $regex: escaped, $options: "i" } },
    ];
  }
  const sortField = query.sortBy === "recipient" ? "recipient" :
    query.sortBy === "companyName" ? "companyName" : "sentAt";
  const sort = { [sortField]: query.sortOrder === "asc" ? 1 : -1, _id: -1 };
  const [items, total] = await Promise.all([
    SentEmail.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    SentEmail.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getSentEmail(userId, sentEmailId) {
  const sentEmail = await SentEmail.findOne({ _id: sentEmailId, userId });
  if (!sentEmail) throw new ApiError(404, "Sent email not found", "SENT_EMAIL_NOT_FOUND");
  return sentEmail;
}

module.exports = { getSentEmail, listSentEmails };
