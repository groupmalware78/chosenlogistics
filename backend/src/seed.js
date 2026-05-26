const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminHash = await bcrypt.hash('admin123', 10);
  const operatorHash = await bcrypt.hash('operator123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: adminHash, role: 'ADMIN' },
  });

  const operator = await prisma.user.upsert({
    where: { username: 'operator1' },
    update: {},
    create: { username: 'operator1', password: operatorHash, role: 'OPERATOR' },
  });

  const statuses = ['In Transit', 'Delivered', 'Pending', 'Exception'];
  const records = [
    { trackingNumber: 'TRK001234567', status: 'Delivered', userId: admin.id, scannedBy: 'admin', scanTime: new Date(Date.now() - 3600000 * 5) },
    { trackingNumber: 'TRK001234568', status: 'In Transit', userId: operator.id, scannedBy: 'operator1', scanTime: new Date(Date.now() - 3600000 * 4) },
    { trackingNumber: 'TRK001234569', status: 'Pending', userId: operator.id, scannedBy: 'operator1', scanTime: new Date(Date.now() - 3600000 * 3) },
    { trackingNumber: 'TRK001234570', status: 'Exception', userId: admin.id, scannedBy: 'admin', scanTime: new Date(Date.now() - 3600000 * 2) },
    { trackingNumber: 'TRK001234571', status: 'Delivered', userId: operator.id, scannedBy: 'operator1', scanTime: new Date(Date.now() - 3600000 * 1) },
    { trackingNumber: 'TRK001234572', status: 'In Transit', userId: admin.id, scannedBy: 'admin', scanTime: new Date() },
  ];

  for (const rec of records) {
    await prisma.scanRecord.create({ data: rec });
  }

  console.log('Seed complete!');
  console.log('  Admin:     username=admin     password=admin123');
  console.log('  Operator:  username=operator1 password=operator123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
