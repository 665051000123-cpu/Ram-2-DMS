import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // 1. Create a Department
  let dept = await prisma.department.findUnique({ where: { name: 'แผนกอายุรกรรม' } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { name: 'แผนกอายุรกรรม' },
    });
  }
  console.log('Created department:', dept.name);

  // 2. Create an Admin User
  const passwordHash = await bcrypt.hash('password123', 10);
  
  let admin = await prisma.user.findUnique({ where: { email: 'admin@ram2.com' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@ram2.com',
        name: 'ผู้ดูแลระบบ',
        passwordHash,
        role: 'SUPER_ADMIN',
        departmentId: dept.id,
      },
    });
  }
  console.log('Created user:', admin.email);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
