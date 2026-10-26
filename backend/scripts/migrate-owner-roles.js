require("dotenv").config();
const mongoose = require("mongoose");
const ownerModel = require("../models/owner-model");
const userModel = require("../models/user-models");
const productModel = require("../models/product-model");

async function migrateOwnerRoles() {
  const adminEmail = String(process.env.PLATFORM_ADMIN_EMAIL || "").trim().toLowerCase();
  if (!adminEmail) {
    throw new Error("Set PLATFORM_ADMIN_EMAIL to the existing platform administrator's email before running this migration.");
  }

  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ecommerce");
  const owners = await ownerModel.find({}).select("_id email role").lean();
  const normalized = owners.map((owner) => ({ ...owner, normalizedEmail: String(owner.email || "").trim().toLowerCase() }));
  if (normalized.some((owner) => !owner.normalizedEmail)) {
    throw new Error("Every existing seller/admin account needs an email before migration. No roles were changed.");
  }
  const duplicateEmails = normalized.filter((owner, index) => normalized.findIndex((other) => other.normalizedEmail === owner.normalizedEmail) !== index);
  if (duplicateEmails.length) {
    throw new Error(`Duplicate seller emails must be resolved before migration: ${[...new Set(duplicateEmails.map((owner) => owner.normalizedEmail))].join(", ")}`);
  }

  const admins = normalized.filter((owner) => owner.normalizedEmail === adminEmail);
  if (admins.length !== 1) {
    throw new Error(`Expected exactly one existing owner account for PLATFORM_ADMIN_EMAIL; found ${admins.length}. No roles were changed.`);
  }
  const customers = await userModel.find({}).select("email").lean();
  const customerEmails = new Set(customers.map((customer) => String(customer.email || "").trim().toLowerCase()).filter(Boolean));
  const crossRoleDuplicates = normalized.filter((owner) => customerEmails.has(owner.normalizedEmail));
  if (crossRoleDuplicates.length) {
    throw new Error(`Resolve emails shared by customer and seller/admin accounts before migration: ${[...new Set(crossRoleDuplicates.map((owner) => owner.normalizedEmail))].join(", ")}`);
  }

  const ownershipCounts = await productModel.aggregate([
    { $group: { _id: "$seller", productCount: { $sum: 1 } } },
  ]);
  for (const owner of normalized) {
    await ownerModel.updateOne({ _id: owner._id }, { $set: { email: owner.normalizedEmail, role: owner._id.equals(admins[0]._id) ? "admin" : "seller" } });
  }

  console.log(`Role migration completed. Platform admin: ${adminEmail}; sellers: ${owners.length - 1}. Product ownership was not changed.`);
  for (const owner of normalized) {
    const count = ownershipCounts.find((entry) => String(entry._id) === String(owner._id))?.productCount || 0;
    if (count) console.log(`${owner.normalizedEmail}: ${count} existing product(s) remain assigned to this account.`);
  }
  const unassignedCount = ownershipCounts.find((entry) => !entry._id)?.productCount || 0;
  if (unassignedCount) console.log(`${unassignedCount} product(s) have no seller reference and need manual review.`);
}

migrateOwnerRoles()
  .catch((error) => {
    console.error("OWNER ROLE MIGRATION FAILED:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
