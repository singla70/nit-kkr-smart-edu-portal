import asyncHandler from "express-async-handler";
import StudyMaterial from "../models/StudyMaterial.js";
import Assignment from "../models/Assignment.js";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import PYQ from "../models/PYQ.js";
import { upsertContentRecords } from "../services/pineconeService.js";
import {
  buildStudyMaterialSummaryText,
  buildAssignmentSummaryText,
  buildAnnouncementSummaryText,
  buildNotificationSummaryText,
  buildPYQSummaryText,
} from "../utils/contentSummaryText.js";

// Per-content-type config: how to build the semantic index record for each
// model, so the toggle handler below can keep Pinecone's isVisible metadata
// in sync with Mongo's - hiding something from the portal must also hide it
// from the chat's semantic search, not just the list views.
const CONTENT_CONFIG = {
  StudyMaterial: {
    type: "study_material",
    buildText: buildStudyMaterialSummaryText,
    metadata: (doc) => ({ branch: doc.branch, semester: doc.semester, subject: doc.subject }),
  },
  Assignment: {
    type: "assignment",
    buildText: buildAssignmentSummaryText,
    metadata: (doc) => ({ branch: doc.branch, semester: doc.semester, subject: doc.subject }),
  },
  Announcement: {
    type: "announcement",
    buildText: buildAnnouncementSummaryText,
    metadata: (doc) => ({ audience: doc.audience }),
  },
  Notification: {
    type: "notification",
    buildText: buildNotificationSummaryText,
    metadata: (doc) => ({ category: doc.category }),
  },
  PYQ: {
    type: "pyq",
    buildText: buildPYQSummaryText,
    metadata: (doc) => ({ branch: doc.branch, semester: doc.semester, subject: doc.subject, year: doc.year }),
  },
};

// Generic hide/show toggle, reused for every content type that has
// isVisible. Teachers may only toggle their own content (ownerField
// checked against req.user._id); admins may toggle anything.
const makeToggleHandler = (Model, ownerField, modelName) =>
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

    // Keep the semantic index's isVisible metadata in sync - re-upsert (not
    // delete) so un-hiding later doesn't need to re-embed from scratch.
    const config = CONTENT_CONFIG[modelName];
    if (config) {
      await upsertContentRecords([
        {
          id: `${config.type}_${doc._id}`,
          type: config.type,
          text: config.buildText(doc),
          metadata: { ...config.metadata(doc), isVisible: doc.isVisible },
        },
      ]);
    }

    res.json({ id: doc._id, isVisible: doc.isVisible });
  });

export const toggleStudyMaterialVisibility = makeToggleHandler(StudyMaterial, "uploadedBy", "StudyMaterial");
export const toggleAssignmentVisibility = makeToggleHandler(Assignment, "postedBy", "Assignment");
export const toggleAnnouncementVisibility = makeToggleHandler(Announcement, "postedBy", "Announcement");
export const toggleNotificationVisibility = makeToggleHandler(Notification, null, "Notification"); // admin-only route, no owner check needed
export const togglePYQVisibility = makeToggleHandler(PYQ, "uploadedBy", "PYQ");