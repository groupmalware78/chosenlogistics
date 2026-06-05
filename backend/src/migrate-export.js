const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Prisma resolves file: URLs relative to the schema file (prisma/),
// so the db ends up at prisma/prisma/dev.db
const DB_PATH = path.join(__dirname, '../prisma/prisma/dev.db');

if (!fs.existsSync(DB_PATH)) {
  console.error(`SQLite db not found at: ${DB_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

const users        = db.prepare('SELECT * FROM "User"').all();
const scanRecords  = db.prepare('SELECT * FROM "ScanRecord"').all();
const activityLogs = db.prepare('SELECT * FROM "ActivityLog"').all();

db.close();

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
