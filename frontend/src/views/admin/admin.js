const container = document.getElementById("orderList");

let allOrders = [];
let keyword = "";

function cariPesanan() {
  keyword = document.getElementById("searchInput").value.toLowerCase().trim();
  render();
}

function goTo(page) {
  if (page === "dashboard") window.location.href = "/admin";
  if (page === "meja") window.location.href = "/meja";
  if (page === "laporan") window.location.href = "/laporan";
}

function formatRupiah(angka) {
  return "Rp " + Number(angka || 0).toLocaleString("id-ID");
}

function groupOrders() {
  const grouped = {};

  allOrders.forEach((item) => {
    if (!grouped[item.order_id]) {
      grouped[item.order_id] = {
        order_id: item.order_id,
        meja: item.meja,
        status: item.status,
        payment_status: item.payment_status,
        payment_method: item.payment_method,
        total_harga: item.total_harga,
        total_waktu: item.total_waktu,
        created_at: item.created_at,
        items: []
      };
    }

    if (item.nama_menu) {
      grouped[item.order_id].items.push(item);
    }
  });

  return Object.values(grouped);
}

function updateStat() {
  const orders = groupOrders();
  const statuses = orders.map((order) => String(order.status || "").toLowerCase());

  document.getElementById("statAntrian").innerText =
    statuses.filter((s) => s === "masuk").length;

  document.getElementById("statMasak").innerText =
    statuses.filter((s) => s === "dimasak").length;

  document.getElementById("statSiap").innerText =
    statuses.filter((s) => s === "siap").length;

  document.getElementById("statSelesai").innerText =
    statuses.filter((s) => s === "selesai").length;
}

function render() {
  if (!container) return;

  container.innerHTML = "";

  const orders = groupOrders();

  const filtered = orders.filter((order) => {
    if (!keyword) return true;

    const byMenu = order.items.some((item) =>
      String(item.nama_menu || "").toLowerCase().includes(keyword)
    );

    const byMeja = String(order.meja || "").toLowerCase().includes(keyword);
    const byOrderId = String(order.order_id || "").includes(keyword);

    return byMenu || byMeja || byOrderId;
  });

  if (filtered.length === 0) {
    container.innerHTML = "<p>Tidak ada pesanan</p>";
    updateStat();
    return;
  }

  filtered.forEach((order) => {
    const paymentDone =
      String(order.payment_status || "").toLowerCase() === "sudah_bayar";

    const itemsHtml = order.items.length
      ? order.items.map((item) => `
          <p>
            ${item.nama_menu} x${item.qty}
            = ${formatRupiah(item.subtotal)}
          </p>
        `).join("")
      : "<p>Item pesanan tidak ditemukan</p>";

    const approvalHtml = paymentDone
      ? `
        <div class="payment-box approved">
          <b>✅ Pembayaran sudah disetujui</b>
        </div>
      `
      : `
        <div class="payment-box pending">
          <b>⏳ Menunggu Persetujuan Pembayaran</b>
          <p>Pelanggan belum bisa masuk halaman timer sebelum admin menyetujui.</p>
          <button class="btn-bayar" onclick="setujuiPembayaran(${order.order_id})">
            Setujui Pembayaran
          </button>
        </div>
      `;

    const disableProses = paymentDone ? "" : "disabled";

    container.innerHTML += `
      <div class="order-card">
        <h4>Order #${order.order_id} | Meja ${order.meja}</h4>

        <p><b>Total:</b> ${formatRupiah(order.total_harga)}</p>
        <p><b>Estimasi:</b> ${order.total_waktu || 0} menit</p>
        <p><b>Metode Bayar:</b> ${order.payment_method || "-"}</p>
        <p>
          <b>Pembayaran:</b>
          ${paymentDone ? "Sudah disetujui" : "Menunggu persetujuan admin"}
        </p>

        ${itemsHtml}

        <p><b>Status Order:</b> ${order.status}</p>

        ${approvalHtml}

        <div class="order-actions">
          <button
            class="btn-proses"
            ${disableProses}
            onclick="updateStatus(${order.order_id}, 'dimasak')"
          >
            Dimasak
          </button>

          <button
            class="btn-proses"
            ${disableProses}
            onclick="updateStatus(${order.order_id}, 'siap')"
          >
            Siap
          </button>

          <button
            ${disableProses}
            onclick="updateStatus(${order.order_id}, 'selesai')"
          >
            Selesaikan
          </button>

          <button onclick="updateStatus(${order.order_id}, 'ditolak')">
            Tolak
          </button>
        </div>
      </div>
    `;
  });

  updateStat();
}

async function loadOrders() {
  try {
    const res = await fetch("/api/orders", {
      credentials: "include",
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache"
      }
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal load order");
    }

    allOrders = Array.isArray(data) ? data : [];
    render();
  } catch (err) {
    console.error("LOAD ORDER ERROR:", err);
    container.innerHTML = "<p>Gagal mengambil data order</p>";
  }
}

async function setujuiPembayaran(orderId) {
  try {
    const yakin = confirm(`Setujui pembayaran order #${orderId}?`);
    if (!yakin) return;

    const res = await fetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal menyetujui pembayaran");
    }

    alert(data.message || "Pembayaran disetujui");
    await loadOrders();
  } catch (err) {
    console.error("SETUJUI PEMBAYARAN ERROR:", err);
    alert(err.message || "Gagal menyetujui pembayaran");
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

    if (!res.ok) {
      throw new Error(data.message || "Gagal update status");
    }

    alert(data.message);
    await loadOrders();
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
setInterval(loadOrders, 3000);