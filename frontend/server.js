const express = require("express");
const path = require("path");
const cors = require("cors");
const session = require("express-session");

const app = express();

const authRoutes = require("./src/routes/authRoutes");
const menuRoutes = require("./src/routes/menuRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const mejaRoutes = require("./src/routes/mejaRoutes");

// ================= MIDDLEWARE =================
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "warmindo-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 2
    }
  })
);

// ================= STATIC =================
app.use(express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "src/views")));

// ================= AUTH CHECK =================
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  return res.redirect("/login");
}

// ================= API ROUTES =================
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/meja", mejaRoutes);

// ================= PAGES =================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/login", (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect("/admin");
  }

  res.sendFile(path.join(__dirname, "src/views/auth/login.html"));
});

app.get("/admin", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/admin/admin.html"));
});

app.get("/meja", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/admin/meja.html"));
});

app.get("/laporan", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "src/views/admin/laporan.html"));
});

// ================= DEBUG =================
app.get("/session-check", (req, res) => {
  res.json({
    session: req.session,
    user: req.session ? req.session.user : null
  });
});

// ================= SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server jalan di port ${PORT}`);
});