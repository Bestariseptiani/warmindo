const express = require("express");
const router = express.Router();
const db = require("../config/db");

// buat order baru
router.post("/", (req, res) => {
  const { meja, items, payment_method } = req.body;

  if (!meja || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Data order tidak lengkap"
    });
  }

  const menuIds = items.map((item) => item.id);

  const menuQuery = `
    SELECT * FROM menus
    WHERE id IN (${menuIds.map(() => "?").join(",")})
  `;

  db.query(menuQuery, menuIds, (err, menus) => {
    if (err) {
      console.error("ERROR MENU:", err);
      return res.status(500).json({ message: "Gagal ambil data menu" });
    }

    let total_harga = 0;
    let total_waktu = 0;

    const orderItems = items
      .map((item) => {
        const menu = menus.find((m) => Number(m.id) === Number(item.id));
        if (!menu) return null;

        const subtotal = Number(menu.harga) * Number(item.qty);
        total_harga += subtotal;
        total_waktu += Number(menu.waktu) * Number(item.qty);

        return {
          menu_id: menu.id,
          nama_menu: menu.nama,
          harga: menu.harga,
          qty: item.qty,
          subtotal
        };
      })
      .filter(Boolean);

    if (orderItems.length === 0) {
      return res.status(400).json({
        message: "Item order tidak valid"
      });
    }

    const insertOrder = `
      INSERT INTO orders (meja, total_harga, total_waktu, status, payment_status, payment_method)
      VALUES (?, ?, ?, 'masuk', 'belum_bayar', ?)
    `;

    db.query(
      insertOrder,
      [meja, total_harga, total_waktu, payment_method || null],
      (err, orderResult) => {
        if (err) {
          console.error("ERROR INSERT ORDER:", err);
          return res.status(500).json({ message: "Gagal simpan order" });
        }

        const orderId = orderResult.insertId;

        const itemValues = orderItems.map((item) => [
          orderId,
          item.menu_id,
          item.nama_menu,
          item.harga,
          item.qty,
          item.subtotal
        ]);

        const insertItems = `
          INSERT INTO order_items (order_id, menu_id, nama_menu, harga, qty, subtotal)
          VALUES ?
        `;

        db.query(insertItems, [itemValues], (err) => {
          if (err) {
            console.error("ERROR INSERT ITEM:", err);
            return res.status(500).json({ message: "Gagal simpan item order" });
          }

          db.query(
            "UPDATE mejas SET status = 'terisi' WHERE no = ?",
            [meja],
            () => {
              return res.status(201).json({
                message: "Order berhasil dibuat, menunggu konfirmasi pembayaran admin",
                order_id: orderId,
                total_waktu,
                payment_status: "belum_bayar"
              });
            }
          );
        });
      }
    );
  });
});

// ambil semua order aktif untuk dashboard admin
router.get("/", (req, res) => {
  const query = `
    SELECT 
      o.id AS order_id,
      o.meja,
      o.status,
      o.payment_status,
      o.payment_method,
      o.total_harga,
      o.total_waktu,
      o.created_at,
      oi.id,
      oi.menu_id,
      oi.nama_menu,
      oi.harga,
      oi.qty,
      oi.subtotal
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status IN ('masuk', 'dimasak', 'siap')
    ORDER BY o.id DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("ORDER ERROR:", err);
      return res.status(500).json({ message: "Gagal ambil order" });
    }

    res.json(result);
  });
});

// detail 1 order untuk halaman pelanggan
router.get("/:id", (req, res) => {
  const orderId = req.params.id;

  const orderQuery = `
    SELECT id, meja, total_harga, total_waktu, status, payment_status, payment_method, created_at
    FROM orders
    WHERE id = ?
  `;

  db.query(orderQuery, [orderId], (err, orderRows) => {
    if (err) {
      console.error("DETAIL ORDER ERROR:", err);
      return res.status(500).json({ message: "Gagal ambil detail order" });
    }

    if (orderRows.length === 0) {
      return res.status(404).json({ message: "Order tidak ditemukan" });
    }

    const itemQuery = `
      SELECT id, menu_id, nama_menu, harga, qty, subtotal
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
    `;

    db.query(itemQuery, [orderId], (err, itemRows) => {
      if (err) {
        console.error("DETAIL ITEM ERROR:", err);
        return res.status(500).json({ message: "Gagal ambil item order" });
      }

      return res.json({
        ...orderRows[0],
        items: itemRows
      });
    });
  });
});

// konfirmasi pembayaran oleh admin
router.patch("/:id/payment", (req, res) => {
  const orderId = req.params.id;

  db.query(
    "UPDATE orders SET payment_status = 'sudah_bayar' WHERE id = ?",
    [orderId],
    (err) => {
      if (err) {
        console.error("UPDATE PAYMENT ERROR:", err);
        return res.status(500).json({
          message: "Gagal update pembayaran"
        });
      }

      return res.json({
        message: "Pembayaran berhasil dikonfirmasi"
      });
    }
  );
});

// update status order
router.patch("/:id/status", (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: "Status wajib diisi" });
  }

  db.query(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, orderId],
    (err) => {
      if (err) {
        console.error("UPDATE STATUS ERROR:", err);
        return res.status(500).json({ message: "Gagal update status" });
      }

      if (status === "selesai" || status === "ditolak") {
        db.query(
          "SELECT meja FROM orders WHERE id = ?",
          [orderId],
          (err, rows) => {
            if (err || rows.length === 0) {
              return res.json({ message: "Status berhasil diupdate" });
            }

            db.query(
              "UPDATE mejas SET status = 'tersedia' WHERE no = ?",
              [rows[0].meja],
              () => {
                return res.json({ message: "Status berhasil diupdate" });
              }
            );
          }
        );
      } else {
        return res.json({ message: "Status berhasil diupdate" });
      }
    }
  );
});

// laporan
router.get("/laporan/all/data", (req, res) => {
  const query = `
    SELECT 
      o.id AS order_id,
      o.meja,
      o.status,
      o.payment_status,
      o.payment_method,
      o.created_at,
      oi.nama_menu,
      oi.harga,
      oi.qty,
      oi.subtotal
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    ORDER BY o.created_at DESC
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("LAPORAN ERROR:", err);
      return res.status(500).json({ message: "Gagal ambil laporan" });
    }

    res.json(result);
  });
});

module.exports = router;