require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_GvbiP4cFNWO3@ep-old-frost-a1jejgi3-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// When database connects
pool.on("connect", () => {
  console.log("✅ Connected to Neon Database");
});

// If database throws an error
pool.on("error", (err) => {
  console.error("❌ Unexpected database error:", err);
});

module.exports = pool;