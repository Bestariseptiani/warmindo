const laporanBody = document.getElementById("laporanBody");
const summaryPerHari = document.getElementById("summaryPerHari");
const summaryPerBulan = document.getElementById("summaryPerBulan");

let laporanData = [];

function goTo(page) {
  if (page === "dashboard") window.location.href = "/admin";
  if (page === "meja") window.location.href = "/meja";
  if (page === "laporan") window.location.href = "/laporan";
}

function logout() {
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  }).then(() => {
    window.location.href = "/login";
  });
}

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString("id-ID")}`;
}

function formatTanggalIndonesia(dateString) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function updateLaporanStat(data) {
  const normalizedData = data.map(item => ({
    ...item,
    status: String(item.status || "").toLowerCase()
  }));

  const totalOrder = new Set(
    normalizedData.map(item => item.order_id)
  ).size;

  const totalQty = normalizedData.reduce((sum, item) => {
    return sum + Number(item.qty || 0);
  }, 0);

  const totalPendapatan = normalizedData
    .filter(item => item.status === "selesai")
    .reduce((sum, item) => {
      return sum + Number(item.subtotal || 0);
    }, 0);

  const totalSelesai = new Set(
    normalizedData
      .filter(item => item.status === "selesai")
      .map(item => item.order_id)
  ).size;

  document.getElementById("lapTotalOrder").innerText = totalOrder;
  document.getElementById("lapTotalQty").innerText = totalQty;
  document.getElementById("lapTotalPendapatan").innerText = formatRupiah(totalPendapatan);
  document.getElementById("lapTotalSelesai").innerText = totalSelesai;
}

function renderSummaryPendapatan(data) {
  if (!summaryPerHari || !summaryPerBulan) return;

  const dataSelesai = data
    .map(item => ({
      ...item,
      status: String(item.status || "").toLowerCase()
    }))
    .filter(item => item.status === "selesai");

  const pendapatanHarian = {};
  const pendapatanBulanan = {};

  dataSelesai.forEach(item => {
    const tanggal = new Date(item.created_at);
    const yyyy = tanggal.getFullYear();
    const mm = String(tanggal.getMonth() + 1).padStart(2, "0");
    const dd = String(tanggal.getDate()).padStart(2, "0");

    const keyHari = `${yyyy}-${mm}-${dd}`;
    const keyBulan = `${yyyy}-${mm}`;

    pendapatanHarian[keyHari] =
      (pendapatanHarian[keyHari] || 0) + Number(item.subtotal || 0);

    pendapatanBulanan[keyBulan] =
      (pendapatanBulanan[keyBulan] || 0) + Number(item.subtotal || 0);
  });

  const listHari = Object.entries(pendapatanHarian).sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  const listBulan = Object.entries(pendapatanBulanan).sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  if (listHari.length === 0) {
    summaryPerHari.innerHTML = `<p class="summary-empty">Belum ada pendapatan harian</p>`;
  } else {
    summaryPerHari.innerHTML = listHari.map(([tanggal, total]) => `
      <div class="summary-item">
        <span>${formatTanggalIndonesia(tanggal)}</span>
        <strong>${formatRupiah(total)}</strong>
      </div>
    `).join("");
  }

  if (listBulan.length === 0) {
    summaryPerBulan.innerHTML = `<p class="summary-empty">Belum ada pendapatan bulanan</p>`;
  } else {
    summaryPerBulan.innerHTML = listBulan.map(([bulan, total]) => {
      const [year, month] = bulan.split("-");
      const label = new Date(`${year}-${month}-01`).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long"
      });

      return `
        <div class="summary-item">
          <span>${label}</span>
          <strong>${formatRupiah(total)}</strong>
        </div>
      `;
    }).join("");
  }
}

function resetFilter() {
  document.getElementById("searchLaporan").value = "";
  document.getElementById("filterTanggal").value = "";
  document.getElementById("filterBulan").value = "";
  renderLaporan();
}

function renderLaporan() {
  if (!laporanBody) return;

  const keyword = document.getElementById("searchLaporan").value.toLowerCase().trim();
  const filterTanggal = document.getElementById("filterTanggal").value;
  const filterBulan = document.getElementById("filterBulan").value;

  laporanBody.innerHTML = "";

  const filteredData = laporanData.filter(item => {
    const dateObj = new Date(item.created_at);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");

    const tanggalFull = `${yyyy}-${mm}-${dd}`;
    const bulanFull = `${yyyy}-${mm}`;

    const cocokKeyword =
      !keyword ||
      String(item.nama_menu || "").toLowerCase().includes(keyword) ||
      String(item.status || "").toLowerCase().includes(keyword) ||
      String(item.meja || "").toLowerCase().includes(keyword);

    const cocokTanggal = !filterTanggal || tanggalFull === filterTanggal;
    const cocokBulan = !filterBulan || bulanFull === filterBulan;

    return cocokKeyword && cocokTanggal && cocokBulan;
  });

  if (filteredData.length === 0) {
    laporanBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">Belum ada data laporan</td>
      </tr>
    `;
    updateLaporanStat([]);
    renderSummaryPendapatan([]);
    return;
  }

  filteredData.forEach((item, index) => {
    laporanBody.innerHTML += `
      <tr>
        <td>${index + 1}</td>
        <td>${new Date(item.created_at).toLocaleString("id-ID")}</td>
        <td>${item.nama_menu} (Meja ${item.meja})</td>
        <td>${item.qty}</td>
        <td>${formatRupiah(item.harga)}</td>
        <td>${formatRupiah(item.subtotal)}</td>
        <td>${String(item.status || "").toLowerCase()}</td>
      </tr>
    `;
  });

  updateLaporanStat(filteredData);
  renderSummaryPendapatan(filteredData);
}

async function loadLaporan() {
  try {
    const res = await fetch("/api/orders/laporan/all/data", {
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal ambil laporan");
    }

    laporanData = Array.isArray(data) ? data : [];
    renderLaporan();
  } catch (err) {
    console.error("Gagal load laporan:", err);

    laporanBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center;">Gagal mengambil data</td>
      </tr>
    `;

    if (summaryPerHari) {
      summaryPerHari.innerHTML = `<p class="summary-empty">Gagal mengambil data</p>`;
    }

    if (summaryPerBulan) {
      summaryPerBulan.innerHTML = `<p class="summary-empty">Gagal mengambil data</p>`;
    }
  }
}

loadLaporan();
setInterval(loadLaporan, 5000);