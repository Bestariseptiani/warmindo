const container = document.getElementById("orderList");
let allOrders = [];
let keyword = "";

function cariPesanan() {
  keyword = document.getElementById("searchInput").value.toLowerCase();
  render();
}

function goTo(page) {
  if (page === "dashboard") window.location.href = "/admin";
  if (page === "meja") window.location.href = "/meja";
  if (page === "laporan") window.location.href = "/laporan";
}

function updateStat() {
  const grouped = {};
  allOrders.forEach((item) => {
    if (!grouped[item.order_id]) {
      grouped[item.order_id] = item.status;
    }
  });

  const statuses = Object.values(grouped);
  document.getElementById("statAntrian").innerText = statuses.filter((s) => s === "masuk").length;
  document.getElementById("statMasak").innerText = statuses.filter((s) => s === "dimasak").length;
  document.getElementById("statSiap").innerText = statuses.filter((s) => s === "siap").length;
  document.getElementById("statSelesai").innerText = 0;
}

function render() {
  if (!container) return;

  container.innerHTML = "";

  const grouped = {};

  allOrders.forEach((item) => {
    if (!grouped[item.order_id]) {
      grouped[item.order_id] = {
        order_id: item.order_id,
        meja: item.meja,
        status: item.status,
        payment_status: item.payment_status,
        payment_method: item.payment_method,
        total_waktu: item.total_waktu,
        created_at: item.created_at,
        items: []
      };
    }

    grouped[item.order_id].items.push(item);
  });

  const orders = Object.values(grouped);

  const filtered = orders.filter((order) => {
    if (!keyword) return true;
    return order.items.some((item) =>
      item.nama_menu.toLowerCase().includes(keyword)
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = "<p>Tidak ada pesanan</p>";
    updateStat();
    return;
  }

  filtered.forEach((order) => {
    const itemsHtml = order.items.map((item) => `
      <p>${item.nama_menu} x${item.qty} = Rp ${Number(item.subtotal).toLocaleString("id-ID")}</p>
    `).join("");

    const disableProses = String(order.payment_status || "").toLowerCase() !== "sudah_bayar"
      ? "disabled"
      : "";

    container.innerHTML += `
      <div class="order-card">
        <h4>Order #${order.order_id} | Meja ${order.meja}</h4>
        <p><b>Estimasi:</b> ${order.total_waktu} menit</p>
        <p><b>Metode Bayar:</b> ${order.payment_method || "-"}</p>
        <p><b>Pembayaran:</b> ${order.payment_status || "belum_bayar"}</p>
        ${itemsHtml}
        <p><b>Status:</b> ${order.status}</p>

        <div class="order-actions">
          <button class="btn-proses" ${disableProses} onclick="updateStatus(${order.order_id}, 'dimasak')">Dimasak</button>
          <button class="btn-proses" ${disableProses} onclick="updateStatus(${order.order_id}, 'siap')">Siap</button>
          <button onclick="updateStatus(${order.order_id}, 'selesai')">Selesaikan</button>
          <button onclick="updateStatus(${order.order_id}, 'ditolak')">Tolak</button>
        </div>
      </div>
    `;
  });

  updateStat();
}

async function loadOrders() {
  try {
    const res = await fetch("/api/orders", {
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Gagal load order");

    allOrders = Array.isArray(data) ? data : [];
    render();
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Gagal mengambil data order</p>";
  }
}

async function updateStatus(orderId, status) {
  try {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ status })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    alert(data.message);
    loadOrders();
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  }).then(() => {
    window.location.href = "/login";
  });
}

loadOrders();
setInterval(loadOrders, 5000);