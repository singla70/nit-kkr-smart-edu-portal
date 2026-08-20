import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { chat } from "../controllers/chatController.js";
import {
  searchPYQs,
  browseStudyMaterial,
  viewAssignments,
  getAnnouncements,
  getNotifications,
  getResultPDFs,
  addBookmark,
  getBookmarks,
  removeBookmark,
  createTodo,
  getTodos,
  updateTodo,
  deleteTodo,
} from "../controllers/studentContentController.js";

const router = express.Router();
router.use(protect, authorize("student"));

router.post("/chat", chat);

router.get("/pyqs", searchPYQs);
router.get("/study-material", browseStudyMaterial);
router.get("/assignments", viewAssignments);
router.get("/announcements", getAnnouncements);
router.get("/notifications", getNotifications);
router.get("/results/pdfs", getResultPDFs);

router.post("/bookmarks", addBookmark);
router.get("/bookmarks", getBookmarks);
router.delete("/bookmarks/:id", removeBookmark);

router.post("/todos", createTodo);
router.get("/todos", getTodos);
router.put("/todos/:id", updateTodo);
router.delete("/todos/:id", deleteTodo);

export default router;
