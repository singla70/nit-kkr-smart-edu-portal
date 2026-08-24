// Run once after deploying the unified-content-index change: npm run backfill:content-index
//
// Every Notification/Announcement/Assignment/PYQ/StudyMaterial created going
// forward gets auto-indexed into Pinecone by its controller. But anything
// created BEFORE that change already exists in Mongo with no matching
// vector - so the chat's semantic search would silently never find it. This
// script does a one-time full sync of everything currently in Mongo.
// Safe to re-run any time (upsert = overwrite, not duplicate).
// Side-effect import - loads .env before any other import runs. See
// fixPdfExtensions.js for why this matters (some config modules, like
// cloudinary.js, read process.env eagerly at import time).
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import Assignment from "../models/Assignment.js";
import PYQ from "../models/PYQ.js";
import StudyMaterial from "../models/StudyMaterial.js";
import Result from "../models/Result.js";
import { upsertContentRecords } from "../services/pineconeService.js";
import {
  buildNotificationSummaryText,
  buildAnnouncementSummaryText,
  buildAssignmentSummaryText,
  buildPYQSummaryText,
  buildStudyMaterialSummaryText,
} from "../utils/contentSummaryText.js";
import { buildResultSummaryText } from "../utils/resultSummaryText.js";

// Pinecone's upsertRecords has a request-size limit - batch instead of
// sending everything (or one-record-at-a-time, which is slow) in one call.
const BATCH_SIZE = 50;
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const syncCollection = async (label, docs, type, buildText, buildMetadata) => {
  if (!docs.length) {
    console.log(`${label}: nothing to sync`);
    return;
  }
  const records = docs.map((doc) => ({
    id: `${type}_${doc._id}`,
    type,
    text: buildText(doc),
    metadata: { ...buildMetadata(doc), isVisible: doc.isVisible },
  }));
  for (const batch of chunk(records, BATCH_SIZE)) {
    await upsertContentRecords(batch);
  }
  console.log(`${label}: synced ${records.length}`);
};

const run = async () => {
  await connectDB();

  // Results are the most important one to backfill: any result committed
  // BEFORE the unified-index change was upserted to Pinecone WITHOUT a
  // "type" metadata field. Every query now filters on type="result", so
  // those older vectors were silently invisible to search - re-upserting
  // with the same deterministic id (result_<mongoId>) overwrites them in
  // place with the correct metadata, fixing this without creating duplicates.
  await syncCollection(
    "Results",
    await Result.find(),
    "result",
    buildResultSummaryText,
    (d) => ({ rollNumber: d.rollNumber, branch: d.branch, semester: d.semester })
  );

  await syncCollection(
    "Notifications",
    await Notification.find(),
    "notification",
    buildNotificationSummaryText,
    (d) => ({ category: d.category })
  );

  await syncCollection(
    "Announcements",
    await Announcement.find(),
    "announcement",
    buildAnnouncementSummaryText,
    (d) => ({ audience: d.audience })
  );

  await syncCollection(
    "Assignments",
    await Assignment.find(),
    "assignment",
    buildAssignmentSummaryText,
    (d) => ({ branch: d.branch, semester: d.semester, subject: d.subject })
  );

  await syncCollection(
    "PYQs",
    await PYQ.find(),
    "pyq",
    buildPYQSummaryText,
    (d) => ({ branch: d.branch, semester: d.semester, subject: d.subject, year: d.year })
  );

  await syncCollection(
    "Study material",
    await StudyMaterial.find(),
    "study_material",
    buildStudyMaterialSummaryText,
    (d) => ({ branch: d.branch, semester: d.semester, subject: d.subject })
  );

  console.log("Backfill complete.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});