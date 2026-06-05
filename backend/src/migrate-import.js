require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const backupPath = path.join(__dirname, '../../backup.json');
  if (!fs.existsSync(backupPath)) {
    throw new Error(`backup.json not found at ${backupPath} — run migrate:export first`);
  }

  const { users, scanRecords, activityLogs, exportedAt } = JSON.parse(
    fs.readFileSync(backupPath, 'utf8')
  );
  console.log(`Importing backup from ${exportedAt}...`);

  for (const user of users) {
    await prisma.user.create({ data: user });
  }
  console.log(`  ${users.length} users`);

  for (const record of scanRecords) {
    await prisma.scanRecord.create({ data: { ...record, scanTime: new Date(record.scanTime), createdAt: new Date(record.createdAt), updatedAt: new Date(record.updatedAt) } });
  }
  console.log(`  ${scanRecords.length} scan records`);

  for (const log of activityLogs) {
    await prisma.activityLog.create({ data: { ...log, createdAt: new Date(log.createdAt) } });
  }
  console.log(`  ${activityLogs.length} activity logs`);

  // Reset Postgres sequences so auto-increment continues from the right value
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE(MAX(id), 1)) FROM "User"`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"ScanRecord"', 'id'), COALESCE(MAX(id), 1)) FROM "ScanRecord"`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"ActivityLog"', 'id'), COALESCE(MAX(id), 1)) FROM "ActivityLog"`);
  console.log('  Sequences reset');

  console.log('Import complete.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
