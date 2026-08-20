import asyncHandler from "express-async-handler";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import { upsertResultRecords, deleteResultRecords } from "../services/pineconeService.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";

// ---------- Notifications (policy uploads) ----------

// @desc  Upload a policy notification (with optional PDF)
// @route POST /api/admin/notifications
// @access Private/Admin
export const uploadNotification = asyncHandler(async (req, res) => {
  const { title, category, content } = req.body;
  if (!title) {
    res.status(400);
    throw new Error("title is required");
  }
  let fileUrl;
  if (req.file) {
    fileUrl = await uploadBufferToCloudinary(req.file.buffer, "notifications", req.file.originalname);
  }
  const notification = await Notification.create({
    title,
    category: category || "general",
    content,
    fileUrl,
    postedBy: req.user._id,
  });
  res.status(201).json(notification);
});

// @desc  List all notifications (admin view)
// @route GET /api/admin/notifications
// @access Private/Admin
export const getAllNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find().sort({ createdAt: -1 });
  res.json(notifications);
});

// @desc  Delete a notification
// @route DELETE /api/admin/notifications/:id
// @access Private/Admin
export const deleteNotification = asyncHandler(async (req, res) => {
  const deleted = await Notification.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error("Notification not found");
  }
  res.json({ message: "Notification deleted" });
});

// ---------- Announcements (admin can also post/manage, in addition to teachers) ----------

// @desc  Post an announcement as admin
// @route POST /api/admin/announcements
// @access Private/Admin
export const uploadAnnouncementAdmin = asyncHandler(async (req, res) => {
  const { title, body, audience } = req.body;
  if (!title) {
    res.status(400);
    throw new Error("title is required");
  }
  let fileUrl;
  if (req.file) {
    fileUrl = await uploadBufferToCloudinary(req.file.buffer, "announcements", req.file.originalname);
  }
  const announcement = await Announcement.create({
    title,
    body,
    fileUrl,
    audience: audience || "all",
    postedBy: req.user._id,
  });
  res.status(201).json(announcement);
});

// @desc  List all announcements (admin view, across teachers + admin)
// @route GET /api/admin/announcements
// @access Private/Admin
export const getAllAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 }).populate("postedBy", "name role");
  res.json(announcements);
});

// @desc  Delete any announcement
// @route DELETE /api/admin/announcements/:id
// @access Private/Admin
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const deleted = await Announcement.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error("Announcement not found");
  }
  res.json({ message: "Announcement deleted" });
});

// ---------- Results management ----------

// @desc  Search/list results (same filters as the guest endpoint, but admin can see all + edit/delete)
// @route GET /api/admin/results
// @access Private/Admin
export const getResultsAdmin = asyncHandler(async (req, res) => {
  const { rollNumber, branch, semester, year, examType } = req.query;
  const filter = {};
  if (rollNumber) filter.rollNumber = rollNumber;
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (year) filter.year = Number(year);
  if (examType) filter.examType = examType;

  const results = await Result.find(filter).limit(200).sort({ semester: 1 });
  res.json({ count: results.length, results });
});

// @desc  Edit a result record directly (manual correction)
// @route PUT /api/admin/results/:id
// @access Private/Admin
export const updateResult = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }
  const editable = ["studentName", "branch", "year", "semester", "subjects", "sgpa", "cgpa", "status", "examType", "reappearSubjects"];
  editable.forEach((key) => {
    if (req.body[key] !== undefined) result[key] = req.body[key];
  });
  await result.save();

  // Re-sync Pinecone so a natural-language query never surfaces stale data
  // after a manual correction. Re-uses the same vector id (upsert = overwrite).
  const vectorId = result.pineconeVectorId || `result_${result._id}`;
  if (!result.pineconeVectorId) {
    result.pineconeVectorId = vectorId;
    await result.save();
  }
  await upsertResultRecords([
    {
      id: vectorId,
      text: buildResultSummaryText(result),
      metadata: { rollNumber: result.rollNumber, branch: result.branch, semester: result.semester },
    },
  ]);

  res.json(result);
});

// @desc  Delete a result record
// @route DELETE /api/admin/results/:id
// @access Private/Admin
export const deleteResult = asyncHandler(async (req, res) => {
  const deleted = await Result.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error("Result not found");
  }

  // Clean up the corresponding Pinecone vector too, so a deleted result
  // can never resurface through a semantic natural-language query.
  if (deleted.pineconeVectorId) {
    await deleteResultRecords(deleted.pineconeVectorId);
  }

  res.json({ message: "Result deleted" });
});

// ---------- Student account management ----------

// @desc  List all students
// @route GET /api/admin/students
// @access Private/Admin
export const getStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
  res.json(students);
});

// @desc  Deactivate a student account
// @route DELETE /api/admin/students/:id
// @access Private/Admin
export const removeStudent = asyncHandler(async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: "student" });
  if (!student) {
    res.status(404);
    throw new Error("Student not found");
  }
  student.isActive = false;
  await student.save();
  res.json({ message: "Student deactivated" });
});
