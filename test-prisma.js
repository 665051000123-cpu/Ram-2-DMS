const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const updatedUser = await prisma.user.update({
      where: { email: 'test@hospital.com' },
      data: {
        name: 'นาย พิรัชชัย คนทน',
        email: '690001',
        role: 'STAFF'
      }
    });
    console.log('Success:', updatedUser);
    
    // Revert
    await prisma.user.update({
      where: { id: updatedUser.id },
      data: { email: 'test@hospital.com' }
    });
  } catch (err) {
    console.error('Prisma Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
