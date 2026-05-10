const params = new URLSearchParams(window.location.search);
const nomorMeja = params.get("meja") || "1";

const totalBayarEl = document.getElementById("totalBayar");
const detailEl = document.getElementById("detailPembayaran");

let intervalCek = null;
let orderSedangDibuat = false;
let orderSudahAda = false;
let redirectSedangJalan = false;

function mejaKey(key) {
  return `${key}_meja_${nomorMeja}`;
}

function getJSON(key, fallback = []) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getValue(key, fallback = "") {
  const value = localStorage.getItem(key);
  return value === null ? fallback : value;
}

function setValue(key, value) {
  localStorage.setItem(key, value);
}

function removeValue(key) {
  localStorage.removeItem(key);
}

function getCart() {
  return getJSON(mejaKey("cart"), []);
}

function getOrderData() {
  const orderData = getJSON(mejaKey("orderData"), []);
  if (Array.isArray(orderData) && orderData.length > 0) return orderData;

  return getCart();
}

function getMenuData() {
  return getJSON(mejaKey("menuData"), []);
}

function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function getCurrentItems() {
  return getOrderData();
}

function bersihkanOrderLama() {
  removeValue(mejaKey("lastOrderId"));
  removeValue(mejaKey("lastOrderItems"));
  removeValue(mejaKey("lastOrderTotalWaktu"));
  removeValue(mejaKey("lastOrderMeja"));
  removeValue(mejaKey("paymentConfirmed"));

  orderSudahAda = false;
  orderSedangDibuat = false;
  redirectSedangJalan = false;
}

function hitungTotal() {
  const items = getCurrentItems();
  const menuData = getMenuData();

  let total = 0;

  items.forEach((item) => {
    const menu = menuData.find((m) => Number(m.id) === Number(item.id));
    if (!menu) return;

    total += Number(menu.harga || 0) * Number(item.qty || 0);
  });

  total += 1000;

  if (totalBayarEl) {
    totalBayarEl.innerText = formatRupiah(total);
  }
}

