/**
 * SEC-4: One-time migration — hash plaintext passwords with bcrypt.
 * Run from server folder: node scripts/hash-passwords.cjs
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root123',
    database: 'textbook_resale'
  });
  const [rows] = await conn.query('SELECT user_id, password FROM users');
  for (const row of rows) {
    if (row.password && String(row.password).startsWith('$2')) continue;
    const hash = await bcrypt.hash(String(row.password), 10);
    await conn.query('UPDATE users SET password = ? WHERE user_id = ?', [hash, row.user_id]);
    console.log('Hashed password for user_id', row.user_id);
  }
  await conn.end();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
