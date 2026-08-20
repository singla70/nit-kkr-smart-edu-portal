import asyncHandler from "express-async-handler";
import StudyMaterial from "../models/StudyMaterial.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import PYQ from "../models/PYQ.js";

// Generic hide/show toggle, reused for every content type that has
// isVisible. Teachers may only toggle their own content (ownerField
// checked against req.user._id); admins may toggle anything.
const makeToggleHandler = (Model, ownerField) =>
  asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) {
      res.status(404);
      throw new Error("Not found");
    }
    if (req.user.role === "teacher" && ownerField && String(doc[ownerField]) !== String(req.user._id)) {
      res.status(403);
      throw new Error("You can only hide/show your own content");
    }
    doc.isVisible = req.body.isVisible !== undefined ? !!req.body.isVisible : !doc.isVisible;
    await doc.save();
    res.json({ id: doc._id, isVisible: doc.isVisible });
  });

export const toggleStudyMaterialVisibility = makeToggleHandler(StudyMaterial, "uploadedBy");
export const toggleAssignmentVisibility = makeToggleHandler(Assignment, "postedBy");
export const toggleAnnouncementVisibility = makeToggleHandler(Announcement, "postedBy");
export const toggleNotificationVisibility = makeToggleHandler(Notification, null); // admin-only route, no owner check needed
export const togglePYQVisibility = makeToggleHandler(PYQ, "uploadedBy");
