const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = "postgresql://loanlink_db_vcr8_user:YmTy7Q6LxFm6UqiJsnJ1SahrZU77SWeS@dpg-d79430p4tr6s73cljcog-a.oregon-postgres.render.com/loanlink_db_vcr8?sslmode=require";

const client = new Client({ connectionString });

async function fixAdmin() {
  try {
    await client.connect();
    const hash = bcrypt.hashSync('admin123', 10);
    console.log('Generated hash:', hash);
    await client.query(`
      INSERT INTO admins (email, password_hash)
      VALUES ('admin@loanlink.co.ke', $1)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
    `, [hash]);
    console.log('Admin user updated. Now testing login...');
    const res = await client.query('SELECT password_hash FROM admins WHERE email = $1', ['admin@loanlink.co.ke']);
    const storedHash = res.rows[0].password_hash;
    const isValid = bcrypt.compareSync('admin123', storedHash);
    console.log('Password match:', isValid);
    if (isValid) {
      console.log('✅ Login should work now.');
    } else {
      console.log('❌ Hash mismatch.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

fixAdmin();