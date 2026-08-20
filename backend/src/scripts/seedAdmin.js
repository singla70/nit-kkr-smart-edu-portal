// Run once: npm run seed:admin
// Creates the single admin account from .env credentials.
import dotenv from "dotenv";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import mongoose from "mongoose";

dotenv.config();

const run = async () => {
  await connectDB();

  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log(`Admin already exists: ${existing.email}`);
    process.exit(0);
  }

  const admin = await User.create({
    name: process.env.ADMIN_NAME || "Super Admin",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    role: "admin",
  });

  console.log(`Admin created: ${admin.email}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
