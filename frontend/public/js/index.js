const express = require("express");
const path = require("path");

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static
app.use(express.static(path.join(__dirname, "public")));

// ================= ROUTES API =================
const authRoutes = require("../../src/routes/authRoutes");
app.use("/api/auth", authRoutes);

// ================= ROUTES HALAMAN =================

// home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// login
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/auth/login.html"));
});

// admin
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/admin/admin.html"));
});

// meja
app.get("/meja", (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/pelanggan/meja.html"));
});

// ================= SERVER =================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});