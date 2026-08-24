// Run once after deploying the cloudinaryUpload.js fix: node src/scripts/fixPdfExtensions.js
//
// Every PDF uploaded BEFORE that fix was stored on Cloudinary without a
// ".pdf" extension on its public_id, so Cloudinary served it with the wrong
// Content-Type - browsers then tried to render the raw binary as text,
// showing garbled characters instead of a readable PDF.
//
// Re-uploading each file by hand isn't necessary: Cloudinary's rename API
// can move an asset to a new public_id (here: the same one + ".pdf") without
// touching the file's actual bytes, which is enough to fix the extension and
// therefore the Content-Type Cloudinary serves it with. This script does
// that for every affected URL across all 6 models that store one, then
// updates Mongo with the corrected URL.
//
// Safe to re-run: any URL that already ends in ".pdf" is skipped.
// Loads .env FIRST (side-effect import) - must come before any other import,
// since config/cloudinary.js reads process.env.CLOUDINARY_* eagerly at
// import time (not lazily inside a function like pineconeService.js does).
// A plain `import dotenv from "dotenv"; ...; dotenv.config()` further down
// runs too late: ES module imports are all evaluated before any later
// top-level statement in this file, so cloudinary.js would already have
// read (empty) env vars by the time dotenv.config() got called.
import "dotenv/config";

import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import Notification from "../models/Notification.js";
import Announcement from "../models/Announcement.js";
import Assignment from "../models/Assignment.js";
import PYQ from "../models/PYQ.js";
import StudyMaterial from "../models/StudyMaterial.js";
import ExtractionBatch from "../models/ExtractionBatch.js";

// Pulls the full Cloudinary public_id (folder path included) out of a
// secure_url, e.g.
// ".../raw/upload/v1234567890/nit-smart-portal/results/abc" -> "nit-smart-portal/results/abc"
// Handles URLs both with and without a version segment.
const extractPublicId = (url) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  return match ? match[1] : null;
};

const fixUrl = async (url) => {
  if (!url || url.toLowerCase().endsWith(".pdf")) return null; // already fine, or nothing to fix
  const publicId = extractPublicId(url);
  if (!publicId) {
    console.log(`  ! couldn't parse public_id from: ${url}`);
    return null;
  }
  const newPublicId = `${publicId}.pdf`;
  const result = await cloudinary.uploader.rename(publicId, newPublicId, {
    resource_type: "raw",
    overwrite: true,
    invalidate: true, // clear any CDN cache for the old (broken) URL
  });
  return result.secure_url;
};

// field: the Mongo field on the doc holding the Cloudinary URL
const fixCollection = async (label, Model, field) => {
  const docs = await Model.find({ [field]: { $exists: true, $ne: null } });
  let fixed = 0,
    skipped = 0,
    failed = 0;
  for (const doc of docs) {
    try {
      const newUrl = await fixUrl(doc[field]);
      if (!newUrl) {
        skipped++;
        continue;
      }
      doc[field] = newUrl;
      await doc.save();
      fixed++;
    } catch (err) {
      failed++;
      console.log(`  ! failed on ${doc._id}: ${err.message}`);
    }
  }
  console.log(`${label}: ${fixed} fixed, ${skipped} already fine, ${failed} failed (out of ${docs.length})`);
};

const run = async () => {
  await connectDB();

  await fixCollection("Notifications", Notification, "fileUrl");
  await fixCollection("Announcements", Announcement, "fileUrl");
  await fixCollection("Assignments", Assignment, "attachmentUrl");
  await fixCollection("PYQs", PYQ, "fileUrl");
  await fixCollection("Study material", StudyMaterial, "fileUrl");
  await fixCollection("Result source PDFs (extraction batches)", ExtractionBatch, "sourcePdfUrl");

  console.log("Done. Re-run any time - already-fixed URLs are skipped automatically.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});