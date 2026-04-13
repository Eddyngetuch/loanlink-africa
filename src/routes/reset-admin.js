const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = "postgresql://loanlink_db_vcr8_user:YmTy7Q6LxFm6UqiJsnJ1SahrZU77SWeS@dpg-d79430p4tr6s73cljcog-a.oregon-postgres.render.com/loanlink_db_vcr8?sslmode=require";

const client = new Client({ connectionString });

async function resetAdmin() {
  try {
    await client.connect();
    const hash = bcrypt.hashSync('admin123', 10);
    await client.query(`
      INSERT INTO admins (email, password_hash)
      VALUES ('admin@loanlink.co.ke', $1)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
    `, [hash]);
    console.log('✅ Admin user updated with password: admin123');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await client.end();
  }
}

resetAdmin();