import asyncHandler from "express-async-handler";
import User from "../models/User.js";

// @desc  Admin creates a teacher account (teachers never self-signup)
// @route POST /api/admin/teachers
// @access Private/Admin
export const createTeacher = asyncHandler(async (req, res) => {
  const { name, email, password, department } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error("A user with this email already exists");
  }

  const teacher = await User.create({
    name,
    email,
    password,
    department,
    role: "teacher",
    createdBy: req.user._id,
  });

  res.status(201).json({
    _id: teacher._id,
    name: teacher.name,
    email: teacher.email,
    department: teacher.department,
    role: teacher.role,
  });
});

// @desc  List all teachers
// @route GET /api/admin/teachers
// @access Private/Admin
export const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "teacher" }).select("-password");
  res.json(teachers);
});

// @desc  Remove (deactivate) a teacher
// @route DELETE /api/admin/teachers/:id
// @access Private/Admin
export const removeTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  teacher.isActive = false;
  await teacher.save();
  res.json({ message: "Teacher deactivated" });
});

// @desc  Reactivate a previously deactivated teacher
// @route PUT /api/admin/teachers/:id/reactivate
// @access Private/Admin
export const reactivateTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  teacher.isActive = true;
  await teacher.save();
  res.json({ message: "Teacher reactivated" });
});

// @desc  Permanently delete a teacher account - only allowed once already
//        deactivated (safety rail against deleting an active account by
//        mistake). Content they posted (study material, assignments,
//        announcements, PYQs) is left in place, not cascade-deleted - it
//        stays visible with a missing "posted by" reference rather than
//        silently removing real academic content.
// @route DELETE /api/admin/teachers/:id/permanent
// @access Private/Admin
export const permanentlyDeleteTeacher = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  if (teacher.isActive) {
    res.status(400);
    throw new Error("Deactivate this teacher before permanently deleting them");
  }
  await teacher.deleteOne();
  res.json({ message: "Teacher permanently deleted" });
});

// @desc  Reset a teacher's password
// @route PUT /api/admin/teachers/:id/reset-password
// @access Private/Admin
export const resetTeacherPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    res.status(400);
    throw new Error("newPassword is required");
  }
  const teacher = await User.findOne({ _id: req.params.id, role: "teacher" });
  if (!teacher) {
    res.status(404);
    throw new Error("Teacher not found");
  }
  teacher.password = newPassword; // pre-save hook hashes it
  await teacher.save();
  res.json({ message: "Password reset successfully" });
});

// TODO (next steps): analytics, system overview, site settings.