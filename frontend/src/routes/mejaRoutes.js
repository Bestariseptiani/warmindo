const express = require("express");
const router = express.Router();
const db = require("../config/db");
const QRCode = require("qrcode");

// ambil semua meja
router.get("/", (req, res) => {
  db.query("SELECT * FROM mejas ORDER BY no ASC", (err, result) => {
    if (err) {
      console.error("MEJA ERROR:", err);
      return res.status(500).json({ message: "Gagal ambil data meja" });
    }

    res.json(result);
  });
});

// generate / regenerate QR meja
router.patch("/:no/qr", async (req, res) => {
  const { no } = req.params;

  try {
    const baseUrl = "https://puddinglike-stacia-askance.ngrok-free.dev";
    const url = `${baseUrl}/?meja=${no}`;

    const qrBase64 = await QRCode.toDataURL(url);

    db.query(
      "UPDATE mejas SET qr = ? WHERE no = ?",
      [qrBase64, no],
      (err) => {
        if (err) {
          console.error("QR ERROR:", err);
          return res.status(500).json({ message: "Gagal update QR" });
        }

        return res.json({
          message: "QR berhasil dibuat",
          qr: qrBase64,
          url
        });
      }
    );
  } catch (err) {
    console.error("GENERATE QR ERROR:", err);
    return res.status(500).json({ message: "Gagal generate QR" });
  }
});

module.exports = router;