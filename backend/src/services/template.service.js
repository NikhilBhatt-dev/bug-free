const { EmailTemplate } = require("../models");
const { ApiError } = require("../utils/apiError");

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;

function getPlaceholders(content) {
  return [...content.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]);
}

function renderPlaceholders(content, values) {
  const unresolved = new Set();
  const output = content.replace(PLACEHOLDER_PATTERN, (match, key) => {
    const value = values[key];
    if (value === undefined || value === null || value === "") {
      unresolved.add(key);
      return match;
    }
    return String(value);
  });

  if (unresolved.size) {
    throw new ApiError(
      400,
      `Values are required for: ${[...unresolved].join(", ")}`,
      "PLACEHOLDER_VALUE_REQUIRED",
      { placeholders: [...unresolved] },
    );
  }
  return output;
}

async function listTemplates(userId) {
  return EmailTemplate.find({ userId }).sort({ category: 1 }).lean();
}

async function getTemplate(userId, templateId) {
  const template = await EmailTemplate.findOne({ _id: templateId, userId });
  if (!template) throw new ApiError(404, "Email template not found", "TEMPLATE_NOT_FOUND");
  return template;
}

async function getTemplateForCategory(userId, category) {
  return EmailTemplate.findOne({ userId, category, isActive: true });
}

async function saveTemplate(userId, category, values) {
  return EmailTemplate.findOneAndUpdate(
    { userId, category },
    { $set: values, $setOnInsert: { userId, category } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

async function updateTemplate(userId, templateId, values) {
  const template = await EmailTemplate.findOneAndUpdate(
    { _id: templateId, userId },
    { $set: values },
    { new: true, runValidators: true },
  );
  if (!template) throw new ApiError(404, "Email template not found", "TEMPLATE_NOT_FOUND");
  return template;
}

async function deleteTemplate(userId, templateId) {
  const template = await EmailTemplate.findOneAndDelete({ _id: templateId, userId });
  if (!template) throw new ApiError(404, "Email template not found", "TEMPLATE_NOT_FOUND");
}

module.exports = {
  deleteTemplate,
  getPlaceholders,
  getTemplate,
  getTemplateForCategory,
  listTemplates,
  renderPlaceholders,
  saveTemplate,
  updateTemplate,
};
