const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connectionString = "postgresql://loanlink_db_vcr8_user:YmTy7Q6LxFm6UqiJsnJ1SahrZU77SWeS@dpg-d79430p4tr6s73cljcog-a.oregon-postgres.render.com/loanlink_db_vcr8?sslmode=require";

const client = new Client({ connectionString });

async function verifyAdmin() {
  try {
    await client.connect();
    console.log("Connected to Render database");

    // Check if admin exists
    const check = await client.query('SELECT * FROM admins WHERE email = $1', ['admin@loanlink.co.ke']);
    if (check.rows.length === 0) {
      console.log("No admin found – inserting new admin");
    } else {
      console.log("Admin found – updating password");
    }

    // Hash the password 'admin123'
    const hash = bcrypt.hashSync('admin123', 10);
    console.log("Generated hash:", hash);

    // Insert or update
    await client.query(`
      INSERT INTO admins (email, password_hash)
      VALUES ('admin@loanlink.co.ke', $1)
      ON CONFLICT (email) DO UPDATE SET password_hash = $1
    `, [hash]);

    // Verify the stored hash
    const verify = await client.query('SELECT password_hash FROM admins WHERE email = $1', ['admin@loanlink.co.ke']);
    const storedHash = verify.rows[0].password_hash;
    const match = bcrypt.compareSync('admin123', storedHash);
    console.log("Password match test:", match ? "✅ SUCCESS" : "❌ FAILED");

    if (match) {
      console.log("✅ Admin user is ready. Login with:\n   Email: admin@loanlink.co.ke\n   Password: admin123");
    } else {
      console.log("❌ Something went wrong – hash mismatch");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

verifyAdmin();