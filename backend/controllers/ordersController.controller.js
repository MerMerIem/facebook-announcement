import db from "../config/db.js";
import Cookies from "js-cookie";
import dotenv from "dotenv";
dotenv.config();

const link = process.env.BACKEND_URL;

// only for a client
export async function addOrder(req, res) {
  const { full_name, email, phone, wilaya, address, notes, items } = req.body;

  if (
    !full_name ||
    !email ||
    !phone ||
    !address ||
    !items ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Données manquantes ou invalides. Veuillez vérifier tous les champs requis.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Format d'email invalide",
    });
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.product_id || !item.quantity || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `Article ${
          i + 1
        }: ID du produit et quantité sont requis, et la quantité doit être positive`,
      });
    }
  }

  try {
    await db.query("START TRANSACTION");

    const [wilayaFound] = await db.execute(
      "SELECT delivery_fee FROM wilayas WHERE name = ?",
      [wilaya]
    );
    const deliveryFee = Number(wilayaFound[0].delivery_fee) || 0;
    console.log("Delivery fee for wilaya", wilaya, ":", deliveryFee);

    let subtotal = 0;
    const orderItemsData = [];
    const notFoundProducts = [];

    for (const item of items) {
      console.log(`Fetching product with ID ${item.product_id}`);
      const [productResult] = await db.execute(
        "SELECT id, name, price, discount_price, discount_start, discount_end, discount_percentage, initial_price, profit FROM products WHERE id = ?",
        [item.product_id]
      );

      if (productResult.length === 0) {
        console.warn(`Product with ID ${item.product_id} not found`);
        notFoundProducts.push(item.product_id);
        continue;
      }

      const product = productResult[0];
      console.log("Fetched product:", product.name);

      let unitPrice = Number(product.price);
      let usedDiscount = false;

      if (product.discount_price) {
        const discountStart = new Date(product.discount_start);
        const discountEnd = new Date(product.discount_end);
        const now = new Date();

        if (now >= discountStart && now <= discountEnd) {
          unitPrice = Number(product.discount_price);
          usedDiscount = true;
          console.log(
            `Discount applied on ${product.name}: using discount price ${unitPrice}`
          );
        }
      }

      if (item.quantity === 1) {
        subtotal += unitPrice * item.quantity;
        console.log(
          `Item: ${product.name}, Quantity: ${item.quantity}, Unit Price: ${unitPrice}, Subtotal now: ${subtotal}`
        );
      } else {
        const productOriginalPrice = product.discount_price
          ? Number(product.discount_price)
          : Number(product.price);

        console.log(productOriginalPrice);

        const remove = Number(
          product.profit * (product.discount_percentage / 100)
        );

        unitPrice = productOriginalPrice - remove;

        console.log(
          `Custom calculated price for ${product.name} (Qty: ${item.quantity}): ${unitPrice}`
        );

        subtotal += unitPrice * item.quantity;
        console.log(`Subtotal updated after ${product.name}: ${subtotal}`);
      }

      orderItemsData.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
      });
    }

    if (notFoundProducts.length > 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Produit(s) non trouvé(s)`,
        details: {
          notFoundProductIds: notFoundProducts,
          message: `Les produits avec les IDs suivants n'existent pas: ${notFoundProducts.join(
            ", "
          )}`,
        },
      });
    }

    const totalPrice = subtotal + deliveryFee;
    console.log(
      `Final subtotal: ${subtotal}, Delivery fee: ${deliveryFee}, Total price: ${totalPrice}`
    );

    const [orderResult] = await db.execute(
      `INSERT INTO orders (total_price, status, full_name, email, phone, wilaya, address, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        totalPrice,
        "في الانتظار",
        full_name,
        email,
        phone,
        wilaya,
        address,
        notes || null,
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItemsData) {
      console.log(`Inserting item to DB:`, item);
      await db.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }

    /* Commented out notification related code
    const [userResult] = await db.execute(
      "SELECT id FROM users WHERE email = ?",
      ["kadriyacine93@gmail.com"]
    );

    const notificationContent = `Nouvelle commande #${orderId} arrive. Total: ${totalPrice} DA`;

    if (userResult.length > 0) {
      const userId = userResult[0].id;

      await db.execute(
        "INSERT INTO notification (content, notification_status, time, user_id) VALUES (?, ?, NOW(), ?)",
        [notificationContent, "unread", userId]
      );

      const [subscriptions] = await db.query(
        "SELECT endpoint, keys FROM push_subscriptions WHERE user_id = ?",
        [userId]
      );

      if (subscriptions.length > 0) {
        const subscription = {
          endpoint: subscriptions[0].endpoint,
          keys: JSON.parse(subscriptions[0].keys),
        };

        await fetch(`${link}/send-notification`, {
          method: "POST",
          body: JSON.stringify(subscription),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Cookies.get("accessToken")}`,
          },
        }).catch((err) => console.error("Push notification error:", err));
      }
    } else {
      await db.execute(
        "INSERT INTO notification (content, notification_status, time, user_id) VALUES (?, ?, NOW(), NULL)",
        [notificationContent, "unread"]
      );
    }
    */

    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      orderId,
      subtotal,
      deliveryFee,
      totalPrice,
      itemsCount: orderItemsData.length,
      message: "Commande créée avec succès",
    });
  } catch (err) {
    try {
      await db.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Erreur lors du rollback :", rollbackErr);
    }

    console.error("Erreur lors de l'ajout de la commande :", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Cette commande existe déjà",
      });
    }

    if (err.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({
        success: false,
        message: "Certaines données sont trop longues",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur lors de la création de la commande",
      ...(process.env.NODE_ENV === "development" && { error: err.message }),
    });
  }
}

