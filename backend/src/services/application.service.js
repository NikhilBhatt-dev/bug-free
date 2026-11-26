const ExcelJS = require("exceljs");
const { Application } = require("../models");
const { ApiError } = require("../utils/apiError");

const ALLOWED_SORT_FIELDS = new Set([
  "companyName",
  "jobRole",
  "category",
  "applicationDate",
  "status",
  "createdAt",
]);

function buildApplicationFilter(userId, query) {
  const filter = { userId };
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { companyName: { $regex: escaped, $options: "i" } },
      { jobRole: { $regex: escaped, $options: "i" } },
      { hrEmail: { $regex: escaped, $options: "i" } },
    ];
  }
  return filter;
}

function buildSort(query) {
  const sortField = ALLOWED_SORT_FIELDS.has(query.sortBy) ? query.sortBy : "applicationDate";
  return { [sortField]: query.sortOrder === "asc" ? 1 : -1, _id: -1 };
}

async function listApplications(userId, query) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const filter = buildApplicationFilter(userId, query);
  const [items, total] = await Promise.all([
    Application.find(filter).sort(buildSort(query)).skip((page - 1) * limit).limit(limit).lean(),
    Application.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function getApplication(userId, applicationId) {
  const application = await Application.findOne({ _id: applicationId, userId });
  if (!application) throw new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND");
  return application;
}

async function createApplication(userId, values) {
  return Application.create({ ...values, userId });
}

async function updateApplication(userId, applicationId, values) {
  const application = await Application.findOneAndUpdate(
    { _id: applicationId, userId },
    { $set: values },
    { new: true, runValidators: true },
  );
  if (!application) throw new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND");
  return application;
}

async function deleteApplication(userId, applicationId) {
  const application = await Application.findOneAndDelete({ _id: applicationId, userId });
  if (!application) throw new ApiError(404, "Application not found", "APPLICATION_NOT_FOUND");
}

function toExportRow(application) {
  return {
    Company: application.companyName,
    "Job Role": application.jobRole,
    "HR Email": application.hrEmail,
    "HR Name": application.hrName || "",
    Category: application.category,
    "Application Date": application.applicationDate.toISOString().slice(0, 10),
    Status: application.status,
    Source: application.sourceUrl || "",
    Notes: application.notes || "",
  };
}

function toCsv(rows) {
  if (!rows.length) return "";
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headers = Object.keys(rows[0]);
  return [headers.map(escape).join(","), ...rows.map((row) => headers.map((key) => escape(row[key])).join(","))].join("\n");
}

async function exportApplications(userId, query, format) {
  const applications = await Application.find(buildApplicationFilter(userId, query))
    .sort(buildSort(query))
    .lean();
  const rows = applications.map(toExportRow);

  if (format === "csv") {
    return { contentType: "text/csv; charset=utf-8", fileName: "jobpilot-applications.csv", data: toCsv(rows) };
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Applications");
  sheet.columns = Object.keys(rows[0] || toExportRow({
    companyName: "", jobRole: "", hrEmail: "", category: "", applicationDate: new Date(), status: "",
  })).map((header) => ({ header, key: header, width: Math.min(Math.max(header.length + 4, 18), 42) }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const data = await workbook.xlsx.writeBuffer();
  return {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: "jobpilot-applications.xlsx",
    data,
  };
}

module.exports = {
  createApplication,
  deleteApplication,
  exportApplications,
  getApplication,
  listApplications,
  updateApplication,
};
