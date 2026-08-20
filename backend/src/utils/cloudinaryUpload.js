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
