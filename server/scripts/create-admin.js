// scripts/create-admin.js
require("dotenv").config();

const bcrypt = require("bcrypt");
const db = require("../db");

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error("Usage: node scripts/create-admin.js <username> <password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO admins (username, password_hash) VALUES ($1, $2)",
    [username, passwordHash],
  );

  console.log(`Admin "${username}" created.`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
