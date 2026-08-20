import asyncHandler from "express-async-handler";
import PYQ from "../models/PYQ.js";
import StudyMaterial from "../models/StudyMaterial.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import Bookmark from "../models/Bookmark.js";
import Todo from "../models/Todo.js";
import ExtractionBatch from "../models/ExtractionBatch.js";

// ---------- PYQs (filter-based, no vector search - as decided) ----------

// @desc  Search PYQs by filters (max possible combinations: subject/branch/semester/year/examType)
// @route GET /api/student/pyqs
// @access Private/Student
export const searchPYQs = asyncHandler(async (req, res) => {
  const { subject, branch, semester, year, examType } = req.query;
  const filter = { isVisible: { $ne: false } };
  if (subject) filter.subject = new RegExp(subject, "i");
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (year) filter.year = Number(year);
  if (examType) filter.examType = examType;

  const pyqs = await PYQ.find(filter).sort({ year: -1 }).limit(100);
  res.json({ count: pyqs.length, pyqs });
});

// ---------- Study resources (filter-based) ----------

// @desc  Browse study material by filters
// @route GET /api/student/study-material
// @access Private/Student
export const browseStudyMaterial = asyncHandler(async (req, res) => {
  const { subject, branch, semester, type } = req.query;
  const filter = { isVisible: { $ne: false } };
  if (subject) filter.subject = new RegExp(subject, "i");
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (type) filter.type = type;

  const items = await StudyMaterial.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ count: items.length, items });
});

// ---------- Assignments (view only, filtered to student's own branch/sem by default) ----------

// @desc  View assignments, filterable by branch/semester/subject
// @route GET /api/student/assignments
// @access Private/Student
export const viewAssignments = asyncHandler(async (req, res) => {
  const { branch, semester, subject } = req.query;
  const filter = { isVisible: { $ne: false } };
  // no filters -> show everything; branch/semester/subject narrow it down
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (subject) filter.subject = new RegExp(subject, "i");

  const assignments = await Assignment.find(filter).sort({ dueDate: 1 });
  res.json({ count: assignments.length, assignments });
});

// ---------- Announcements feed ----------

// @desc  Announcements feed (audience: all or students)
// @route GET /api/student/announcements
// @access Private/Student
export const getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await Announcement.find({ audience: { $in: ["all", "students"] }, isVisible: { $ne: false } })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(announcements);
});

// ---------- Notifications feed (policy updates) ----------

// @desc  Notifications/policy feed, optional category filter
// @route GET /api/student/notifications
// @access Private/Student
export const getNotifications = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = { isVisible: { $ne: false } };
  if (category) filter.category = category;
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json(notifications);
});

// ---------- Result PDFs (browse the original uploaded PDFs, not just structured data) ----------

// @desc  List every posted result PDF (deduplicated by source file), so
//        students can browse/open the original document directly - separate
//        from the structured filter/NL query modes.
// @route GET /api/student/results/pdfs
// @access Private/Student
export const getResultPDFs = asyncHandler(async (req, res) => {
  const { branch, semester, year } = req.query;
  const filter = { status: "completed" };
  if (branch) filter.branch = branch;
  if (semester) filter.semester = Number(semester);
  if (year) filter.year = Number(year);

  const batches = await ExtractionBatch.find(filter).sort({ createdAt: -1 });

  const seen = new Map();
  for (const b of batches) {
    if (!seen.has(b.sourcePdfUrl)) {
      seen.set(b.sourcePdfUrl, {
        fileUrl: b.sourcePdfUrl,
        branch: b.branch,
        semester: b.semester,
        year: b.year,
        postedAt: b.createdAt,
      });
    }
  }

  res.json({ pdfs: Array.from(seen.values()) });
});

// ---------- Bookmarks ----------

// @desc  Bookmark an item (pyq/study_material/announcement/notification)
// @route POST /api/student/bookmarks
// @access Private/Student
export const addBookmark = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;
  if (!itemType || !itemId) {
    res.status(400);
    throw new Error("itemType and itemId are required");
  }
  const bookmark = await Bookmark.findOneAndUpdate(
    { user: req.user._id, itemType, itemId },
    { user: req.user._id, itemType, itemId },
    { upsert: true, new: true }
  );
  res.status(201).json(bookmark);
});

// @desc  List logged-in student's bookmarks, with the actual bookmarked
//        content resolved (not just the raw itemType/itemId reference) so
//        the frontend can show a title and a link, grouped by type.
// @route GET /api/student/bookmarks
// @access Private/Student
const BOOKMARK_MODELS = {
  pyq: PYQ,
  study_material: StudyMaterial,
  announcement: Announcement,
  notification: Notification,
};

export const getBookmarks = asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ user: req.user._id }).sort({ createdAt: -1 });

  const resolved = await Promise.all(
    bookmarks.map(async (b) => {
      const Model = BOOKMARK_MODELS[b.itemType];
      const item = Model ? await Model.findById(b.itemId) : null;
      return {
        bookmarkId: b._id,
        itemType: b.itemType,
        itemId: b.itemId,
        savedAt: b.createdAt,
        item, // null if the original content was deleted since bookmarking
      };
    })
  );

  res.json(resolved);
});

// @desc  Remove a bookmark
// @route DELETE /api/student/bookmarks/:id
// @access Private/Student
export const removeBookmark = asyncHandler(async (req, res) => {
  const bookmark = await Bookmark.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!bookmark) {
    res.status(404);
    throw new Error("Bookmark not found");
  }
  res.json({ message: "Bookmark removed" });
});

// ---------- To-Do list (same pattern as teacher's, Todo model is generic by user) ----------

export const createTodo = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400);
    throw new Error("text is required");
  }
  const todo = await Todo.create({ user: req.user._id, text });
  res.status(201).json(todo);
});

export const getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(todos);
});

export const updateTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOne({ _id: req.params.id, user: req.user._id });
  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }
  if (req.body.text !== undefined) todo.text = req.body.text;
  if (req.body.done !== undefined) todo.done = req.body.done;
  await todo.save();
  res.json(todo);
});

export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }
  res.json({ message: "Todo deleted" });
});