// only for the admin

export async function getOrderById(req, res) {
  const { id } = req.params;

  try {
    // Get order details
    const [orderResult] = await db.execute(
      `SELECT o.*, w.delivery_fee 
         FROM orders o
         LEFT JOIN wilayas w ON o.wilaya = w.name
         WHERE o.id = ?`,
      [id]
    );

    if (orderResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée",
      });
    }

    // Get order items with product details
    const [itemsResult] = await db.execute(
      `SELECT oi.*, p.name as product_name, p.description as product_description,
                MAX(pi.url) as product_image
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         LEFT JOIN product_images pi ON p.id = pi.product_id
         WHERE oi.order_id = ?
         GROUP BY oi.id`,
      [id]
    );

    const order = {
      ...orderResult[0],
      items: itemsResult,
    };

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("Erreur lors de la récupération de la commande :", err);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
}
export async function getAllOrders(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const status = req.query.status;
  const search = req.query.search;
  console.log("status", status);
  console.log("search", search);

  try {
    let query = `
      SELECT o.*, MAX(w.delivery_fee) as delivery_fee,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN wilayas w ON o.wilaya = w.name
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;
    
    let countQuery = "SELECT COUNT(DISTINCT o.id) as total FROM orders o";
    let whereClauses = [];
    let params = [];
    let countParams = [];

    // Add status filter if provided
    if (status) {
      whereClauses.push("o.status = ?");
      params.push(status);
      countParams.push(status);
    }

    // Add search filter if provided
    if (search) {
      const searchTerm = `%${search}%`;
      whereClauses.push(`
        (o.full_name LIKE ? OR 
         o.email LIKE ? OR 
         o.phone LIKE ? OR 
         o.id LIKE ?)
      `);
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Combine WHERE clauses if any exist
    if (whereClauses.length > 0) {
      const whereClause = " WHERE " + whereClauses.join(" AND ");
      query += whereClause;
      countQuery += whereClause;
    }

    // Add grouping, ordering and pagination
    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    console.log("query", query);

    // Execute both queries in parallel
    const [orders, totalResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    const total = totalResult[0][0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      orders: orders[0],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des commandes :", err);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
}

export async function getRecent(req, res) {
  try {
    const query = `
      SELECT o.*, MAX(w.delivery_fee) as delivery_fee,
             COUNT(oi.id) as item_count,
             GROUP_CONCAT(DISTINCT p.name SEPARATOR ', ') as product_names
      FROM orders o
      LEFT JOIN wilayas w ON o.wilaya = w.name
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      GROUP BY o.id 
      ORDER BY o.created_at DESC 
      LIMIT 5
    `;

    const [orders] = await db.query(query);

    res.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error(
      "Erreur lors de la récupération des commandes récentes :",
      err
    );
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
}

export async function getTodaysOrders(req, res) {
  try {
    const query = `
      SELECT o.*, MAX(w.delivery_fee) as delivery_fee,
             COUNT(oi.id) as item_count,
             GROUP_CONCAT(DISTINCT p.name SEPARATOR ', ') as product_names
      FROM orders o
      LEFT JOIN wilayas w ON o.wilaya = w.name
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE DATE(o.created_at) = CURDATE()
      GROUP BY o.id 
      ORDER BY o.created_at DESC
    `;

    const [orders] = await db.query(query);

    res.json({
      success: true,
      orders,
      count: orders.length,
    });
  } catch (err) {
    console.error(
      "Erreur lors de la récupération des commandes du jour :",
      err
    );
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
}

export async function modifyOrder(req, res) {
  const { id } = req.params;
  const {
    full_name,
    email,
    phone,
    wilaya,
    address,
    notes,
    items, // optional - array of {product_id, quantity}
  } = req.body;

  // Input validation
  if (!id || isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "ID de commande invalide",
    });
  }

  if (!full_name || !email || !phone || !wilaya || !address) {
    return res.status(400).json({
      success: false,
      message:
        "Données manquantes. Tous les champs requis doivent être fournis.",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Format d'email invalide",
    });
  }

  // Validate items if provided
  if (
    items &&
    (!Array.isArray(items) ||
      items.some(
        (item) => !item.product_id || !item.quantity || item.quantity <= 0
      ))
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Format des articles invalide. Chaque article doit avoir un product_id et une quantité positive.",
    });
  }

  try {
    // Check if order exists
    const [existingOrder] = await db.query(
      "SELECT * FROM orders WHERE id = ?",
      [id]
    );

    if (existingOrder.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée",
      });
    }

    // Check if order can be modified (not delivered or cancelled)
    if (
      existingOrder[0].status === "livrée" ||
      existingOrder[0].status === "annulée"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cette commande ne peut pas être modifiée car elle est ${existingOrder[0].status}`,
      });
    }

    // Start transaction
    await db.query("START TRANSACTION");

    let totalPrice = existingOrder[0].total_price;

    // Verify wilaya exists
    const [wilayaResult] = await db.execute(
      "SELECT delivery_fee FROM wilayas WHERE name = ?",
      [wilaya]
    );

    if (wilayaResult.length === 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Wilaya "${wilaya}" non trouvée`,
      });
    }

    // Update order basic info
    await db.execute(
      `UPDATE orders 
         SET full_name = ?, email = ?, phone = ?, wilaya = ?, address = ?, notes = ?
         WHERE id = ?`,
      [full_name, email, phone, wilaya, address, notes || null, id]
    );

    // If items are provided, update them
    if (items && items.length > 0) {
      // Validate all products exist before making changes
      const notFoundProducts = [];
      const validItems = [];

      for (const item of items) {
        const [productResult] = await db.execute(
          "SELECT id, name, price, discount_price, discount_start, discount_end FROM products WHERE id = ?",
          [item.product_id]
        );

        if (productResult.length === 0) {
          notFoundProducts.push(item.product_id);
        } else {
          validItems.push({ ...item, product: productResult[0] });
        }
      }

      if (notFoundProducts.length > 0) {
        await db.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `Produit(s) non trouvé(s)`,
          details: {
            notFoundProductIds: notFoundProducts,
            message: `Les produits avec les IDs suivants n'existent pas: ${notFoundProducts.join(
              ", "
            )}`,
          },
        });
      }

      // Delete existing items
      await db.execute("DELETE FROM order_items WHERE order_id = ?", [id]);

      const deliveryFee = wilayaResult[0].delivery_fee || 0;
      totalPrice = deliveryFee;

      // Add new items and recalculate total
      for (const item of validItems) {
        const product = item.product;
        const now = new Date();

        let unitPrice = product.price;
        if (
          product.discount_price &&
          product.discount_start <= now &&
          product.discount_end >= now
        ) {
          unitPrice = product.discount_price;
        }

        totalPrice += unitPrice * item.quantity;

        await db.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
          [id, item.product_id, item.quantity, unitPrice]
        );
      }

      // Update total price
      await db.execute("UPDATE orders SET total_price = ? WHERE id = ?", [
        totalPrice,
        id,
      ]);
    }

    // Commit transaction
    await db.query("COMMIT");

    res.json({
      success: true,
      message: "Commande modifiée avec succès",
      orderId: id,
      newTotalPrice: totalPrice,
    });
  } catch (err) {
    // Rollback transaction
    try {
      await db.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Erreur lors du rollback :", rollbackErr);
    }

    console.error("Erreur lors de la modification de la commande :", err);

    // Handle specific database errors
    if (err.code === "ER_DATA_TOO_LONG") {
      return res.status(400).json({
        success: false,
        message: "Certaines données sont trop longues",
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Erreur interne du serveur lors de la modification de la commande",
      ...(process.env.NODE_ENV === "development" && { error: err.message }),
    });
  }
}

export async function deleteOrder(req, res) {
  const { id } = req.params;

  try {
    const [result] = await db.execute("DELETE FROM orders WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée",
      });
    }

    res.json({
      success: true,
      message: "Commande supprimée avec succès",
    });
  } catch (err) {
    console.error("Erreur lors de la suppression de la commande :", err);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
}

export async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["في الانتظار", "مؤكد", "تم التسليم", "ملغى"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Statut invalide",
    });
  }

  try {
    const [result] = await db.execute(
      "UPDATE orders SET status = ? WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Commande non trouvée",
      });
    }

    res.json({
      success: true,
      message: "Statut de la commande mis à jour avec succès",
    });
  } catch (err) {
    console.error("Erreur lors de la mise à jour du statut :", err);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
}
