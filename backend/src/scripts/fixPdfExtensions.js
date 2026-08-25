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
// Handles URLs both with and without a version segment. Also decodes
// percent-encoding (Cloudinary encodes spaces/parentheses/etc in the URL,
// e.g. "Resume (2).pdf" -> "Resume%20%282%29" - the actual public_id stored
// in Cloudinary is the decoded form, so renaming with the raw encoded
// string fails with "Resource not found" even though the file exists).
const extractPublicId = (url) => {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Multiple Mongo docs can point at the exact same Cloudinary asset (e.g.
// several ExtractionBatch records sharing one source PDF) - without this
// cache, the first doc's rename would succeed, and every later doc pointing
// at that same original URL would then fail with "Resource not found"
// (it's already been renamed away under the old name). Also caches
// failures, so a genuinely missing asset referenced by several docs only
// logs its error once instead of spamming the same line repeatedly.
const renameCache = new Map(); // publicId -> { url } | { error }

const fixUrl = async (url) => {
  if (!url || url.toLowerCase().endsWith(".pdf")) return { skip: true }; // already fine, nothing to do
  const publicId = extractPublicId(url);
  if (!publicId) return { error: "couldn't parse public_id from URL" };

  if (renameCache.has(publicId)) {
    const cached = renameCache.get(publicId);
    return cached.url ? { url: cached.url } : { error: cached.error, cached: true };
  }

  try {
    const newPublicId = `${publicId}.pdf`;
    const result = await cloudinary.uploader.rename(publicId, newPublicId, {
      resource_type: "raw",
      overwrite: true,
      invalidate: true, // clear any CDN cache for the old (broken) URL
    });
    renameCache.set(publicId, { url: result.secure_url });
    return { url: result.secure_url };
  } catch (err) {
    renameCache.set(publicId, { error: err.message });
    return { error: err.message };
  }
};

// field: the Mongo field on the doc holding the Cloudinary URL
const fixCollection = async (label, Model, field) => {
  const docs = await Model.find({ [field]: { $exists: true, $ne: null } });
  let fixed = 0,
    skipped = 0,
    missing = 0, // asset genuinely doesn't exist on Cloudinary anymore - likely stale/test data, not a bug
    failed = 0;
  for (const doc of docs) {
    const result = await fixUrl(doc[field]);
    if (result.skip) {
      skipped++;
    } else if (result.url) {
      doc[field] = result.url;
      await doc.save();
      fixed++;
    } else if (/not found/i.test(result.error)) {
      if (!result.cached) console.log(`  ! asset missing on Cloudinary (${doc[field]})`);
      missing++;
    } else {
      if (!result.cached) console.log(`  ! failed on ${doc._id}: ${result.error}`);
      failed++;
    }
  }
  console.log(
    `${label}: ${fixed} fixed, ${skipped} already fine, ${missing} missing on Cloudinary, ${failed} other failures (out of ${docs.length})`
  );
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