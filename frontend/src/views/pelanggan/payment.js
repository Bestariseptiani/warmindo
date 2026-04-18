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
  const cartPerMeja = getJSON(mejaKey("cart"), null);
  if (Array.isArray(cartPerMeja) && cartPerMeja.length > 0) return cartPerMeja;

  const cartGlobal = getJSON("cart", []);
  if (Array.isArray(cartGlobal) && cartGlobal.length > 0) {
    setJSON(mejaKey("cart"), cartGlobal);
    return cartGlobal;
  }

  return [];
}

function getOrderData() {
  const orderPerMeja = getJSON(mejaKey("orderData"), null);
  if (Array.isArray(orderPerMeja) && orderPerMeja.length > 0) return orderPerMeja;

  const orderGlobal = getJSON("orderData", []);
  if (Array.isArray(orderGlobal) && orderGlobal.length > 0) {
    setJSON(mejaKey("orderData"), orderGlobal);
    return orderGlobal;
  }

  return [];
}

function getMenuData() {
  const menuPerMeja = getJSON(mejaKey("menuData"), null);
  if (Array.isArray(menuPerMeja) && menuPerMeja.length > 0) return menuPerMeja;

  const menuGlobal = getJSON("menuData", []);
  if (Array.isArray(menuGlobal) && menuGlobal.length > 0) {
    setJSON(mejaKey("menuData"), menuGlobal);
    return menuGlobal;
  }

  return [];
}

function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function getCurrentItems() {
  const orderData = getOrderData();
  if (Array.isArray(orderData) && orderData.length > 0) return orderData;
  return getCart();
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

function renderRingkasanPesanan() {
  if (!detailEl) return;

  const items = getCurrentItems();
  const menuData = getMenuData();

  if (!Array.isArray(items) || items.length === 0) {
    detailEl.innerHTML = `
      <div class="summary-card">
        <h3>🧾 Pesanan Kamu</h3>
        <p>Belum ada item pesanan.</p>
      </div>
    `;
    return;
  }

  let total = 0;

  const itemsHtml = items.map((item) => {
    const menu = menuData.find((m) => Number(m.id) === Number(item.id));
    if (!menu) return "";

    const qty = Number(item.qty || 0);
    const subtotal = Number(menu.harga || 0) * qty;
    total += subtotal;

    return `
      <div class="detail-item">
        <div>
          <strong>${menu.nama}</strong><br>
          <small>${qty} x ${formatRupiah(menu.harga)}</small>
        </div>
        <div>${formatRupiah(subtotal)}</div>
      </div>
    `;
  }).join("");

  detailEl.innerHTML = `
    <div class="summary-card">
      <h3>🧾 Pesanan Kamu</h3>
      ${itemsHtml}
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

function renderMetode(metode) {
  const items = getCurrentItems();
  const menuData = getMenuData();

  let total = 0;

  const itemsHtml = items.map((item) => {
    const menu = menuData.find((m) => Number(m.id) === Number(item.id));
    if (!menu) return "";

    const qty = Number(item.qty || 0);
    const subtotal = Number(menu.harga || 0) * qty;
    total += subtotal;

    return `
      <div class="detail-item">
        <div>
          <strong>${menu.nama}</strong><br>
          <small>${qty} x ${formatRupiah(menu.harga)}</small>
        </div>
        <div>${formatRupiah(subtotal)}</div>
      </div>
    `;
  }).join("");

  let metodeHtml = "";

  if (metode === "kasir") {
    metodeHtml = `
      <div class="summary-card">
        <h3>💵 Bayar di Kasir</h3>
        <p>Silakan lakukan pembayaran ke kasir.</p>
        <p>Setelah dibayar, admin akan menekan tombol <b>Sudah Bayar</b>.</p>
        <p><b>Menunggu konfirmasi admin.</b></p>
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
        <p><b>Menunggu konfirmasi admin.</b></p>
      </div>
    `;
  }

  detailEl.innerHTML = `
    <div class="summary-card">
      <h3>🧾 Pesanan Kamu</h3>
      ${itemsHtml}
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
    ${metodeHtml}
  `;
}

async function pilihMetode(metode) {
  setValue(mejaKey("metodeBayar"), metode);
  renderMetode(metode);

  if (!orderSudahAda && !orderSedangDibuat) {
    await buatOrder(metode);
  } else {
    mulaiCekPembayaran();
  }
}

async function buatOrder(metode) {
  try {
    const order = getCurrentItems();

    if (!Array.isArray(order) || order.length === 0) {
      throw new Error("Order kosong");
    }

    orderSedangDibuat = true;

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        meja: nomorMeja,
        items: order,
        payment_method: metode
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal membuat order");
    }

    setValue(mejaKey("lastOrderId"), String(data.order_id));
    setJSON(mejaKey("lastOrderItems"), order);
    setValue(mejaKey("lastOrderTotalWaktu"), String(data.total_waktu || 15));
    setValue(mejaKey("lastOrderMeja"), String(nomorMeja));
    setValue(mejaKey("paymentConfirmed"), "false");

    orderSudahAda = true;
    orderSedangDibuat = false;

    mulaiCekPembayaran();
  } catch (err) {
    orderSedangDibuat = false;
    console.error("GAGAL BUAT ORDER:", err);
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

    const res = await fetch(`/api/orders/${orderId}`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal cek pembayaran");
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
  intervalCek = setInterval(cekPembayaranSekali, 1500);
}

function restoreStateSaatReload() {
  const lastOrderId = getValue(mejaKey("lastOrderId"), "");
  const metodeBayar = getValue(mejaKey("metodeBayar"), "");
  const lastOrderMeja = getValue(mejaKey("lastOrderMeja"), "");
  const paymentConfirmed = getValue(mejaKey("paymentConfirmed"), "false");

  if (!lastOrderId) {
    renderRingkasanPesanan();
    return;
  }

  if (lastOrderMeja !== String(nomorMeja)) {
    renderRingkasanPesanan();
    return;
  }

  orderSudahAda = true;

  if (metodeBayar) {
    renderMetode(metodeBayar);
  } else {
    renderRingkasanPesanan();
  }

  if (paymentConfirmed === "true") {
    redirectKeStatus();
    return;
  }

  mulaiCekPembayaran();
}

hitungTotal();
restoreStateSaatReload();