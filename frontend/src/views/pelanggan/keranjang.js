const params = new URLSearchParams(window.location.search);
const nomorMeja = params.get("meja") || "1";

const container = document.getElementById("listKeranjang");

let totalHarga = 0;
let totalWaktu = 0;

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

function getCart() {
  const cartPerMeja = getJSON(mejaKey("cart"), null);
  if (Array.isArray(cartPerMeja) && cartPerMeja.length > 0) {
    return cartPerMeja;
  }

  const cartGlobal = getJSON("cart", []);
  if (Array.isArray(cartGlobal) && cartGlobal.length > 0) {
    setJSON(mejaKey("cart"), cartGlobal);
    return cartGlobal;
  }

  return [];
}

function getMenuData() {
  const menuPerMeja = getJSON(mejaKey("menuData"), null);
  if (Array.isArray(menuPerMeja) && menuPerMeja.length > 0) {
    return menuPerMeja;
  }

  const menuGlobal = getJSON("menuData", []);
  if (Array.isArray(menuGlobal) && menuGlobal.length > 0) {
    setJSON(mejaKey("menuData"), menuGlobal);
    return menuGlobal;
  }

  return [];
}

let cart = getCart();
let menuData = getMenuData();

function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function getMenuById(id) {
  return menuData.find((m) => Number(m.id) === Number(id));
}

function syncStorage() {
  setJSON(mejaKey("cart"), cart);
  setJSON(mejaKey("menuData"), menuData);
}

function renderKeranjang() {
  if (!container) return;

  cart = getCart();
  menuData = getMenuData();

  container.innerHTML = "";

  if (!Array.isArray(cart) || cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Keranjang masih kosong</h3>
        <p>Pilih menu dulu dari halaman utama.</p>
      </div>
    `;

    const subtotalEl = document.getElementById("subtotal");
    const totalEl = document.getElementById("total");
    const totalWaktuEl = document.getElementById("totalWaktu");

    if (subtotalEl) subtotalEl.innerText = formatRupiah(0);
    if (totalEl) totalEl.innerText = formatRupiah(1000);
    if (totalWaktuEl) totalWaktuEl.innerText = "0 Menit";
    return;
  }

  totalHarga = 0;
  totalWaktu = 0;

  cart.forEach((item) => {
    const menu = getMenuById(item.id);
    if (!menu) return;

    const qty = Number(item.qty || 0);
    const subtotal = Number(menu.harga || 0) * qty;

    totalHarga += subtotal;
    totalWaktu += Number(menu.waktu || 0) * qty;

    container.innerHTML += `
      <div class="cart-card">
        <img
          src="${menu.gambar}"
          alt="${menu.nama}"
          onerror="this.src='/assets/images/default.jpg'"
        />

        <div class="info">
          <h4>${menu.nama}</h4>
          <p>${formatRupiah(menu.harga)}</p>
          <p>Subtotal: ${formatRupiah(subtotal)}</p>
        </div>

        <div class="qty-control">
          <button onclick="kurang(${item.id})">-</button>
          <span>${qty}</span>
          <button onclick="tambah(${item.id})">+</button>
        </div>
      </div>
    `;
  });

  const subtotalEl = document.getElementById("subtotal");
  const totalEl = document.getElementById("total");
  const totalWaktuEl = document.getElementById("totalWaktu");

  if (subtotalEl) subtotalEl.innerText = formatRupiah(totalHarga);
  if (totalEl) totalEl.innerText = formatRupiah(totalHarga + 1000);
  if (totalWaktuEl) totalWaktuEl.innerText = `${totalWaktu} Menit`;
}

function tambah(id) {
  const item = cart.find((i) => Number(i.id) === Number(id));
  if (!item) return;

  item.qty++;
  syncStorage();
  renderKeranjang();
}

function kurang(id) {
  const item = cart.find((i) => Number(i.id) === Number(id));
  if (!item) return;

  item.qty--;

  if (item.qty <= 0) {
    cart = cart.filter((i) => Number(i.id) !== Number(id));
  }

  syncStorage();
  renderKeranjang();
}

function pesanSekarang() {
  if (!Array.isArray(cart) || cart.length === 0) {
    alert("Keranjang masih kosong!");
    return;
  }

  setJSON(mejaKey("orderData"), cart);
  window.location.href = `/views/pelanggan/payment.html?meja=${nomorMeja}`;
}

renderKeranjang();