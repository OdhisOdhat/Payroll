import "dotenv/config";
import bcrypt from "bcrypt";
import { supabaseAdmin } from "../lib/supabase";
import crypto from "crypto";

const generateId = () => crypto.randomBytes(16).toString("hex");

async function createAdmin(
  email: string,
  password: string,
  firstName: string = "",
  lastName: string = "",
  role: "admin" | "manager" | "auditor" = "admin"
) {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into admins table
    const { data, error } = await supabaseAdmin
      .from("admins")
      .insert([
        {
          id: generateId(),
          email: email.toLowerCase(),
          password_hash: hashedPassword,
          first_name: firstName,
          last_name: lastName,
          role,
          is_active: true,
        },
      ])
      .select();

    if (error) {
      throw new Error(`Failed to create admin: ${error.message}`);
    }

    console.log("✓ Admin user created successfully:");
    console.log(`  Email: ${email}`);
    console.log(`  Role: ${role}`);
    console.log(`  ID: ${data?.[0]?.id}`);
    console.log(`\nYou can now log in with:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);

    return data?.[0];
  } catch (err: any) {
    console.error("Error creating admin:", err.message);
    process.exit(1);
  }
}

async function listAdmins() {
  try {
    const { data, error } = await supabaseAdmin
      .from("admins")
      .select("id, email, role, is_active, created_at");

    if (error) throw error;

    console.log("\nExisting Admins:");
    console.log("================");
    if (data?.length === 0) {
      console.log("No admins found.");
    } else {
      data?.forEach((admin: any) => {
        console.log(
          `  ${admin.email} (${admin.role}) - Active: ${admin.is_active}`
        );
      });
    }
  } catch (err: any) {
    console.error("Error listing admins:", err.message);
    process.exit(1);
  }
}

async function deleteAdmin(email: string) {
  try {
    const { error } = await supabaseAdmin
      .from("admins")
      .delete()
      .eq("email", email.toLowerCase());

    if (error) throw error;

    console.log(`✓ Admin deleted: ${email}`);
  } catch (err: any) {
    console.error("Error deleting admin:", err.message);
    process.exit(1);
  }
}

// CLI handling
const command = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];
const firstName = process.argv[5] || "";
const lastName = process.argv[6] || "";
const role = (process.argv[7] || "admin") as "admin" | "manager" | "auditor";

if (command === "create" && email && password) {
  createAdmin(email, password, firstName, lastName, role);
} else if (command === "list") {
  listAdmins();
} else if (command === "delete" && email) {
  deleteAdmin(email);
} else {
  console.log(`
Admin User Management Script

Usage:
  Create admin:  npx ts-node api/scripts/createAdmin.ts create <email> <password> [firstName] [lastName] [role]
  List admins:   npx ts-node api/scripts/createAdmin.ts list
  Delete admin:  npx ts-node api/scripts/createAdmin.ts delete <email>

Example:
  npx ts-node api/scripts/createAdmin.ts create admin@payrollpro.com Password123 Admin System admin
  npx ts-node api/scripts/createAdmin.ts list
  npx ts-node api/scripts/createAdmin.ts delete admin@payrollpro.com

Roles: admin, manager, auditor
`);
}
