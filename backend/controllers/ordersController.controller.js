import db from '../config/db.js';
import { sendPushNotification } from '../utils/sendPushNotification.js';

import dotenv from 'dotenv';
dotenv.config();

const link = process.env.BACKEND_URL;

// only for a client
export async function addOrder(req, res) {
    const {
        full_name,
        email,
        phone,
        wilaya,
        address,
        notes,
        items,
        pricing_verification,
    } = req.body;

    console.log(req.body);

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
                'Données manquantes ou invalides. Veuillez vérifier tous les champs requis.',
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
        await db.query('START TRANSACTION');

        // Get delivery fee for wilaya
        const [wilayaFound] = await db.execute(
            'SELECT delivery_fee FROM wilayas WHERE name = ?',
            [wilaya]
        );
        const deliveryFee = Number(wilayaFound[0]?.delivery_fee) || 0;

        let subtotal = 0;
        const orderItemsData = [];
        const notFoundProducts = [];
        const processedItems = new Map(); // To merge duplicate items

        // First, merge duplicate items
        for (const item of items) {
            const key = `${item.product_id}_${item.parent_product_id || 'null'}`;
            if (processedItems.has(key)) {
                processedItems.get(key).quantity += item.quantity;
            } else {
                processedItems.set(key, { ...item });
            }
        }

        // Process each unique item
        for (const item of processedItems.values()) {
            let productQuery;
            let productParams;
            let isVariant = false;

            // Check if it's a variant (has parent_product_id)
            if (item.parent_product_id) {
                // This is a variant
                productQuery = `
          SELECT 
            v.id as variant_id,
            v.product_id,
            v.title as variant_title,
            v.price,
            v.discount_price,
            v.discount_start,
            v.discount_end,
            v.discount_percentage,
            v.initial_price,
            v.profit,
            v.discount_threshold,
            v.measure_unit as variant_measure_unit,
            v.allows_custom_quantity as variant_allows_custom_quantity,
            p.name as product_name,
            p.has_measure_unit,
            p.measure_unit as product_measure_unit,
            p.allows_custom_quantity as product_allows_custom_quantity
          FROM product_variants v
          JOIN products p ON v.product_id = p.id
          WHERE v.id = ? AND v.product_id = ? AND v.is_active = 1
        `;
                productParams = [item.product_id, item.parent_product_id];
                isVariant = true;
            } else {
                // This is a regular product
                productQuery = `
          SELECT 
            id,
            name,
            price,
            discount_price,
            discount_start,
            discount_end,
            discount_percentage,
            initial_price,
            profit,
            discount_threshold,
            has_measure_unit,
            measure_unit,
            allows_custom_quantity
          FROM products 
          WHERE id = ?
        `;
                productParams = [item.product_id];
            }

            const [productResult] = await db.execute(
                productQuery,
                productParams
            );

            if (productResult.length === 0) {
                console.warn(`Product with ID ${item.product_id} not found`);
                notFoundProducts.push(item.product_id);
                continue;
            }

            const product = productResult[0];

            // Determine the product name for the order
            const productName = isVariant
                ? `${product.product_name} - ${product.variant_title}`
                : product.name;

            let unitPrice = Number(product.price);
            let basePrice = unitPrice;
            let usedDiscount = false;
            let specialPricing = false;

            // Check for active discount
            if (product.discount_price) {
                const discountStart = new Date(product.discount_start);
                const discountEnd = new Date(product.discount_end);
                const now = new Date();

                if (now >= discountStart && now <= discountEnd) {
                    unitPrice = Number(product.discount_price);
                    basePrice = unitPrice;
                    usedDiscount = true;
                    console.log(
                        `Discount applied on ${productName}: using discount price ${unitPrice}`
                    );
                }
            }

            // Apply threshold pricing consistently with calculatePricing
            if (
                product.discount_threshold &&
                item.quantity >= product.discount_threshold
            ) {
                unitPrice =
                    basePrice *
                    (1 - Number(product.discount_percentage || 0) / 100);
                specialPricing = true;
            }

            subtotal += unitPrice * item.quantity;

            console.log(
                `Item subtotal for ${productName} (Qty: ${item.quantity}): ${
                    unitPrice * item.quantity
                }`
            );

            // Prepare order item data
            const orderItem = {
                product_id: isVariant ? product.product_id : item.product_id,
                variant_id: isVariant ? product.variant_id : null,
                product_name: productName,
                quantity: item.quantity,
                unit_price: unitPrice,
                used_discount: usedDiscount,
                special_pricing: specialPricing,
            };

            orderItemsData.push(orderItem);
        }

        // Check if any products were not found
        if (notFoundProducts.length > 0) {
            await db.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: `Produit(s) non trouvé(s)`,
                details: {
                    notFoundProductIds: notFoundProducts,
                    message: `Les produits avec les IDs suivants n'existent pas: ${notFoundProducts.join(
                        ', '
                    )}`,
                },
            });
        }

        const totalPrice = subtotal + deliveryFee;

        // Verify pricing if provided
        if (pricing_verification) {
            const tolerance = 0.01; // Allow small rounding differences

            if (
                Math.abs(subtotal - pricing_verification.subtotal) > tolerance
            ) {
                console.warn(
                    `Price mismatch - Calculated: ${subtotal}, Expected: ${pricing_verification.subtotal}`
                );
            }

            if (
                Math.abs(
                    totalPrice - pricing_verification.total_with_delivery
                ) > tolerance
            ) {
                console.warn(
                    `Total price mismatch - Calculated: ${totalPrice}, Expected: ${pricing_verification.total_with_delivery}`
                );
            }
        }

        // Insert order
        const [orderResult] = await db.execute(
            `INSERT INTO orders (total_price, status, full_name, email, phone, wilaya, address, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                totalPrice,
                'في الانتظار',
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
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
                [
                    orderId,
                    item.product_id,
                    item.variant_id,
                    item.quantity,
                    item.unit_price,
                ]
            );
        }

        // Create notification for admin
        // Get the current admin user id dynamically
        const [adminRows] = await db.execute(
            "SELECT id FROM users WHERE role = 'admin' ORDER BY id DESC LIMIT 1"
        );
        const adminUserId = adminRows[0]?.id;

        if (!adminUserId) {
            console.warn('No admin user found — skipping notification');
        } else {
            await db.execute(
                `INSERT INTO notification (user_id, content, notification_status, time)
         VALUES (?, ?, ?, NOW())`,
                [adminUserId, `طلب جديد #${orderId} من ${full_name}`, 'unread']
            );
        }

        await db.query('COMMIT');

        if (adminUserId) {
            await sendPushNotification(adminUserId);
        }

        res.status(201).json({
            success: true,
            orderId,
            subtotal,
            deliveryFee,
            totalPrice,
            itemsCount: orderItemsData.length,
            processedItems: orderItemsData.map(item => ({
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.unit_price * item.quantity,
            })),
            message: 'Commande créée avec succès',
        });
    } catch (err) {
        try {
            await db.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Erreur lors du rollback :', rollbackErr);
        }

        console.error("Erreur lors de l'ajout de la commande :", err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Cette commande existe déjà',
            });
        }

        if (err.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({
                success: false,
                message: 'Certaines données sont trop longues',
            });
        }

        res.status(500).json({
            success: false,
            message:
                'Erreur interne du serveur lors de la création de la commande',
            ...(process.env.NODE_ENV === 'development' && {
                error: err.message,
            }),
        });
    }
}

