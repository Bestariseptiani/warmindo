const express = require("express");
const router = express.Router();
const db = require("../database/db");
const QRCode = require("qrcode");

const baseUrl = "https://puddinglike-stacia-askance.ngrok-free.dev";

// ================= AMBIL SEMUA MEJA =================
router.get("/", (req, res) => {
  db.query("SELECT * FROM mejas ORDER BY no ASC", (err, result) => {
    if (err) {
      console.error("MEJA ERROR:", err);
      return res.status(500).json({ message: "Gagal ambil data meja" });
    }
    res.json(result);
  });
});

// ================= GENERATE SEMUA QR 1-15 =================
router.patch("/generate-all", async (req, res) => {
  try {
    const totalMeja = 15;

    for (let no = 1; no <= totalMeja; no++) {
      const url = `${baseUrl}/?meja=${no}`;
      const qrBase64 = await QRCode.toDataURL(url);

      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE mejas SET qr = ? WHERE no = ?",
          [qrBase64, no],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    }

    return res.json({
      message: "QR meja 1-15 berhasil dibuat"
    });
  } catch (err) {
    console.error("GENERATE ALL QR ERROR:", err);
    return res.status(500).json({
      message: "Gagal generate semua QR"
    });
  }
});

// ================= GENERATE / REGENERATE QR SATUAN =================
router.patch("/:no/qr", async (req, res) => {
  const nomorMeja = Number(req.params.no);

  if (isNaN(nomorMeja) || nomorMeja < 1 || nomorMeja > 15) {
    return res.status(400).json({
      message: "Nomor meja harus 1 sampai 15"
    });
  }

  try {
    const url = `${baseUrl}/?meja=${nomorMeja}`;
    const qrBase64 = await QRCode.toDataURL(url);

    db.query(
      "UPDATE mejas SET qr = ? WHERE no = ?",
      [qrBase64, nomorMeja],
      (err) => {
        if (err) {
          console.error("QR ERROR:", err);
          return res.status(500).json({ message: "Gagal update QR" });
        }

        return res.json({
          message: `QR meja ${nomorMeja} berhasil dibuat`,
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
