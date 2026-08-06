const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  const email = '000000';
  const newDeptName = 'แผนก Dev';

  console.log(`Searching for department: ${newDeptName}`);
  let dept = await prisma.department.findFirst({
    where: { name: newDeptName }
  });

  if (!dept) {
    console.log(`Creating new department: ${newDeptName}`);
    dept = await prisma.department.create({
      data: { name: newDeptName }
    });
  }

  console.log(`Updating user: ${email} to department: ${newDeptName}`);
  const updatedUser = await prisma.user.update({
    where: { email },
    data: { departmentId: dept.id }
  });

  console.log('Success:', updatedUser.name, 'is now in', newDeptName);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
