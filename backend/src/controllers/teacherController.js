import asyncHandler from "express-async-handler";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";
import { extractPYQQuestions } from "../services/extractionService.js";
import StudyMaterial from "../models/StudyMaterial.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import PYQ from "../models/PYQ.js";
import Todo from "../models/Todo.js";
import { upsertContentRecords, deleteContentRecords } from "../services/pineconeService.js";
import {
  buildStudyMaterialSummaryText,
  buildAssignmentSummaryText,
  buildAnnouncementSummaryText,
  buildPYQSummaryText,
} from "../utils/contentSummaryText.js";

// ---------- Study material (notes / lab manuals / PYQs are separate below) ----------

// @desc  Upload study material (notes/lab manual)
// @route POST /api/teacher/study-material
// @access Private/Teacher
export const uploadStudyMaterial = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("File is required (field name: file)");
  }
  const { title, type, subject, branch, semester } = req.body;
  if (!title || !subject) {
    res.status(400);
    throw new Error("title and subject are required");
  }

  const fileUrl = await uploadBufferToCloudinary(req.file.buffer, "study-material", req.file.originalname);

  const material = await StudyMaterial.create({
    title,
    type: type || "notes",
    subject,
    branch,
    semester: semester ? Number(semester) : undefined,
    fileUrl,
    uploadedBy: req.user._id,
  });

  await upsertContentRecords([
    {
      id: `study_material_${material._id}`,
      type: "study_material",
      text: buildStudyMaterialSummaryText(material),
      metadata: { branch: material.branch, semester: material.semester, subject: material.subject, isVisible: material.isVisible },
    },
  ]);

  res.status(201).json(material);
});

// @desc  List study material uploaded by the logged-in teacher
// @route GET /api/teacher/study-material
// @access Private/Teacher
export const getMyStudyMaterial = asyncHandler(async (req, res) => {
  const items = await StudyMaterial.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

// ---------- PYQs (was missing an upload route despite the model/search existing) ----------

// @desc  Upload a previous-year question paper
// @route POST /api/teacher/pyqs
// @access Private/Teacher
export const uploadPYQ = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("File is required (field name: file)");
  }
  const { subject, branch, semester, year, examType } = req.body;
  if (!subject || !year) {
    res.status(400);
    throw new Error("subject and year are required");
  }

  const fileUrl = await uploadBufferToCloudinary(req.file.buffer, "pyqs", req.file.originalname);

  // Best-effort - extraction never blocks or fails the upload itself
  const questions = await extractPYQQuestions(req.file.buffer);

  const pyq = await PYQ.create({
    subject,
    branch,
    semester: semester ? Number(semester) : undefined,
    year: Number(year),
    examType: examType || "end",
    fileUrl,
    questions,
    uploadedBy: req.user._id,
  });

  await upsertContentRecords([
    {
      id: `pyq_${pyq._id}`,
      type: "pyq",
      text: buildPYQSummaryText(pyq),
      metadata: { branch: pyq.branch, semester: pyq.semester, subject: pyq.subject, year: pyq.year, isVisible: pyq.isVisible },
    },
  ]);

  res.status(201).json(pyq);
});

// @desc  List PYQs uploaded by the logged-in teacher
// @route GET /api/teacher/pyqs
// @access Private/Teacher
export const getMyPYQs = asyncHandler(async (req, res) => {
  const items = await PYQ.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

// ---------- Assignments ----------

// @desc  Post an assignment (with optional attachment)
// @route POST /api/teacher/assignments
// @access Private/Teacher
export const postAssignment = asyncHandler(async (req, res) => {
  const { title, description, branch, semester, subject, dueDate } = req.body;
  if (!title || !branch || !semester || !subject) {
    res.status(400);
    throw new Error("title, branch, semester and subject are required");
  }

  let attachmentUrl;
  if (req.file) {
    attachmentUrl = await uploadBufferToCloudinary(req.file.buffer, "assignments", req.file.originalname);
  }

  const assignment = await Assignment.create({
    title,
    description,
    attachmentUrl,
    branch,
    semester: Number(semester),
    subject,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    postedBy: req.user._id,
  });

  await upsertContentRecords([
    {
      id: `assignment_${assignment._id}`,
      type: "assignment",
      text: buildAssignmentSummaryText(assignment),
      metadata: { branch: assignment.branch, semester: assignment.semester, subject: assignment.subject, isVisible: assignment.isVisible },
    },
  ]);

  res.status(201).json(assignment);
});

// @desc  List assignments posted by the logged-in teacher
// @route GET /api/teacher/assignments
// @access Private/Teacher
export const getMyAssignments = asyncHandler(async (req, res) => {
  const items = await Assignment.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
  res.json(items);
});

// @desc  Delete an assignment (only the teacher who posted it)
// @route DELETE /api/teacher/assignments/:id
// @access Private/Teacher
export const deleteAssignment = asyncHandler(async (req, res) => {
  const assignment = await Assignment.findOne({ _id: req.params.id, postedBy: req.user._id });
  if (!assignment) {
    res.status(404);
    throw new Error("Assignment not found");
  }
  await assignment.deleteOne();
  await deleteContentRecords(`assignment_${assignment._id}`);
  res.json({ message: "Assignment deleted" });
});

// ---------- Announcements ----------

// @desc  Post an announcement
// @route POST /api/teacher/announcements
// @access Private/Teacher
export const postAnnouncement = asyncHandler(async (req, res) => {
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

  await upsertContentRecords([
    {
      id: `announcement_${announcement._id}`,
      type: "announcement",
      text: buildAnnouncementSummaryText(announcement),
      metadata: { audience: announcement.audience, isVisible: announcement.isVisible },
    },
  ]);

  res.status(201).json(announcement);
});

// ---------- My uploads (unified view across all content types) ----------

// @desc  All content uploaded/posted by the logged-in teacher, across types
// @route GET /api/teacher/my-uploads
// @access Private/Teacher
export const getMyUploads = asyncHandler(async (req, res) => {
  const [studyMaterial, assignments, announcements, pyqs] = await Promise.all([
    StudyMaterial.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 }),
    Assignment.find({ postedBy: req.user._id }).sort({ createdAt: -1 }),
    Announcement.find({ postedBy: req.user._id }).sort({ createdAt: -1 }),
    PYQ.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 }),
  ]);
  res.json({ studyMaterial, assignments, announcements, pyqs });
});

// ---------- To-Do list (personal) ----------

// @desc  Create a todo
// @route POST /api/teacher/todos
// @access Private/Teacher
export const createTodo = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) {
    res.status(400);
    throw new Error("text is required");
  }
  const todo = await Todo.create({ user: req.user._id, text });
  res.status(201).json(todo);
});

// @desc  List logged-in teacher's todos
// @route GET /api/teacher/todos
// @access Private/Teacher
export const getTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(todos);
});

// @desc  Toggle/update a todo (done flag or text)
// @route PUT /api/teacher/todos/:id
// @access Private/Teacher
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

// @desc  Delete a todo
// @route DELETE /api/teacher/todos/:id
// @access Private/Teacher
export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!todo) {
    res.status(404);
    throw new Error("Todo not found");
  }
  res.json({ message: "Todo deleted" });
});