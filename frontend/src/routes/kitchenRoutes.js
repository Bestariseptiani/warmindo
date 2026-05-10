const express = require("express");
const router = express.Router();

const {
  getIndomieKitchenInfo
} = require("../services/KitchenQueueService");

// GET /api/kitchen/indomie-status?qty=1
router.get("/indomie-status", (req, res) => {
  const jumlahPesananBaru = Number(req.query.qty || 1);

  // sementara 0 dulu, artinya tidak ada antrean
  const jumlahAntreanSekarang = 0;

  const info = getIndomieKitchenInfo(
    jumlahAntreanSekarang,
    jumlahPesananBaru
  );

  res.json(info);
});

module.exports = router;