import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Result from "../models/Result.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import Assignment from "../models/Assignment.js";
import PYQ from "../models/PYQ.js";
import StudyMaterial from "../models/StudyMaterial.js";
import ExtractionBatch from "../models/ExtractionBatch.js";
import SearchLog from "../models/SearchLog.js";

// @desc  System-wide counts (System Overview)
// @route GET /api/admin/analytics/overview
// @access Private/Admin
export const getOverview = asyncHandler(async (req, res) => {
  const [
    totalStudents,
    totalTeachers,
    totalResults,
    totalAssignments,
    totalStudyMaterial,
    totalPYQs,
    totalAnnouncements,
    totalNotifications,
    pendingBatches,
    failedBatches,
  ] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "teacher" }),
    Result.countDocuments(),
    Assignment.countDocuments(),
    StudyMaterial.countDocuments(),
    PYQ.countDocuments(),
    Announcement.countDocuments(),
    Notification.countDocuments(),
    ExtractionBatch.countDocuments({ status: { $in: ["pending", "processing"] } }),
    ExtractionBatch.countDocuments({ status: "failed" }),
  ]);

  res.json({
    totalStudents,
    totalTeachers,
    totalResults,
    totalAssignments,
    totalStudyMaterial,
    totalPYQs,
    totalAnnouncements,
    totalNotifications,
    pendingBatches,
    failedBatches,
  });
});

// @desc  Content volume grouped by branch/department, across every content type
// @route GET /api/admin/analytics/content-by-department
// @access Private/Admin
export const getContentByDepartment = asyncHandler(async (req, res) => {
  const groupByBranch = (Model) =>
    Model.aggregate([
      { $group: { _id: { $ifNull: ["$branch", "Unspecified"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

  const [results, assignments, studyMaterial, pyqs] = await Promise.all([
    groupByBranch(Result),
    groupByBranch(Assignment),
    groupByBranch(StudyMaterial),
    groupByBranch(PYQ),
  ]);

  // merge into one branch -> {results, assignments, studyMaterial, pyqs, total} map
  const merged = {};
  const merge = (rows, key) => {
    rows.forEach(({ _id: branch, count }) => {
      merged[branch] = merged[branch] || { branch, results: 0, assignments: 0, studyMaterial: 0, pyqs: 0, total: 0 };
      merged[branch][key] = count;
      merged[branch].total += count;
    });
  };
  merge(results, "results");
  merge(assignments, "assignments");
  merge(studyMaterial, "studyMaterial");
  merge(pyqs, "pyqs");

  const data = Object.values(merged).sort((a, b) => b.total - a.total);
  res.json(data);
});

// @desc  Result pass/fail breakdown by branch
// @route GET /api/admin/analytics/results-breakdown
// @access Private/Admin
export const getResultsBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await Result.aggregate([
    {
      $group: {
        _id: { branch: { $ifNull: ["$branch", "Unspecified"] }, status: "$status" },
        count: { $sum: 1 },
      },
    },
  ]);

  const merged = {};
  breakdown.forEach(({ _id, count }) => {
    const branch = _id.branch;
    merged[branch] = merged[branch] || { branch, pass: 0, fail: 0, withheld: 0 };
    merged[branch][_id.status] = count;
  });

  res.json(Object.values(merged));
});

// @desc  Trending search queries (from result NL queries + unified chat), last 30 days
// @route GET /api/admin/analytics/trending-searches
// @access Private/Admin
export const getTrendingSearches = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const trending = await SearchLog.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $toLower: { $trim: { input: "$queryText" } } },
        count: { $sum: 1 },
        source: { $first: "$source" },
        lastAsked: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);

  res.json(
    trending.map((t) => ({ query: t._id, count: t.count, source: t.source, lastAsked: t.lastAsked }))
  );
});

// @desc  Recent activity feed (latest content across all types, for System Overview)
// @route GET /api/admin/analytics/recent-activity
// @access Private/Admin
export const getRecentActivity = asyncHandler(async (req, res) => {
  const [results, assignments, announcements, batches] = await Promise.all([
    Result.find().sort({ createdAt: -1 }).limit(5).select("rollNumber branch semester createdAt"),
    Assignment.find().sort({ createdAt: -1 }).limit(5).select("title branch createdAt").populate("postedBy", "name"),
    Announcement.find().sort({ createdAt: -1 }).limit(5).select("title createdAt").populate("postedBy", "name"),
    ExtractionBatch.find().sort({ createdAt: -1 }).limit(5).select("status branch semester createdAt"),
  ]);

  const activity = [
    ...results.map((r) => ({
      type: "result",
      label: `Result added: ${r.rollNumber} (${r.branch}, sem ${r.semester})`,
      at: r.createdAt,
    })),
    ...assignments.map((a) => ({
      type: "assignment",
      label: `Assignment posted: "${a.title}" by ${a.postedBy?.name || "unknown"}`,
      at: a.createdAt,
    })),
    ...announcements.map((a) => ({
      type: "announcement",
      label: `Announcement: "${a.title}" by ${a.postedBy?.name || "unknown"}`,
      at: a.createdAt,
    })),
    ...batches.map((b) => ({
      type: "extraction_batch",
      label: `Extraction batch ${b.status}: ${b.branch || "?"} sem ${b.semester || "?"}`,
      at: b.createdAt,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  res.json(activity.slice(0, 15));
});