export async function calculatePricing(req, res) {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Items array is required and cannot be empty',
        });
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.product_id || !item.quantity || item.quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: `Item ${i + 1}: product_id and positive quantity are required`,
            });
        }
    }

    try {
        let subtotal = 0;
        const pricingDetails = [];
        const notFoundProducts = [];

        // Fetch all wilayas sorted by ID (ASC)
        const [wilayasResult] = await db.execute(
            'SELECT id, name, delivery_fee FROM wilayas ORDER BY id ASC'
        );

        const wilayas = wilayasResult.map(wilaya => ({
            id: wilaya.id,
            name: wilaya.name,
            delivery_fee: Number(wilaya.delivery_fee),
        }));

        for (const item of items) {
            let product = null;
            let isVariant = false;
            let parentProductId = null;

            // First try to find in product_variants table
            const [variantResult] = await db.execute(
                'SELECT id, title, price, discount_price, discount_start, discount_end, discount_percentage, initial_price, profit, discount_threshold, product_id FROM product_variants WHERE id = ?',
                [item.product_id]
            );

            if (variantResult.length > 0) {
                product = variantResult[0];
                isVariant = true;
                parentProductId = product.product_id;
                console.log(
                    `Found variant: ${product.title} (ID: ${product.id})`
                );

                // Get the main product info for profit calculations
                const [mainProductResult] = await db.execute(
                    'SELECT name, category_id, subcategory_id FROM products WHERE id = ?',
                    [product.product_id]
                );

                if (mainProductResult.length > 0) {
                    product.name = `${mainProductResult[0].name} - ${product.title}`;
                    product.category_id = mainProductResult[0].category_id;
                    product.subcategory_id =
                        mainProductResult[0].subcategory_id;
                }
            } else {
                // If not found in variants, try main products table
                const [productResult] = await db.execute(
                    'SELECT id, name, price, discount_price, discount_start, discount_end, discount_percentage, initial_price, profit, discount_threshold FROM products WHERE id = ?',
                    [item.product_id]
                );

                if (productResult.length > 0) {
                    product = productResult[0];
                    isVariant = false;
                }
            }

            // If product not found in either table
            if (!product) {
                console.warn(
                    `Product/Variant with ID ${item.product_id} not found`
                );
                notFoundProducts.push(item.product_id);
                continue;
            }

            // Store original price for calculations
            const originalPrice = Number(product.price);
            let unitPrice = originalPrice;
            let usedDiscount = false;
            let specialPricing = false;
            let basePrice = originalPrice; // Price before any special pricing calculations

            // Check if discount is active first
            if (product.discount_price) {
                const discountStart = new Date(product.discount_start);
                const discountEnd = new Date(product.discount_end);
                const now = new Date();

                if (now >= discountStart && now <= discountEnd) {
                    unitPrice = Number(product.discount_price);
                    basePrice = unitPrice; // Use discount price as base for further calculations
                    usedDiscount = true;
                    console.log(
                        `Discount applied on ${product.name}: using discount price ${unitPrice}`
                    );
                }
            }

            // Apply special pricing based on discount_threshold
            if (
                product.discount_threshold &&
                item.quantity >= product.discount_threshold
            ) {
                unitPrice =
                    basePrice * (1 - Number(product.discount_percentage) / 100);
                specialPricing = true;
            }

            const itemTotal = unitPrice * item.quantity;
            subtotal += itemTotal;

            console.log(
                `Product: ${product.name}, Quantity: ${item.quantity}, Unit Price: ${unitPrice}, Item Total: ${itemTotal}, Subtotal: ${subtotal}`
            );

            // Calculate savings properly
            let savings = 0;
            if (specialPricing && usedDiscount) {
                // Both discount and special pricing applied
                savings = (originalPrice - unitPrice) * item.quantity;
            } else if (specialPricing) {
                // Only special pricing applied
                savings = (originalPrice - unitPrice) * item.quantity;
            } else if (usedDiscount) {
                // Only discount applied
                savings = (originalPrice - unitPrice) * item.quantity;
            }

            pricingDetails.push({
                product_id: item.product_id,
                product_name: product.name,
                quantity: item.quantity,
                original_price: originalPrice,
                discount_price: product.discount_price
                    ? Number(product.discount_price)
                    : null,
                unit_price: unitPrice,
                item_total: itemTotal,
                used_discount: usedDiscount,
                special_pricing: specialPricing,
                is_variant: isVariant,
                parent_product_id: parentProductId,
                discount_threshold: product.discount_threshold,
                savings: savings,
            });
        }

        if (notFoundProducts.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Product(s) not found`,
                details: {
                    notFoundProductIds: notFoundProducts,
                    message: `Products with the following IDs do not exist in either products or product_variants tables: ${notFoundProducts.join(
                        ', '
                    )}`,
                },
            });
        }

        const totalSavings = pricingDetails.reduce(
            (sum, item) => sum + item.savings,
            0
        );

        // Calculate total with delivery fee for each wilaya (already sorted by ID)
        const pricingWithDelivery = wilayas.map(wilaya => ({
            wilaya_id: wilaya.id,
            wilaya_name: wilaya.name,
            delivery_fee: wilaya.delivery_fee,
            subtotal: subtotal,
            total_with_delivery: subtotal + wilaya.delivery_fee,
            total_savings: totalSavings,
        }));

        res.status(200).json({
            success: true,
            data: {
                subtotal,
                total_savings: totalSavings,
                items_count: pricingDetails.length,
                pricing_details: pricingDetails,
                wilayas: wilayas, // Already sorted by id
            },
            message: 'Pricing calculated successfully with delivery options',
        });
    } catch (err) {
        console.error('Error calculating pricing:', err);

        res.status(500).json({
            success: false,
            message: 'Internal server error while calculating pricing',
            ...(process.env.NODE_ENV === 'development' && {
                error: err.message,
            }),
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
                message: 'Commande non trouvée',
            });
        }

        // Get order items with product AND variant details
        // Prefers variant info/image when variant_id is set, falls back to product-level otherwise
        const [itemsResult] = await db.execute(
            `SELECT 
        oi.*,
        p.name AS product_name,
        p.description AS product_description,
        pv.id AS variant_id_check,
        pv.title AS variant_title,
        pv.size AS variant_size,
        pv.measure_unit AS variant_measure_unit,
        pv.prod_ref AS variant_prod_ref,
        COALESCE(vimg.url, pimg.url) AS product_image
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     LEFT JOIN product_variants pv ON oi.variant_id = pv.id
     LEFT JOIN (
         SELECT variant_id, url
         FROM (
             SELECT
                 variant_id,
                 url,
                 ROW_NUMBER() OVER (
                     PARTITION BY variant_id
                     ORDER BY is_primary DESC, sort_order ASC
                 ) AS rn
             FROM product_variant_images
         ) ranked
         WHERE rn = 1
     ) vimg ON vimg.variant_id = oi.variant_id
     LEFT JOIN (
         SELECT product_id, url
         FROM (
             SELECT
                 product_id,
                 url,
                 ROW_NUMBER() OVER (
                     PARTITION BY product_id
                     ORDER BY is_main DESC, id ASC
                 ) AS rn
             FROM product_images
         ) ranked
         WHERE rn = 1
     ) pimg ON pimg.product_id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
            [id]
        );

        // Build a clean display name: "Product Name - Variant Title" when a variant exists
        const items = itemsResult.map(item => ({
            ...item,
            display_name: item.variant_title
                ? `${item.product_name} - ${item.variant_title}`
                : item.product_name,
        }));

        const order = {
            ...orderResult[0],
            items,
        };

        res.json({
            success: true,
            order,
        });
    } catch (err) {
        console.error('Erreur lors de la récupération de la commande :', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
        });
    }
}

