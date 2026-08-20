import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { chat } from "../controllers/chatController.js";
import { uploadPdf } from "../middleware/upload.js";
import {
  uploadStudyMaterial,
  getMyStudyMaterial,
  postAssignment,
  getMyAssignments,
  deleteAssignment,
  postAnnouncement,
  uploadPYQ,
  getMyPYQs,
  getMyUploads,
  createTodo,
  getTodos,
  updateTodo,
  deleteTodo,
} from "../controllers/teacherController.js";
import {
  toggleStudyMaterialVisibility,
  toggleAssignmentVisibility,
  toggleAnnouncementVisibility,
  togglePYQVisibility,
} from "../controllers/visibilityController.js";

const router = express.Router();
router.use(protect, authorize("teacher"));

router.post("/chat", chat);

router.post("/study-material", uploadPdf.single("file"), uploadStudyMaterial);
router.get("/study-material", getMyStudyMaterial);
router.patch("/study-material/:id/visibility", toggleStudyMaterialVisibility);

router.post("/assignments", uploadPdf.single("file"), postAssignment);
router.get("/assignments", getMyAssignments);
router.delete("/assignments/:id", deleteAssignment);
router.patch("/assignments/:id/visibility", toggleAssignmentVisibility);

router.post("/announcements", uploadPdf.single("file"), postAnnouncement);
router.patch("/announcements/:id/visibility", toggleAnnouncementVisibility);

router.post("/pyqs", uploadPdf.single("file"), uploadPYQ);
router.get("/pyqs", getMyPYQs);
router.patch("/pyqs/:id/visibility", togglePYQVisibility);

router.get("/my-uploads", getMyUploads);

router.post("/todos", createTodo);
router.get("/todos", getTodos);
router.put("/todos/:id", updateTodo);
router.delete("/todos/:id", deleteTodo);

export default router;