function buatItemsHtml() {
  const items = getCurrentItems();
  const menuData = getMenuData();

  let total = 0;

  const itemsHtml = items.map((item) => {
    const menu = menuData.find((m) => Number(m.id) === Number(item.id));

    const namaMenu = menu ? menu.nama : `Menu ID ${item.id}`;
    const harga = menu ? Number(menu.harga || 0) : 0;
    const qty = Number(item.qty || 0);
    const subtotal = harga * qty;

    total += subtotal;

    return `
      <div class="detail-item">
        <div>
          <strong>${namaMenu}</strong><br>
          <small>${qty} x ${formatRupiah(harga)}</small>
        </div>
        <div>${formatRupiah(subtotal)}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="summary-card">
      <h3>🧾 Pesanan Kamu</h3>

      ${itemsHtml || "<p>Belum ada item pesanan.</p>"}

      <hr>

      <div class="detail-item">
        <strong>Biaya layanan</strong>
        <strong>${formatRupiah(1000)}</strong>
      </div>

      <div class="detail-item total-row">
        <strong>Total</strong>
        <strong>${formatRupiah(total + 1000)}</strong>
      </div>
    </div>
  `;
}

function renderRingkasanPesanan() {
  if (!detailEl) return;
  detailEl.innerHTML = buatItemsHtml();
}

function renderMetode(metode, mode = "waiting") {
  if (!detailEl) return;

  let metodeHtml = "";

  if (mode === "creating") {
    metodeHtml = `
      <div class="summary-card">
        <h3>⏳ Membuat Pesanan</h3>
        <p>Sedang mengirim pesanan ke admin...</p>
      </div>
    `;
  } else if (metode === "kasir") {
    metodeHtml = `
      <div class="summary-card">
        <h3>💵 Bayar di Kasir</h3>
        <p>Silakan lakukan pembayaran ke kasir.</p>
        <p>Setelah dibayar, admin harus menekan tombol <b>Setujui Pembayaran</b>.</p>
        <p><b>Menunggu persetujuan admin...</b></p>
      </div>
    `;
  } else if (metode === "qris") {
    metodeHtml = `
      <div class="summary-card">
        <h3>📱 QRIS</h3>

        <img
          src="/assets/images/QRIS.jpg"
          alt="QRIS"
          style="max-width:220px; width:100%; border-radius:12px; margin:12px 0;"
        />

        <p>Scan QR untuk membayar.</p>
        <p>Setelah dibayar, admin harus menekan tombol <b>Setujui Pembayaran</b>.</p>
        <p><b>Menunggu persetujuan admin...</b></p>
      </div>
    `;
  }

  detailEl.innerHTML = buatItemsHtml() + metodeHtml;
}

async function ambilOrderServer(orderId) {
  try {
    if (!orderId) return null;

    const res = await fetch(`/api/orders/${orderId}?_=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("CEK ORDER SERVER ERROR:", err);
    return null;
  }
}

async function pilihMetode(metode) {
  if (orderSedangDibuat) return;

  const items = getCurrentItems();

  if (!Array.isArray(items) || items.length === 0) {
    alert("Pesanan masih kosong. Silakan pilih menu dulu.");
    window.location.href = `/?meja=${nomorMeja}`;
    return;
  }

  setValue(mejaKey("metodeBayar"), metode);

  const lastOrderId = getValue(mejaKey("lastOrderId"), "");
  const lastOrderMeja = getValue(mejaKey("lastOrderMeja"), "");

  if (lastOrderId && lastOrderMeja === String(nomorMeja)) {
    const orderServer = await ambilOrderServer(lastOrderId);

    if (orderServer) {
      const status = String(orderServer.status || "").toLowerCase();
      const paymentStatus = String(orderServer.payment_status || "").toLowerCase();

      if (status !== "selesai" && status !== "ditolak") {
        orderSudahAda = true;

        if (paymentStatus === "sudah_bayar") {
          redirectKeStatus();
          return;
        }

        renderMetode(metode, "waiting");
        mulaiCekPembayaran();
        return;
      }
    }
  }

  bersihkanOrderLama();
  setValue(mejaKey("metodeBayar"), metode);

  renderMetode(metode, "creating");
  await buatOrder(metode);
}

async function buatOrder(metode) {
  try {
    const order = getCurrentItems();

    if (!Array.isArray(order) || order.length === 0) {
      throw new Error("Order kosong. Silakan pilih menu dulu.");
    }

    orderSedangDibuat = true;

    console.log("KIRIM ORDER KE SERVER:", {
      meja: nomorMeja,
      items: order,
      payment_method: metode
    });

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({
        meja: nomorMeja,
        items: order,
        payment_method: metode
      })
    });

    const text = await res.text();

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Response server bukan JSON: ${text.substring(0, 150)}`);
    }

    if (!res.ok) {
      throw new Error(data.message || "Gagal membuat order");
    }

    console.log("ORDER BERHASIL MASUK:", data);

    setValue(mejaKey("lastOrderId"), String(data.order_id));
    setJSON(mejaKey("lastOrderItems"), order);
    setValue(mejaKey("lastOrderTotalWaktu"), String(data.total_waktu || 15));
    setValue(mejaKey("lastOrderMeja"), String(nomorMeja));
    setValue(mejaKey("paymentConfirmed"), "false");

    orderSudahAda = true;
    orderSedangDibuat = false;

    renderMetode(metode, "waiting");

    alert(`Order #${data.order_id} berhasil masuk ke admin. Menunggu persetujuan pembayaran.`);

    mulaiCekPembayaran();
  } catch (err) {
    orderSedangDibuat = false;
    orderSudahAda = false;

    console.error("GAGAL BUAT ORDER:", err);

    if (detailEl) {
      detailEl.innerHTML = buatItemsHtml() + `
        <div class="summary-card">
          <h3>❌ Gagal Membuat Pesanan</h3>
          <p>${err.message || "Gagal membuat order"}</p>
          <button onclick="window.location.reload()">Coba Lagi</button>
        </div>
      `;
    }

    alert(err.message || "Gagal membuat order");
  }
}

function stopCekPembayaran() {
  if (intervalCek) {
    clearInterval(intervalCek);
    intervalCek = null;
  }
}

function redirectKeStatus() {
  if (redirectSedangJalan) return;

  redirectSedangJalan = true;
  stopCekPembayaran();

  removeValue(mejaKey("cart"));
  removeValue(mejaKey("orderData"));
  setValue(mejaKey("paymentConfirmed"), "true");

  const orderId = getValue(mejaKey("lastOrderId"), "");

  window.location.href = `/views/pelanggan/status.html?meja=${nomorMeja}&orderId=${orderId}`;
}

async function cekPembayaranSekali() {
  try {
    const orderId = getValue(mejaKey("lastOrderId"), "");
    if (!orderId) return;

    const data = await ambilOrderServer(orderId);

    if (!data) {
      console.warn("Order tidak ditemukan di server:", orderId);
      return;
    }

    if (String(data.payment_status || "").toLowerCase() === "sudah_bayar") {
      setValue(mejaKey("paymentConfirmed"), "true");
      redirectKeStatus();
    }
  } catch (err) {
    console.error("Gagal cek pembayaran:", err);
  }
}

function mulaiCekPembayaran() {
  stopCekPembayaran();

  cekPembayaranSekali();

  intervalCek = setInterval(() => {
    cekPembayaranSekali();
  }, 1500);
}

async function restoreStateSaatReload() {
  const lastOrderId = getValue(mejaKey("lastOrderId"), "");
  const metodeBayar = getValue(mejaKey("metodeBayar"), "");
  const lastOrderMeja = getValue(mejaKey("lastOrderMeja"), "");
  const paymentConfirmed = getValue(mejaKey("paymentConfirmed"), "false");

  if (!lastOrderId || lastOrderMeja !== String(nomorMeja)) {
    renderRingkasanPesanan();
    return;
  }

  const orderServer = await ambilOrderServer(lastOrderId);

  if (!orderServer) {
    bersihkanOrderLama();
    renderRingkasanPesanan();
    return;
  }

  const status = String(orderServer.status || "").toLowerCase();

  if (status === "selesai" || status === "ditolak") {
    bersihkanOrderLama();
    renderRingkasanPesanan();
    return;
  }

  orderSudahAda = true;

  if (metodeBayar) {
    renderMetode(metodeBayar, "waiting");
  } else {
    renderRingkasanPesanan();
  }

  if (
    paymentConfirmed === "true" ||
    String(orderServer.payment_status || "").toLowerCase() === "sudah_bayar"
  ) {
    redirectKeStatus();
    return;
  }

  mulaiCekPembayaran();
}

hitungTotal();
restoreStateSaatReload();