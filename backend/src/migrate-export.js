require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Exporting data from SQLite...');

  const users = await prisma.user.findMany();
  const scanRecords = await prisma.scanRecord.findMany();
  const activityLogs = await prisma.activityLog.findMany();

  const backup = {
    exportedAt: new Date().toISOString(),
    users,
    scanRecords,
    activityLogs,
  };

  const outPath = path.join(__dirname, '../../backup.json');
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));

  console.log(`  ${users.length} users`);
  console.log(`  ${scanRecords.length} scan records`);
  console.log(`  ${activityLogs.length} activity logs`);
  console.log(`Saved to: ${outPath}`);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
