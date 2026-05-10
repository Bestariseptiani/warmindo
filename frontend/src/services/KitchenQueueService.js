const TOTAL_TUNGKU = 6;
const WAKTU_MASAK_INDOMIE = 6;

function hitungEstimasiIndomie(jumlahAntreanSekarang = 0, jumlahPesananBaru = 1) {
  jumlahAntreanSekarang = Number(jumlahAntreanSekarang) || 0;
  jumlahPesananBaru = Number(jumlahPesananBaru) || 1;

  const totalPorsi = jumlahAntreanSekarang + jumlahPesananBaru;

  if (totalPorsi <= 0) return 0;

  const totalBatch = Math.ceil(totalPorsi / TOTAL_TUNGKU);

  return totalBatch * WAKTU_MASAK_INDOMIE;
}

function getIndomieKitchenInfo(jumlahAntreanSekarang = 0, jumlahPesananBaru = 1) {
  const estimatedMinutes = hitungEstimasiIndomie(
    jumlahAntreanSekarang,
    jumlahPesananBaru
  );

  if (estimatedMinutes <= 6) {
    return {
      status: "normal",
      canOrder: true,
      title: "Dapur normal",
      message: "Kapasitas dapur masih tersedia. Estimasi Indomie ±6 menit.",
      estimatedMinutes
    };
  }

  if (estimatedMinutes <= 18) {
    return {
      status: "queue",
      canOrder: true,
      title: "Dapur sedang antre",
      message: `Kapasitas dapur sedang antre. Estimasi Indomie sekitar ±${estimatedMinutes} menit.`,
      estimatedMinutes
    };
  }

  if (estimatedMinutes <= 30) {
    return {
      status: "warning",
      canOrder: true,
      title: "Antrean Indomie cukup panjang",
      message: `Pesanan Indomie kemungkinan agak terlambat. Estimasi saat ini ±${estimatedMinutes} menit.`,
      estimatedMinutes
    };
  }

  return {
    status: "closed_temporarily",
    canOrder: false,
    title: "Indomie sedang dibatasi",
    message: "Antrean Indomie sedang penuh. Silakan pilih menu lain atau coba beberapa saat lagi.",
    estimatedMinutes
  };
}

module.exports = {
  getIndomieKitchenInfo,
  hitungEstimasiIndomie
};