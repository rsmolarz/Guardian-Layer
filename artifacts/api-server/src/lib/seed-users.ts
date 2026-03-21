import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SUPERADMIN_EMAIL = "rsmolarz@rsmolarz.com";
const SUPERADMIN_USERNAME = "rsmolarz";

export async function seedSuperadmin() {
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, SUPERADMIN_EMAIL)).limit(1);

  if (existing.length > 0) {
    console.log("[seed-users] Superadmin account already exists.");
    return;
  }

  const envPassword = process.env.SUPERADMIN_INITIAL_PASSWORD;
  const initialPassword = envPassword || crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(initialPassword, 12);

  await db.insert(usersTable).values({
    email: SUPERADMIN_EMAIL,
    username: SUPERADMIN_USERNAME,
    passwordHash,
    role: "superadmin",
    active: true,
  });

  console.log("[seed-users] Superadmin account created.");
  console.log(`[seed-users]   Email: ${SUPERADMIN_EMAIL}`);
  console.log(`[seed-users]   Username: ${SUPERADMIN_USERNAME}`);
  if (envPassword) {
    console.log("[seed-users]   Password set from SUPERADMIN_INITIAL_PASSWORD env var.");
  } else {
    console.log(`[seed-users]   Generated password: ${initialPassword}`);
  }
  console.log("[seed-users]   *** Change this password after first login ***");
}
