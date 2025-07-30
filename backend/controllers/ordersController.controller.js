import db from "../config/db.js";

// only for a client
export async function addOrder(req, res) {
  const {
    full_name,
    email,
    phone,
    wilaya,
    address,
    notes,
    items, // array of {product_id, quantity}
  } = req.body;

  // Input validation
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

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Format d'email invalide",
    });
  }

  // Validate items structure
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
    // Start transaction
    await db.query("START TRANSACTION");
    const [wilayaFound] = await db.execute(
      "SELECT delivery_fee FROM wilayas WHERE name = ?",
      [wilaya]
    );

    // Since wilaya validation is handled by middleware, we'll assume deliveryFee is available
    const deliveryFee = Number(wilayaFound[0].delivery_fee) || 0;

    // Calculate total price and validate all products
    let totalPrice = deliveryFee;
    const orderItemsData = [];
    const notFoundProducts = [];

    for (const item of items) {
      const [productResult] = await db.execute(
        "SELECT id, name, price, discount_price, discount_start, discount_end, discount_percentage, initial_price, profit FROM products WHERE id = ?",
        [item.product_id]
      );

      if (productResult.length === 0) {
        notFoundProducts.push(item.product_id);
        continue;
      }

      const product = productResult[0];
      console.log("product", product);
      
      // Check if discount is active
      let unitPrice = Number(product.price);
      if (product.discount_price) {
        // Convert database date strings to Date objects
        const discountStart = new Date(product.discount_start);
        const discountEnd = new Date(product.discount_end);
        const now = new Date();
        
        if (now >= discountStart && now <= discountEnd) {
          console.log("Discount is active - using discounted price");
          unitPrice = Number(product.discount_price);
        } else {
          console.log("Discount is not active - outside date range");
        }
      }

      if(item.quantity === 1){
        totalPrice = Number(totalPrice) + (Number(unitPrice) * Number(item.quantity));
      }else{
        unitPrice = Number(product.initial_price) + Number(product.profit) - Number(product.profit * (product.discount_percentage / 100));
        totalPrice = Number(totalPrice) + (Number(unitPrice) * Number(item.quantity));
      }
      orderItemsData.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: Number(item.quantity),
        unit_price: unitPrice,
      });
    }

    // If any products were not found, return error with details
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

    // Insert order
    const [orderResult] = await db.execute(
      `INSERT INTO orders (total_price, status, full_name, email, phone, wilaya, address, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        totalPrice,
        "en attente",
        full_name,
        email,
        phone,
        wilaya,
        address,
        notes || null,
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of orderItemsData) {
      await db.execute(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [orderId, item.product_id, item.quantity, item.unit_price]
      );
    }

    // Commit transaction
    await db.query("COMMIT");

    res.status(201).json({
      success: true,
      orderId: orderId,
      totalPrice: totalPrice,
      deliveryFee: deliveryFee,
      itemsCount: orderItemsData.length,
      message: "Commande créée avec succès",
    });
  } catch (err) {
    // Rollback transaction
    try {
      await db.query("ROLLBACK");
    } catch (rollbackErr) {
      console.error("Erreur lors du rollback :", rollbackErr);
    }

    console.error("Erreur lors de l'ajout de la commande :", err);

    // Handle specific database errors
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

  try {
    let query = `
        SELECT o.*, MAX(w.delivery_fee) as delivery_fee,
               COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN wilayas w ON o.wilaya = w.name
        LEFT JOIN order_items oi ON o.id = oi.order_id
      `;
    let countQuery = "SELECT COUNT(*) as total FROM orders o";
    let params = [];

    if (status) {
      query += " WHERE o.status = ?";
      countQuery += " WHERE status = ?";
      params.push(status);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [orders] = await db.query(query, params);
    const [totalResult] = await db.query(countQuery, status ? [status] : []);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      orders,
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

  const validStatuses = [
    "en attente",
    "confirmée",
    "en préparation",
    "expédiée",
    "livrée",
    "annulée",
  ];

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
