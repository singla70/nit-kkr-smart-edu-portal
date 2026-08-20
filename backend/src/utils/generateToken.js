import jwt from "jsonwebtoken";

// Different expiry per role, as decided: student/teacher 24h, admin 1h (more sensitive access)
const EXPIRY_BY_ROLE = {
  student: process.env.JWT_STUDENT_EXPIRY || "24h",
  teacher: process.env.JWT_TEACHER_EXPIRY || "24h",
  admin: process.env.JWT_ADMIN_EXPIRY || "1h",
};

export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: EXPIRY_BY_ROLE[role] || "24h",
  });
};
