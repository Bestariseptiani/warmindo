const params = new URLSearchParams(window.location.search);
const nomorMeja = params.get("meja") || "1";

function getMejaStorageKey(key) {
  return `${key}_meja_${nomorMeja}`;
}

function getStorage(key, fallback = null) {
  const value = localStorage.getItem(getMejaStorageKey(key));
  if (value === null) return fallback;
  return value;
}

function setStorage(key, value) {
  localStorage.setItem(getMejaStorageKey(key), value);
}

function removeStorage(key) {
  localStorage.removeItem(getMejaStorageKey(key));
}

const orderIdEl = document.getElementById("orderId");
const timerEl = document.getElementById("timer");
const statusTextEl = document.getElementById("statusText");
const progressPercentEl = document.getElementById("progressPercent");
const progressFillEl = document.getElementById("progressFill");
const detailListEl = document.getElementById("detailList");
const liveBadgeEl = document.getElementById("liveBadge");
const stepEls = document.querySelectorAll(".timeline .step");

const lastOrderId = params.get("orderId") || getStorage("lastOrderId", "");

let savedItems = JSON.parse(getStorage("lastOrderItems", "[]")) || [];
let savedTotalWaktu = Number(getStorage("lastOrderTotalWaktu", "15"));

let time = Math.max(savedTotalWaktu * 60, 0);
let currentProgress = 0;
let timerInterval = null;
let progressInterval = null;
let syncInterval = null;
let sudahNotifSiap = false;
let sudahRedirect = false;

function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function setProgress(value) {
  currentProgress = Math.max(0, Math.min(100, Number(value || 0)));

  if (progressFillEl) progressFillEl.style.width = `${currentProgress}%`;
  if (progressPercentEl) progressPercentEl.innerText = `${Math.round(currentProgress)}%`;
}

function stopTimerAndProgress() {
  if (timerInterval) clearInterval(timerInterval);
  if (progressInterval) clearInterval(progressInterval);

  timerInterval = null;
  progressInterval = null;
}

function setTimeline(status) {
  stepEls.forEach((el) => el.classList.remove("active"));

  if (status === "masuk") {
    if (stepEls[0]) stepEls[0].classList.add("active");
  } else if (status === "dimasak") {
    if (stepEls[0]) stepEls[0].classList.add("active");
    if (stepEls[1]) stepEls[1].classList.add("active");
  } else if (status === "siap") {
    if (stepEls[0]) stepEls[0].classList.add("active");
    if (stepEls[1]) stepEls[1].classList.add("active");
    if (stepEls[2]) stepEls[2].classList.add("active");
  } else if (status === "selesai") {
    stepEls.forEach((el) => el.classList.add("active"));
  }
}

function renderDetailPesanan() {
  if (!detailListEl) return;

  if (!Array.isArray(savedItems) || savedItems.length === 0) {
    detailListEl.innerHTML = `<p>Tidak ada detail item.</p>`;
    return;
  }

  let totalHarga = 0;

  detailListEl.innerHTML = savedItems.map((item) => {
    const qty = Number(item.qty || 0);
    const subtotal = Number(item.subtotal || (Number(item.harga || 0) * qty));
    totalHarga += subtotal;

    return `
      <div class="detail-item">
        <div>
          <strong>${item.nama_menu || item.nama || "Menu"}</strong><br />
          <small>${qty}x</small>
        </div>
        <div>${formatRupiah(subtotal)}</div>
      </div>
    `;
  }).join("");

  detailListEl.innerHTML += `
    <div class="detail-item total-row">
      <strong>Total</strong>
      <strong>${formatRupiah(totalHarga + 1000)}</strong>
    </div>
  `;
}

function clearOrderStorage() {
  [
    "paymentConfirmed",
    "metodeBayar",
    "lastOrderId",
    "lastOrderItems",
    "lastOrderTotalWaktu",
    "lastOrderMeja",
    "cart",
    "orderData"
  ].forEach(removeStorage);
}

function showSiapNotificationAndRedirect() {
  if (sudahNotifSiap) return;
  sudahNotifSiap = true;

  alert("🍜 Pesanan kamu sudah siap! Silakan diambil.");

  if (!sudahRedirect) {
    sudahRedirect = true;

    setTimeout(() => {
      clearOrderStorage();
      window.location.href = `/?meja=${nomorMeja}`;
    }, 3000);
  }
}

