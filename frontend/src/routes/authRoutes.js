const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/test", (req, res) => {
  res.send("ROUTE HIDUP");
});

router.post("/login", (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json({
      message: "Username dan password wajib diisi"
    });
  }

  const query = "SELECT id, username FROM admins WHERE username = ? AND password = ?";

  db.query(query, [username, password], (err, result) => {
    if (err) {
      console.error("QUERY ERROR:", err);
      return res.status(500).json({
        message: "Server error"
      });
    }

    if (result.length > 0) {
      req.session.user = {
        id: result[0].id,
        username: result[0].username
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("SESSION SAVE ERROR:", saveErr);
          return res.status(500).json({
            message: "Session gagal disimpan"
          });
        }

        return res.status(200).json({
          message: "Login berhasil",
          user: req.session.user
        });
      });
    } else {
      return res.status(401).json({
        message: "Username atau password salah"
      });
    }
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        message: "Logout gagal"
      });
    }

    res.clearCookie("connect.sid");
    return res.json({
      message: "Logout berhasil"
    });
  });
});

module.exports = router;