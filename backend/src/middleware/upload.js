import multer from "multer";

// In-memory storage - files are streamed straight to Cloudinary, never
// touch local disk (important since free hosting disks are ephemeral).
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed"), false);
};

export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
