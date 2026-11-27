const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const { asyncHandler } = require("../utils/asyncHandler");
const { Application, SentEmail, EmailJob } = require("../models");

const router = express.Router();

router.use(authenticate);

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const [totalApplications, applicationsByStatus, applicationsByCategory, sentEmails, sentToday, uncertainJobs, failedJobs] =
      await Promise.all([
        Application.countDocuments({ userId: req.user.id }),
        Application.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Application.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        SentEmail.countDocuments({ userId: req.user.id, status: "sent" }),
        SentEmail.countDocuments({
          userId: req.user.id,
          status: "sent",
          sentAt: { $gte: start },
        }),
        EmailJob.countDocuments({
          userId: req.user.id,
          "items.status": "uncertain",
        }),
        EmailJob.countDocuments({
          userId: req.user.id,
          "items.status": "failed",
        }),
      ]);

    const byStatus = Object.fromEntries(
      applicationsByStatus.map((item) => [item._id, item.count]),
    );
    const byCategory = Object.fromEntries(
      applicationsByCategory.map((item) => [item._id, item.count]),
    );

    res.status(200).json({
      success: true,
      message: "Analytics summary retrieved",
      data: {
        summary: {
          totalApplications,
          applicationsByStatus: byStatus,
          applicationsByCategory: byCategory,
          totalEmailsSent: sentEmails,
          emailsSentToday: sentToday,
          uncertainEmailJobs: uncertainJobs,
          failedEmailJobs: failedJobs,
        },
      },
      error: null,
    });
  }),
);

module.exports = router;
