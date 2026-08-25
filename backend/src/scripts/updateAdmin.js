// Run once whenever you change ADMIN_EMAIL / ADMIN_PASSWORD and want the
// existing admin account updated to match: node src/scripts/updateAdmin.js
//
// seedAdmin.js only ever CREATES the admin the first time - if one already
// exists, it exits without touching it, so changing the env vars alone (or
// re-running seed:admin) has no effect on login. This updates the existing
// admin document in place instead. Uses .save() (not updateOne) so the
// User model's pre-save password-hashing hook actually runs.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const run = async () => {
  await connectDB();

  const admin = await User.findOne({ role: "admin" }).select("+password");
  if (!admin) {
    console.log("No admin found - run `npm run seed:admin` instead to create one.");
    process.exit(0);
  }

  console.log(`Current admin: ${admin.email}`);

  if (process.env.ADMIN_NAME) admin.name = process.env.ADMIN_NAME;
  if (process.env.ADMIN_EMAIL) admin.email = process.env.ADMIN_EMAIL;
  if (process.env.ADMIN_PASSWORD) admin.password = process.env.ADMIN_PASSWORD; // pre-save hook hashes this

  await admin.save();

  console.log(`Admin updated: ${admin.email}`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});