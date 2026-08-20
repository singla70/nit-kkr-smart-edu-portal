import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

// @desc  Student self-signup (open, but restricted to the college email domain)
// @route POST /api/auth/student/signup
// @access Public
export const studentSignup = asyncHandler(async (req, res) => {
  const { name, email, password, rollNumber, branch, year } = req.body;

  if (!name || !email || !password || !rollNumber) {
    res.status(400);
    throw new Error("Name, email, password and roll number are required");
  }

  const allowedDomain = process.env.STUDENT_EMAIL_DOMAIN || "nitkkr.ac.in";
  if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
    res.status(400);
    throw new Error(`Only @${allowedDomain} email addresses can sign up`);
  }

  const existing = await User.findOne({ $or: [{ email }, { rollNumber }] });
  if (existing) {
    res.status(400);
    throw new Error("An account with this email or roll number already exists");
  }

  const student = await User.create({
    name,
    email,
    password,
    rollNumber,
    branch,
    year,
    role: "student",
  });

  res.status(201).json({
    _id: student._id,
    name: student.name,
    email: student.email,
    rollNumber: student.rollNumber,
    role: student.role,
    token: generateToken(student._id, "student"),
  });
});

// @desc  Login shared by all 3 roles - role is looked up from the user record,
//        not trusted from the request body, so nobody can log in "as admin"
//        just by claiming the role.
// @route POST /api/auth/login
// @access Public
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    res.status(403);
    throw new Error("This account has been deactivated. Contact admin.");
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    rollNumber: user.rollNumber,
    branch: user.branch,
    token: generateToken(user._id, user.role),
  });
});

// @desc  Get logged-in user's own profile
// @route GET /api/auth/me
// @access Private (any role)
export const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});
