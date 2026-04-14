/**
 * Run from server folder: node scripts/apply-sprint5-migration.cjs
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const sqlPath = path.join(__dirname, '..', '..', 'database', 'sprint5-migration.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');
  sql = sql.replace(/^\s*USE\s+[^;]+;\s*/im, '');

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'textbook_resale',
    multipleStatements: true
  });

  try {
    await conn.query(sql);
    console.log('Sprint 5 migration applied successfully.');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME' || e.errno === 1060 || /Duplicate column/i.test(e.message)) {
      console.warn('Some columns already exist — continuing if possible:', e.message);
    } else if (/Duplicate foreign key|already exists/i.test(e.message)) {
      console.warn('Constraint may already exist:', e.message);
    } else {
      throw e;
    }
  }

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
