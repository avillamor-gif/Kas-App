import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@family.local";
  const password = process.env.ADMIN_PASSWORD ?? "changeme123";
  const name = process.env.ADMIN_NAME ?? "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: "admin", color: "#EF4444" },
  });

  console.log(`✅ Admin created: ${user.email} (id: ${user.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
