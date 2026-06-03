const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('Admin#123', 10);
  //const operatorHash = await bcrypt.hash('operator123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'shawnaprince' },
    update: {},
    create: {
      firstName: 'Shawna',
      lastName: 'Price',
      username: 'shawnaprince',
      email: 'groupmalware78@gmail.com',
      password: adminHash,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });

  // const operator = await prisma.user.upsert({
  //   where: { email: 'operator1@company.com' },
  //   update: {},
  //   create: { email: 'operator1@company.com', password: operatorHash, role: 'OPERATOR', mustChangePassword: false },
  // });

  // const records = [
  //   { trackingNumber: 'TRK001234567', status: 'Delivered', userId: admin.id, scannedBy: admin.email, scanTime: new Date(Date.now() - 3600000 * 5) },
  //   { trackingNumber: 'TRK001234568', status: 'In Transit', userId: operator.id, scannedBy: operator.email, scanTime: new Date(Date.now() - 3600000 * 4) },
  //   { trackingNumber: 'TRK001234569', status: 'Received', userId: operator.id, scannedBy: operator.email, scanTime: new Date(Date.now() - 3600000 * 3) },
  //   { trackingNumber: 'TRK001234570', status: 'Exception', userId: admin.id, scannedBy: admin.email, scanTime: new Date(Date.now() - 3600000 * 2) },
  //   { trackingNumber: 'TRK001234571', status: 'Delivered', userId: operator.id, scannedBy: operator.email, scanTime: new Date(Date.now() - 3600000 * 1) },
  //   { trackingNumber: 'TRK001234572', status: 'In Transit', userId: admin.id, scannedBy: admin.email, scanTime: new Date() },
  // ];

  // for (const rec of records) {
  //   await prisma.scanRecord.create({ data: rec });
  // }

  console.log('Seed complete!');
  //console.log('  Admin:    email=admin@company.com    password=admin123');
  //console.log('  Operator: email=operator1@company.com password=operator123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
