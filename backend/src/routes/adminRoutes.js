import express from "express";
import {
  createTeacher,
  getTeachers,
  removeTeacher,
  reactivateTeacher,
  permanentlyDeleteTeacher,
  resetTeacherPassword,
} from "../controllers/adminController.js";
import { uploadResultPdf, getExtractionBatches, retryBatches } from "../controllers/resultUploadController.js";
import {
  getPendingResults,
  updatePendingResult,
  toggleVerified,
  rejectPendingResult,
  commitPendingResults,
} from "../controllers/pendingResultController.js";
import {
  uploadNotification,
  getAllNotifications,
  deleteNotification,
  uploadAnnouncementAdmin,
  getAllAnnouncements,
  deleteAnnouncement,
  getResultsAdmin,
  updateResult,
  deleteResult,
  getStudents,
  removeStudent,
  reactivateStudent,
  permanentlyDeleteStudent,
} from "../controllers/adminContentController.js";
import {
  getOverview,
  getContentByDepartment,
  getResultsBreakdown,
  getTrendingSearches,
  getRecentActivity,
} from "../controllers/analyticsController.js";
import {
  toggleStudyMaterialVisibility,
  toggleAssignmentVisibility,
  toggleAnnouncementVisibility,
  toggleNotificationVisibility,
  togglePYQVisibility,
} from "../controllers/visibilityController.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadPdf } from "../middleware/upload.js";

const router = express.Router();

// every route here is admin-only
router.use(protect, authorize("admin"));

router.post("/teachers", createTeacher);
router.get("/teachers", getTeachers);
router.delete("/teachers/:id", removeTeacher);
router.put("/teachers/:id/reactivate", reactivateTeacher);
router.delete("/teachers/:id/permanent", permanentlyDeleteTeacher);
router.put("/teachers/:id/reset-password", resetTeacherPassword);

router.post("/results/upload", uploadPdf.single("file"), uploadResultPdf);
router.get("/results/batches", getExtractionBatches);
router.post("/results/batches/retry", retryBatches);

// Pending (unverified) results - staging area an extraction lands in before
// an admin reviews + commits it into the live Result collection.
router.get("/results/pending", getPendingResults);
router.put("/results/pending/:id", updatePendingResult);
router.patch("/results/pending/:id/verify", toggleVerified);
router.delete("/results/pending/:id", rejectPendingResult);
router.post("/results/pending/commit", commitPendingResults);

// Live/verified results - already committed, editable/deletable directly.
router.get("/results", getResultsAdmin);
router.put("/results/:id", updateResult);
router.delete("/results/:id", deleteResult);

router.post("/notifications", uploadPdf.single("file"), uploadNotification);
router.get("/notifications", getAllNotifications);
router.delete("/notifications/:id", deleteNotification);
router.patch("/notifications/:id/visibility", toggleNotificationVisibility);

router.post("/announcements", uploadPdf.single("file"), uploadAnnouncementAdmin);
router.get("/announcements", getAllAnnouncements);
router.delete("/announcements/:id", deleteAnnouncement);
router.patch("/announcements/:id/visibility", toggleAnnouncementVisibility);

// admin oversight - can hide/show any teacher's content too (per "admin
// manages every resource" decision), reusing the same toggle handlers
router.patch("/study-material/:id/visibility", toggleStudyMaterialVisibility);
router.patch("/assignments/:id/visibility", toggleAssignmentVisibility);
router.patch("/pyqs/:id/visibility", togglePYQVisibility);

router.get("/students", getStudents);
router.delete("/students/:id", removeStudent);
router.put("/students/:id/reactivate", reactivateStudent);
router.delete("/students/:id/permanent", permanentlyDeleteStudent);

router.get("/analytics/overview", getOverview);
router.get("/analytics/content-by-department", getContentByDepartment);
router.get("/analytics/results-breakdown", getResultsBreakdown);
router.get("/analytics/trending-searches", getTrendingSearches);
router.get("/analytics/recent-activity", getRecentActivity);

// TODO (later, lower priority): site settings

export default router;