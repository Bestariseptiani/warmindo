// ===== STATE =====
let menuData = [];
let cart = [];
let keyword = "";
let currentFilter = "all";
let nomorMeja = "1";

// ===== HELPER STORAGE PER MEJA =====
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

// ===== AMBIL NOMOR MEJA DARI URL =====
function getMeja() {
  const params = new URLSearchParams(window.location.search);
  const meja = params.get("meja");

  if (meja && !isNaN(meja)) {
    nomorMeja = String(meja);
  } else {
    nomorMeja = "1";
  }

  const mejaInfo = document.getElementById("mejaInfo");
  if (mejaInfo) {
    mejaInfo.innerText = `Meja #${nomorMeja}`;
  }

  localStorage.setItem("active_meja", nomorMeja);

  // RESET CART setiap kali halaman menu diakses / QR discan ulang
  removeStorage("cart");
  cart = [];
}

// ===== LOAD MENU DARI DATABASE =====
async function loadMenu() {
  try {
    const res = await fetch("/api/menu");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal ambil menu");
    }

    menuData = Array.isArray(data) ? data : [];

    setStorage("menuData", JSON.stringify(menuData));

    tampilkanMenu(currentFilter);
    updateCart();
  } catch (err) {
    console.error("ERROR LOAD MENU:", err);

    const container = document.querySelector(".grid-menu");
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Menu gagal dimuat</h3>
          <p>Periksa server atau database</p>
        </div>
      `;
    }
  }
}

// ===== CARI =====
function cariMenu() {
  const input = document.getElementById("searchInput");
  keyword = input ? input.value.toLowerCase() : "";
  tampilkanMenu(currentFilter);
}

// ===== TAMPIL MENU =====
function tampilkanMenu(filter) {
  const container = document.querySelector(".grid-menu");
  if (!container) return;

  container.innerHTML = "";

  let hasil = [...menuData];

  if (filter !== "all") {
    hasil = hasil.filter(item => item.kategori === filter);
  }

  if (keyword) {
    hasil = hasil.filter(item =>
      String(item.nama || "").toLowerCase().includes(keyword)
    );
  }

  if (hasil.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Menu tidak ditemukan</h3>
      </div>
    `;
    return;
  }

  hasil.forEach(item => {
    const qty = getQty(item.id);

    container.innerHTML += `
      <div class="card">
        <div class="time-badge">⏱ ${item.waktu} menit</div>

        <img
          src="${item.gambar}"
          alt="${item.nama}"
          onerror="this.src='/assets/images/default.jpg'"
        />

        <h3>${item.nama}</h3>
        <p>Rp. ${Number(item.harga).toLocaleString("id-ID")}</p>

        <div class="qty-control">
          <button onclick="kurang(${item.id})">-</button>
          <span>${qty}</span>
          <button onclick="tambah(${item.id})">+</button>
        </div>
      </div>
    `;
  });
}

// ===== TAMBAH =====
function tambah(id) {
  const item = cart.find(i => Number(i.id) === Number(id));

  if (item) {
    item.qty++;
  } else {
    cart.push({ id, qty: 1 });
  }

  updateCart();
  tampilkanMenu(currentFilter);
}

// ===== KURANG =====
function kurang(id) {
  const item = cart.find(i => Number(i.id) === Number(id));
  if (!item) return;

  item.qty--;

  if (item.qty <= 0) {
    cart = cart.filter(i => Number(i.id) !== Number(id));
  }

  updateCart();
  tampilkanMenu(currentFilter);
}

// ===== AMBIL QTY =====
function getQty(id) {
  const item = cart.find(i => Number(i.id) === Number(id));
  return item ? Number(item.qty) : 0;
}

// ===== UPDATE KERANJANG =====
function updateCart() {
  let totalHarga = 0;
  let totalWaktu = 0;

  cart.forEach(item => {
    const menu = menuData.find(m => Number(m.id) === Number(item.id));
    if (!menu) return;

    totalHarga += Number(menu.harga) * Number(item.qty);
    totalWaktu += Number(menu.waktu) * Number(item.qty);
  });

  const btn = document.querySelector(".cart");
  if (btn) {
    btn.innerText = `🛒 Rp. ${totalHarga.toLocaleString("id-ID")} | ⏱ ${totalWaktu} menit`;
  }

  setStorage("cart", JSON.stringify(cart));
  setStorage("nomorMeja", nomorMeja);
  setStorage("menuData", JSON.stringify(menuData));
}

// ===== FILTER =====
function filterMenu(kategori, el) {
  currentFilter = kategori;
  tampilkanMenu(kategori);

  const buttons = document.querySelectorAll(".kategori button");
  buttons.forEach(btn => btn.classList.remove("active"));

  if (el) el.classList.add("active");
}

// ===== BUKA KERANJANG =====
function bukaKeranjang() {
  setStorage("cart", JSON.stringify(cart));
  setStorage("nomorMeja", nomorMeja);
  setStorage("menuData", JSON.stringify(menuData));

  window.location.href = `/views/pelanggan/keranjang.html?meja=${nomorMeja}`;
}

// ===== INIT =====
getMeja();
loadMenu();