export async function getAllOrders(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;
    console.log('status', status);
    console.log('search', search);

    try {
        let query = `
      SELECT o.*, MAX(w.delivery_fee) as delivery_fee,
             COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN wilayas w ON o.wilaya = w.name
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `;

        let countQuery = 'SELECT COUNT(DISTINCT o.id) as total FROM orders o';
        let whereClauses = [];
        let params = [];
        let countParams = [];

        // Add status filter if provided
        if (status) {
            whereClauses.push('o.status = ?');
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
            const whereClause = ' WHERE ' + whereClauses.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        // Add grouping, ordering and pagination
        query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        console.log('query', query);

        // Execute both queries in parallel
        const [orders, totalResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, countParams),
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
        console.error('Erreur lors de la récupération des commandes :', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
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
            'Erreur lors de la récupération des commandes récentes :',
            err
        );
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
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
            'Erreur lors de la récupération des commandes du jour :',
            err
        );
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
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
            message: 'ID de commande invalide',
        });
    }

    if (!full_name || !email || !phone || !wilaya || !address) {
        return res.status(400).json({
            success: false,
            message:
                'Données manquantes. Tous les champs requis doivent être fournis.',
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
                item => !item.product_id || !item.quantity || item.quantity <= 0
            ))
    ) {
        return res.status(400).json({
            success: false,
            message:
                'Format des articles invalide. Chaque article doit avoir un product_id et une quantité positive.',
        });
    }

    try {
        // Check if order exists
        const [existingOrder] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [id]
        );

        if (existingOrder.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée',
            });
        }

        // Check if order can be modified (not delivered or cancelled)
        if (
            existingOrder[0].status === 'livrée' ||
            existingOrder[0].status === 'annulée'
        ) {
            return res.status(400).json({
                success: false,
                message: `Cette commande ne peut pas être modifiée car elle est ${existingOrder[0].status}`,
            });
        }

        // Start transaction
        await db.query('START TRANSACTION');

        let totalPrice = existingOrder[0].total_price;

        // Verify wilaya exists
        const [wilayaResult] = await db.execute(
            'SELECT delivery_fee FROM wilayas WHERE name = ?',
            [wilaya]
        );

        if (wilayaResult.length === 0) {
            await db.query('ROLLBACK');
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
                    'SELECT id, name, price, discount_price, discount_start, discount_end FROM products WHERE id = ?',
                    [item.product_id]
                );

                if (productResult.length === 0) {
                    notFoundProducts.push(item.product_id);
                } else {
                    validItems.push({ ...item, product: productResult[0] });
                }
            }

            if (notFoundProducts.length > 0) {
                await db.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: `Produit(s) non trouvé(s)`,
                    details: {
                        notFoundProductIds: notFoundProducts,
                        message: `Les produits avec les IDs suivants n'existent pas: ${notFoundProducts.join(
                            ', '
                        )}`,
                    },
                });
            }

            // Delete existing items
            await db.execute('DELETE FROM order_items WHERE order_id = ?', [
                id,
            ]);

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
                    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                    [id, item.product_id, item.quantity, unitPrice]
                );
            }

            // Update total price
            await db.execute('UPDATE orders SET total_price = ? WHERE id = ?', [
                totalPrice,
                id,
            ]);
        }

        // Commit transaction
        await db.query('COMMIT');

        res.json({
            success: true,
            message: 'Commande modifiée avec succès',
            orderId: id,
            newTotalPrice: totalPrice,
        });
    } catch (err) {
        // Rollback transaction
        try {
            await db.query('ROLLBACK');
        } catch (rollbackErr) {
            console.error('Erreur lors du rollback :', rollbackErr);
        }

        console.error('Erreur lors de la modification de la commande :', err);

        // Handle specific database errors
        if (err.code === 'ER_DATA_TOO_LONG') {
            return res.status(400).json({
                success: false,
                message: 'Certaines données sont trop longues',
            });
        }

        res.status(500).json({
            success: false,
            message:
                'Erreur interne du serveur lors de la modification de la commande',
            ...(process.env.NODE_ENV === 'development' && {
                error: err.message,
            }),
        });
    }
}

export async function deleteOrder(req, res) {
    const { id } = req.params;

    try {
        const [result] = await db.execute('DELETE FROM orders WHERE id = ?', [
            id,
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée',
            });
        }

        res.json({
            success: true,
            message: 'Commande supprimée avec succès',
        });
    } catch (err) {
        console.error('Erreur lors de la suppression de la commande :', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
        });
    }
}

export async function updateOrderStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['في الانتظار', 'مؤكد', 'تم التسليم', 'ملغى'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Statut invalide',
        });
    }

    try {
        const [result] = await db.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Commande non trouvée',
            });
        }

        res.json({
            success: true,
            message: 'Statut de la commande mis à jour avec succès',
        });
    } catch (err) {
        console.error('Erreur lors de la mise à jour du statut :', err);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
        });
    }
}
