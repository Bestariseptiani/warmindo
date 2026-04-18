const container = document.getElementById("mejaContainer");
let mejaData = [];
let orderData = [];

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

function getRingkasanMeja() {
  const total = mejaData.length;
  const terisi = mejaData.filter((m) => m.status === "terisi").length;
  const tersedia = mejaData.filter((m) => m.status === "tersedia").length;
  const belumQR = mejaData.filter((m) => !m.qr).length;
  const overload = total > 0 && terisi >= total;

  return { total, terisi, tersedia, belumQR, overload };
}

function renderSummary() {
  const summaryEl = document.getElementById("mejaSummary");
  if (!summaryEl) return;

  const { total, terisi, tersedia, belumQR, overload } = getRingkasanMeja();

  summaryEl.innerHTML = `
    <div class="card">
      <p>Total Meja</p>
      <h2>${total}</h2>
    </div>

    <div class="card">
      <p>Terisi</p>
      <h2>${terisi}</h2>
    </div>

    <div class="card">
      <p>Tersedia</p>
      <h2>${tersedia}</h2>
    </div>

    <div class="card">
      <p>QR Belum Ada</p>
      <h2>${belumQR}</h2>
    </div>

    <div class="card ${overload ? "danger-card" : ""}">
      <p>Status Kapasitas</p>
      <h2>${overload ? "PENUH" : "AMAN"}</h2>
    </div>
  `;
}

function getLatestOrderByMeja(no) {
  const grouped = {};

  orderData.forEach((item) => {
    if (Number(item.meja) !== Number(no)) return;

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

    grouped[item.order_id].items.push(item);
  });

  const orders = Object.values(grouped).sort((a, b) => b.order_id - a.order_id);
  return orders[0] || null;
}

function renderMeja() {
  if (!container) return;

  const searchInput = document.getElementById("searchMeja");
  const keyword = searchInput ? searchInput.value.toLowerCase().trim() : "";

  container.innerHTML = "";

  const filteredMeja = mejaData.filter((meja) => {
    return !keyword || `meja ${meja.no}`.toLowerCase().includes(keyword);
  });

  if (filteredMeja.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Tidak ada meja ditemukan</h3>
      </div>
    `;
    renderSummary();
    return;
  }

  filteredMeja.forEach((meja) => {
    let statusText = "";
    let statusClass = "";

    if (!meja.qr) {
      statusText = "QR BELUM ADA";
      statusClass = "qr-missing";
    } else if (meja.status === "terisi") {
      statusText = "TERISI";
      statusClass = "occupied";
    } else {
      statusText = "TERSEDIA";
      statusClass = "available";
    }

    const activeOrder = getLatestOrderByMeja(meja.no);
    let paymentInfoHtml = "";

    if (activeOrder) {
      const paymentDone =
        String(activeOrder.payment_status || "").toLowerCase() === "sudah_bayar";

      paymentInfoHtml = `
        <div class="meja-order-info">
          <p><b>Order ID:</b> #${activeOrder.order_id}</p>
          <p><b>Status Order:</b> ${activeOrder.status || "-"}</p>
          <p><b>Metode Bayar:</b> ${activeOrder.payment_method || "-"}</p>
          <p><b>Pembayaran:</b> ${paymentDone ? "Sudah Dibayar" : "Belum Dibayar"}</p>
          <p><b>Total:</b> Rp ${Number(activeOrder.total_harga || 0).toLocaleString("id-ID")}</p>
        </div>

        <div class="meja-actions">
          <button
            class="btn-bayar ${paymentDone ? "done" : ""}"
            onclick="konfirmasiBayar(${activeOrder.order_id})"
            ${paymentDone ? "disabled" : ""}
          >
            ${paymentDone ? "Sudah Dibayar" : "Sudah Bayar"}
          </button>
        </div>
      `;
    } else {
      paymentInfoHtml = `
        <p class="mini-text">Belum ada order aktif di meja ini</p>
      `;
    }

    container.innerHTML += `
      <div class="meja-card">
        <div class="meja-box ${statusClass}"></div>

        <h3>Meja ${String(meja.no).padStart(2, "0")}</h3>
        <p class="status ${statusClass}">${statusText}</p>

        ${paymentInfoHtml}

        <div class="meja-actions">
          <button onclick="printQR(${meja.no})">Print</button>
          <button onclick="generateQR(${meja.no})">
            ${meja.qr ? "Regenerate" : "Generate QR"}
          </button>
        </div>
      </div>
    `;
  });

  renderSummary();
}

async function loadMeja() {
  try {
    const res = await fetch("/api/meja", {
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal mengambil data meja");
    }

    mejaData = Array.isArray(data) ? data : [];
    renderMeja();
  } catch (err) {
    console.error("LOAD MEJA ERROR:", err);
    container.innerHTML = `
      <div class="empty-state">
        <h3>Gagal mengambil data meja</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
}

async function loadOrders() {
  try {
    const res = await fetch("/api/orders", {
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal mengambil data order");
    }

    orderData = Array.isArray(data) ? data : [];
    renderMeja();
  } catch (err) {
    console.error("LOAD ORDER ERROR:", err);
  }
}

async function konfirmasiBayar(orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}/payment`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    const text = await res.text();
    let data = {};

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Response bukan JSON: ${text.substring(0, 120)}`);
    }

    if (!res.ok) {
      throw new Error(data.message || "Gagal konfirmasi pembayaran");
    }

    alert(data.message);

    await loadOrders();
    await loadMeja();
  } catch (err) {
    console.error("KONFIRMASI BAYAR ERROR:", err);
    alert(err.message || "Terjadi kesalahan saat konfirmasi pembayaran");
  }
}

async function generateQR(no) {
  try {
    const res = await fetch(`/api/meja/${no}/qr`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Gagal generate QR");
    }

    alert(`QR meja ${no} berhasil dibuat`);
    await loadMeja();
  } catch (err) {
    alert(err.message);
  }
}

function printQR(no) {
  const meja = mejaData.find((m) => Number(m.no) === Number(no));

  if (!meja || !meja.qr) {
    alert("QR belum dibuat");
    return;
  }

  const win = window.open("", "_blank");

  if (!win) {
    alert("Popup diblokir browser");
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>Print QR Meja ${no}</title>
      </head>
      <body style="text-align:center; font-family:Arial; padding:20px;">
        <h2>Warmindo</h2>
        <h3>Meja ${String(no).padStart(2, "0")}</h3>
        <img src="${meja.qr}" style="width:220px; height:220px;" />
        <p>Scan QR untuk memesan</p>
      </body>
    </html>
  `);

  win.document.close();
  win.focus();

  setTimeout(() => {
    win.print();
  }, 500);
}

async function init() {
  await loadMeja();
  await loadOrders();
}

init();

setInterval(async () => {
  await loadMeja();
  await loadOrders();
}, 3000);