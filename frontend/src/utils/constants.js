export const JOB_CATEGORIES = [
  ["technology", "Technology"],
  ["design", "Design"],
  ["marketing", "Marketing"],
  ["sales", "Sales"],
  ["finance", "Finance"],
  ["operations", "Operations"],
  ["human-resources", "Human Resources"],
  ["other", "Other"],
];

export const APPLICATION_STATUSES = [
  ["saved", "Saved"],
  ["ready", "Ready"],
  ["applied", "Applied"],
  ["interviewing", "Interview"],
  ["offer", "Offer"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
];

export function formatCategory(value) {
  return JOB_CATEGORIES.find(([key]) => key === value)?.[1] || value;
}