function setStatusUI(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (normalizedStatus === "masuk") {
    if (statusTextEl) statusTextEl.innerText = "Pesanan diterima";
    if (liveBadgeEl) liveBadgeEl.innerText = "Pesanan Masuk";
    setTimeline("masuk");
  } else if (normalizedStatus === "dimasak") {
    if (statusTextEl) statusTextEl.innerText = "Sedang dimasak";
    if (liveBadgeEl) liveBadgeEl.innerText = "Sedang Diproses";
    setTimeline("dimasak");
  } else if (normalizedStatus === "siap") {
    if (statusTextEl) statusTextEl.innerText = "Pesanan siap diambil";
    if (liveBadgeEl) liveBadgeEl.innerText = "Siap Diambil";
    setTimeline("siap");
    stopTimerAndProgress();
    setProgress(100);
    if (timerEl) timerEl.innerText = "00:00";
    showSiapNotificationAndRedirect();
  } else if (normalizedStatus === "selesai") {
    if (statusTextEl) statusTextEl.innerText = "Pesanan selesai";
    if (liveBadgeEl) liveBadgeEl.innerText = "Selesai";
    setTimeline("selesai");
    stopTimerAndProgress();
    setProgress(100);
    if (timerEl) timerEl.innerText = "00:00";
  } else if (normalizedStatus === "ditolak") {
    if (statusTextEl) statusTextEl.innerText = "Pesanan ditolak";
    if (liveBadgeEl) liveBadgeEl.innerText = "Ditolak";
    stopTimerAndProgress();
    setProgress(0);
    if (timerEl) timerEl.innerText = "00:00";
  }
}

function startLocalTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const menit = Math.floor(time / 60);
    const detik = time % 60;

    if (timerEl) {
      timerEl.innerText = `${String(menit).padStart(2, "0")}:${String(detik).padStart(2, "0")}`;
    }

    if (time > 0) time--;
  }, 1000);
}

function startLocalProgress() {
  if (progressInterval) clearInterval(progressInterval);

  const step = savedTotalWaktu > 0 ? 100 / (savedTotalWaktu * 30) : 5;

  progressInterval = setInterval(() => {
    if (currentProgress < 95) {
      setProgress(currentProgress + step);
    }
  }, 2000);
}

async function syncOrderStatus() {
  try {
    if (!lastOrderId) {
      window.location.href = `/views/pelanggan/payment.html?meja=${nomorMeja}`;
      return;
    }

    const res = await fetch(`/api/orders/${lastOrderId}`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal ambil status order");
    }

    const paymentStatus = String(data.payment_status || "").toLowerCase();
    const orderStatus = String(data.status || "").toLowerCase();

    // Halaman timer hanya boleh dibuka setelah admin menyetujui pembayaran.
    if (paymentStatus !== "sudah_bayar") {
      setStorage("paymentConfirmed", "false");
      window.location.href = `/views/pelanggan/payment.html?meja=${nomorMeja}`;
      return;
    }

    setStorage("paymentConfirmed", "true");

    if (orderIdEl) orderIdEl.innerText = data.id || lastOrderId;

    if (Array.isArray(data.items) && data.items.length > 0) {
      savedItems = data.items;
      setStorage("lastOrderItems", JSON.stringify(data.items));
      renderDetailPesanan();
    }

    if (data.total_waktu) {
      savedTotalWaktu = Number(data.total_waktu);
      setStorage("lastOrderTotalWaktu", String(data.total_waktu));
    }

    setStatusUI(orderStatus);

    if (orderStatus === "masuk") {
      setProgress(Math.max(currentProgress, 10));
    } else if (orderStatus === "dimasak") {
      if (currentProgress < 40) setProgress(40);
    } else if (orderStatus === "siap" || orderStatus === "selesai") {
      setProgress(100);
    }
  } catch (err) {
    console.error("SYNC STATUS ERROR:", err);
  }
}

function init() {
  if (!lastOrderId) {
    window.location.href = `/views/pelanggan/payment.html?meja=${nomorMeja}`;
    return;
  }

  if (orderIdEl) orderIdEl.innerText = lastOrderId;

  renderDetailPesanan();
  startLocalTimer();
  startLocalProgress();
  syncOrderStatus();

  syncInterval = setInterval(() => {
    syncOrderStatus();
  }, 2000);
}

init();
