import cloudinary from "../config/cloudinary.js";

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary and returns
 * the secure URL. Used for result/notification/announcement/PYQ/material PDFs.
 * @param {Buffer} buffer
 * @param {string} folder  e.g. "results", "pyqs", "study-material"
 * @param {string} filename
 */
export const uploadBufferToCloudinary = (buffer, folder, filename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw", // PDFs go up as raw files
        folder: `nit-smart-portal/${folder}`,
        public_id: filename?.replace(/\.pdf$/i, ""),
        // Without this, Cloudinary has no way to know this "raw" upload is a
        // PDF (we strip the .pdf extension from public_id above for a
        // cleaner name) - it then serves the file without the correct
        // Content-Type/extension, so browsers try to render the binary PDF
        // bytes as plain text, which shows up as garbled/random characters
        // instead of opening as a readable PDF. Setting format explicitly
        // fixes this regardless of what naming convention public_id uses.
        format: "pdf",
        overwrite: false,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};