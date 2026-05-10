const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "warmindo",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test koneksi
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌ DB ERROR:", err.message);
  } else {
    console.log("✅ Database terkoneksi!");
    conn.release();
  }
});

module.exports = db;