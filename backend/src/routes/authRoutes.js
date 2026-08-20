import express from "express";
import { studentSignup, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/student/signup", authLimiter, studentSignup);
router.post("/login", authLimiter, login); // shared by student/teacher/admin - role comes from DB, not the request
router.get("/me", protect, getMe);

export default router;
