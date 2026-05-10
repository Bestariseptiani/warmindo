const express = require("express");
const router = express.Router();
const db = require("../database/db");

router.get("/", (req, res) => {
  const query = "SELECT * FROM menus ORDER BY id ASC";

  db.query(query, (err, result) => {
    if (err) {
      console.error("MENU ERROR:", err);
      return res.status(500).json({ message: "Gagal ambil menu" });
    }

    res.json(result);
  });
});

module.exports = router;
