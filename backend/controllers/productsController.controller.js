import db from "../config/db.js";
import cloudinary from "cloudinary";
const cloudinaryV2 = cloudinary.v2;

//for both client and admin
export async function getAllProducts(req, res) {
  try {
    const { limit = 10, page = 1 } = req.query;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10))) || 10;
    const parsedPage = Math.max(1, parseInt(page, 10)) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    // First get the total count of products
    const [countResult] = await db.execute(
      "SELECT COUNT(*) as total FROM products",
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / parsedLimit);

    // Then get the paginated products - using template literals for LIMIT/OFFSET
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.discount_price,
        p.discount_start,
        p.discount_end,
        p.category_id,
        p.subcategory_id,
        p.has_measure_unit,
        p.measure_unit,
        p.allows_custom_quantity,
        p.prod_ref,
        p.discount_threshold,
        c.name AS category_name,
        s.name AS subcategory_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LIMIT ${parsedLimit} OFFSET ${offset}
    `;

    // Execute without parameters for LIMIT/OFFSET
    const [rows] = await db.execute(query);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found",
        products: [],
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      });
    }

    const productIds = rows.map((p) => p.id);

    // Fetch images for all products in one batch
    const [imagesRows] = await db.execute(
      `SELECT id, url, public_id, is_main, product_id FROM product_images WHERE product_id IN (${productIds
        .map(() => "?")
        .join(",")})`,
      productIds,
    );

    // Fetch tags for all products in one batch
    const [tagsRows] = await db.execute(
      `SELECT 
        pt.product_id,
        t.id as tag_id,
        t.name as tag_name
      FROM product_tags pt
      INNER JOIN tags t ON pt.tag_id = t.id
      WHERE pt.product_id IN (${productIds.map(() => "?").join(",")})`,
      productIds,
    );

    // ✅ Fetch variant counts for all products in one batch
    const [variantsRows] = await db.execute(
      `SELECT 
        product_id,
        COUNT(*) as variant_count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_variant_count
      FROM product_variants 
      WHERE product_id IN (${productIds.map(() => "?").join(",")})
      GROUP BY product_id`,
      productIds,
    );

    // Group images by product ID
    const imagesByProduct = {};
    for (const img of imagesRows) {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push({
        id: img.id,
        url: img.url,
        public_id: img.public_id,
        is_main: img.is_main,
      });
    }

    // Group tags by product ID
    const tagsByProduct = {};
    for (const tag of tagsRows) {
      if (!tagsByProduct[tag.product_id]) {
        tagsByProduct[tag.product_id] = [];
      }
      tagsByProduct[tag.product_id].push({
        id: tag.tag_id,
        name: tag.tag_name,
      });
    }

    // ✅ Group variant counts by product ID
    const variantsByProduct = {};
    for (const variant of variantsRows) {
      variantsByProduct[variant.product_id] = {
        total_variants: variant.variant_count,
        active_variants: variant.active_variant_count,
      };
    }

    const products = rows.map((product) => {
      const images = imagesByProduct[product.id] || [];
      const tags = tagsByProduct[product.id] || [];
      const variants = variantsByProduct[product.id] || {
        total_variants: 0,
        active_variants: 0,
      };
      const mainImage = images.find((img) => img.is_main) || null;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount_price: product.discount_price,
        discount_start: product.discount_start,
        discount_end: product.discount_end,
        has_measure_unit: product.has_measure_unit,
        measure_unit: product.measure_unit,
        allows_custom_quantity: product.allows_custom_quantity,
        prod_ref: product.prod_ref,
        discount_threshold: product.discount_threshold,
        category: {
          id: product.category_id,
          name: product.category_name,
        },
        subcategory: {
          id: product.subcategory_id,
          name: product.subcategory_name,
        },
        images,
        tags,
        main_image_url: mainImage?.url || null,
        has_discount:
          product.discount_price &&
          product.discount_start &&
          product.discount_end,
        total_images: images.length,
        total_tags: tags.length,
        // ✅ Added variant information
        total_variants: variants.total_variants,
        active_variants: variants.active_variants,
        has_variants: variants.total_variants > 0,
      };
    });

    res.status(200).json({
      success: true,
      products,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1,
      },
    });
  } catch (err) {
    console.error("Error while fetching products:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      products: [],
      pagination: null,
    });
  }
}

export async function getProductById(req, res) {
  const { id } = req.params;
  const isAdmin = req.user && req.user.role === "admin";

  try {
    // Build query based on user role
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.discount_price,
        p.discount_start,
        p.discount_end,
        p.category_id,
        p.subcategory_id,
        p.has_measure_unit,
        p.measure_unit,
        p.allows_custom_quantity,
        p.prod_ref,
        p.discount_threshold,
        p.discount_percentage,
        c.name AS category_name,
        s.name AS subcategory_name,
        JSON_ARRAYAGG(
          CASE 
            WHEN pi.id IS NOT NULL 
            THEN JSON_OBJECT(
              'id', pi.id,
              'url', pi.url,
              'is_main', pi.is_main
            )
          END
        ) AS images,
        (SELECT pi2.url FROM product_images pi2 WHERE pi2.product_id = p.id AND pi2.is_main = 1 LIMIT 1) AS main_image_url
    `;

    if (isAdmin) {
      query += `,
        p.initial_price,
        p.profit
      `;
    }

    query += `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = ?
      GROUP BY p.id, p.name, p.description, p.price, p.discount_price, 
        p.discount_start, p.discount_end, p.category_id, p.subcategory_id,
        p.has_measure_unit, p.measure_unit, p.allows_custom_quantity, 
        p.discount_threshold, p.discount_percentage, c.name, s.name
    `;

    if (isAdmin) {
      query += `, p.initial_price, p.profit`;
    }

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    // Get tags
    const [tagRows] = await db.execute(
      `
      SELECT t.name
      FROM product_tags pt
      JOIN tags t ON pt.tag_id = t.id
      WHERE pt.product_id = ?
      `,
      [id],
    );

    const tags = tagRows.map((row) => row.name);

    // Get product variants with their images
    const [variantRows] = await db.execute(
      `
      SELECT 
        pv.id,
        pv.title,
        pv.price,
        pv.discount_price,
        pv.discount_start,
        pv.discount_end,
        pv.measure_unit,
        pv.size,
        pv.is_active,
        pv.allows_custom_quantity,
        JSON_ARRAYAGG(
          CASE 
            WHEN pvi.id IS NOT NULL 
            THEN JSON_OBJECT(
              'id', pvi.id,
              'url', pvi.url,
              'is_primary', pvi.is_primary,
              'sort_order', pvi.sort_order
            )
          END
        ) AS images
      FROM product_variants pv
      LEFT JOIN product_variant_images pvi ON pv.id = pvi.variant_id
      WHERE pv.product_id = ?
      GROUP BY pv.id, pv.title, pv.price, pv.discount_price, 
              pv.discount_start, pv.discount_end, pv.measure_unit, 
              pv.size, pv.is_active, pv.allows_custom_quantity
      ORDER BY pv.id
      `,
      [id],
    );

    // Process variants to include discount status and primary image
    const variants = variantRows.map((variant) => {
      const images = variant.images
        ? variant.images.filter((img) => img !== null)
        : [];
      const primaryImage = images.find((img) => img.is_primary === 1);

      return {
        id: variant.id,
        title: variant.title,
        price: variant.price,
        discount_price: variant.discount_price,
        discount_start: variant.discount_start,
        discount_end: variant.discount_end,
        measure_unit: variant.measure_unit,
        size: variant.size,
        is_active: variant.is_active,
        allows_custom_quantity: variant.allows_custom_quantity,
        has_discount:
          variant.discount_price &&
          variant.discount_start &&
          variant.discount_end,
        images: images.sort((a, b) => a.sort_order - b.sort_order),
        primary_image_url: primaryImage
          ? primaryImage.url
          : images.length > 0
            ? images[0].url
            : null,
        total_images: images.length,
      };
    });

    // Get related products (moved outside of admin check)
    const relatedProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.has_measure_unit,
        p.measure_unit,
        (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_main = 1 LIMIT 1) AS main_image_url
      FROM products p
      WHERE p.id != ? 
      AND (p.category_id = ? OR p.subcategory_id = ?)
      ORDER BY 
        CASE WHEN p.subcategory_id = ? THEN 1 ELSE 2 END,
        RAND()
      LIMIT 8
    `;

    const [relatedRows] = await db.execute(relatedProductsQuery, [
      id,
      product.category_id,
      product.subcategory_id,
      product.subcategory_id,
    ]);

    const relatedProducts = relatedRows.map((related) => ({
      ...related,
      unit_info: {
        has_measure_unit: related.has_measure_unit,
        measure_unit: related.measure_unit,
      },
    }));

    const response = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      discount_price: product.discount_price,
      discount_start: product.discount_start,
      discount_end: product.discount_end,
      has_measure_unit: product.has_measure_unit,
      measure_unit: product.measure_unit,
      allows_custom_quantity: product.allows_custom_quantity,
      prod_ref: product.prod_ref,
      discount_threshold: product.discount_threshold,
      discount_percentage: product.discount_percentage,
      category: {
        id: product.category_id,
        name: product.category_name,
      },
      subcategory: {
        id: product.subcategory_id,
        name: product.subcategory_name,
      },
      images: product.images,
      main_image_url: product.main_image_url,
      tags,
      variants,
      has_variants: variants.length > 0,
      total_variants: variants.length,
      has_discount:
        product.discount_price &&
        product.discount_start &&
        product.discount_end,
      total_images: Array.isArray(product.images)
        ? product.images.filter((img) => img !== null).length
        : 0,
      related_products: relatedProducts,
    };

    // Admin-only fields
    if (isAdmin) {
      response.admin_pricing = {
        initial_price: product.initial_price,
        profit: product.profit,
        discount_percentage: product.discount_percentage,
        calculated_price: product.price,
      };
    }

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error while fetching product:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function searchProduct(req, res) {
  const {
    searchQuery,
    tags,
    category,
    subcategory,
    hasDiscount,
    limit = 20,
    page = 1,
  } = req.query;

  // Check if user is admin
  const isAdmin = req.user && req.user.role === "admin";

  const numericLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const numericPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (numericPage - 1) * numericLimit;

  let queryParams = [];
  let whereClauses = [];

  try {
    if (searchQuery) {
      // Use LIKE search for all queries until FULLTEXT indexes are created
      whereClauses.push(`(
        p.name LIKE ? OR 
        p.description LIKE ? OR 
        c.name LIKE ? OR 
        sc.name LIKE ? OR
        EXISTS (
          SELECT 1 FROM product_tags pt2 
          JOIN tags t2 ON pt2.tag_id = t2.id 
          WHERE pt2.product_id = p.id 
          AND t2.name LIKE ?
        )
      )`);
      // Add the search term 5 times for each LIKE clause
      const likePattern = `%${searchQuery}%`;
      queryParams.push(
        likePattern,
        likePattern,
        likePattern,
        likePattern,
        likePattern,
      );
    }

    if (category) {
      const [categoryExists] = await db.execute(
        "SELECT id FROM categories WHERE name = ?",
        [category],
      );

      if (categoryExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      whereClauses.push("c.name = ?");
      queryParams.push(category);
    }

    if (subcategory) {
      const [subcategoryExists] = await db.execute(
        "SELECT id FROM subcategories WHERE name = ?",
        [subcategory],
      );

      if (subcategoryExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
        });
      }

      whereClauses.push("sc.name = ?");
      queryParams.push(subcategory);
    }

    if (tags) {
      let tagArray = [];

      if (Array.isArray(tags)) {
        tagArray = tags;
      } else if (typeof tags === "string") {
        tagArray = tags.includes(",")
          ? tags.split(",").map((tag) => tag.trim())
          : [tags];
      }

      if (tagArray.length > 0) {
        const tagPlaceholders = tagArray.map(() => "?").join(",");
        whereClauses.push(`(
          SELECT COUNT(DISTINCT t.name) 
          FROM product_tags pt 
          JOIN tags t ON pt.tag_id = t.id 
          WHERE pt.product_id = p.id AND t.name IN (${tagPlaceholders})
        ) = ${tagArray.length}`);
        queryParams.push(...tagArray);
      }
    }

    // Handle hasDiscount filter
    if (hasDiscount === "true") {
      whereClauses.push(`(
        p.discount_price IS NOT NULL 
        AND p.discount_price > 0 
        AND p.discount_start IS NOT NULL 
        AND p.discount_end IS NOT NULL
        AND p.discount_start <= NOW() 
        AND p.discount_end >= NOW()
      )`);
    }

    // Build main product query with conditional admin fields
    let query = `
      SELECT 
        p.id, p.name, p.description, p.price,
        p.discount_price, p.discount_start, p.discount_end,
        p.has_measure_unit, p.measure_unit, p.allows_custom_quantity,
        p.prod_ref, p.discount_threshold,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COUNT(DISTINCT t.id) AS total_tags,
        COUNT(DISTINCT pv.id) AS total_variants
    `;

    // Add admin-only fields
    if (isAdmin) {
      query += `,
        p.initial_price,
        p.profit,
        p.discount_percentage
      `;
    }

    // Simple relevance for LIKE search (optional)
    if (searchQuery) {
      query += `, 1 AS relevance`; // Simple relevance score
    }

    query += `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_tags pt ON p.id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id AND pv.is_active = 1
    `;

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += `
      GROUP BY p.id, p.name, p.description, p.price, p.discount_price, 
               p.discount_start, p.discount_end, p.has_measure_unit, 
               p.measure_unit, p.allows_custom_quantity, c.name, sc.name
    `;

    if (isAdmin) {
      query += `, p.initial_price, p.profit, p.discount_percentage`;
    }

    // Add relevance to GROUP BY if searching
    if (searchQuery) {
      query += `, relevance`;
    }

    // Order by relevance when searching, otherwise by ID
    if (searchQuery) {
      query += ` ORDER BY relevance DESC, p.id DESC`;
    } else {
      query += ` ORDER BY p.id DESC`;
    }

    query += ` LIMIT ${numericLimit} OFFSET ${offset}`;

    const [products] = await db.execute(query, queryParams);

    // Get total count with enhanced search conditions
    let countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_tags pt ON p.id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.id`;

    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    // Calculate count parameters (no relevance calculation parameters to exclude)
    const countParams = queryParams;

    const [totalCount] = await db.execute(countQuery, countParams);

    if (products.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No products found matching your criteria",
        data: [],
        pagination: {
          page: numericPage,
          limit: numericLimit,
          total: totalCount[0].total,
        },
      });
    }

    // Fetch images for all returned products in one query
    const productIds = products.map((p) => p.id);
    const [imagesRows] = await db.execute(
      `SELECT id, url, public_id, is_main, product_id FROM product_images WHERE product_id IN (${productIds
        .map(() => "?")
        .join(",")})`,
      productIds,
    );

    const imagesByProduct = {};
    for (const img of imagesRows) {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push({
        id: img.id,
        url: img.url,
        public_id: img.public_id,
        is_main: img.is_main,
      });
    }

    // Format products with images
    const formattedProducts = products.map((product) => {
      const images = imagesByProduct[product.id] || [];
      const mainImage = images.find((img) => img.is_main) || null;

      // Check if product currently has a valid discount
      const now = new Date();
      const discountStart = product.discount_start
        ? new Date(product.discount_start)
        : null;
      const discountEnd = product.discount_end
        ? new Date(product.discount_end)
        : null;
      const hasValidDiscount =
        product.discount_price &&
        product.discount_price > 0 &&
        discountStart &&
        discountEnd &&
        now >= discountStart &&
        now <= discountEnd;

      const productData = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount_price: product.discount_price,
        discount_start: product.discount_start,
        discount_end: product.discount_end,
        has_measure_unit: product.has_measure_unit,
        measure_unit: product.measure_unit,
        allows_custom_quantity: product.allows_custom_quantity,
        prod_ref: product.prod_ref,
        discount_threshold: product.discount_threshold,
        current_price: hasValidDiscount
          ? product.discount_price
          : product.price, // Actual price to display
        category: {
          name: product.category_name,
        },
        subcategory: {
          name: product.subcategory_name,
        },
        total_tags: parseInt(product.total_tags) || 0,
        total_variants: parseInt(product.total_variants) || 0,
        images,
        main_image_url: mainImage?.url || null,
        has_discount: hasValidDiscount,
        total_images: images.length,
      };

      // Add admin-only pricing information
      if (isAdmin) {
        productData.admin_pricing = {
          initial_price: product.initial_price,
          profit: product.profit,
          discount_percentage: product.discount_percentage,
          calculated_price: product.price, // Show the calculated price for reference
        };
      }

      // Add simple relevance score for debugging
      if (searchQuery && product.relevance !== undefined) {
        productData.relevance = product.relevance;
      }

      return productData;
    });

    res.status(200).json({
      success: true,
      data: formattedProducts,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total: totalCount[0].total,
      },
    });
  } catch (err) {
    console.error("Error searching products:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function modifyProduct(req, res) {
  let connection;
  try {
    const { id } = req.params;

    let {
      name,
      description,
      initial_price,
      profit,
      discount_percentage,
      category,
      subcategory,
      discount_start: discount_start_str,
      discount_end: discount_end_str,
      discount_price,
      tags,
      deleted_images,
      main_image_index,
      has_measure_unit,
      measure_unit,
      prod_ref,
      discount_threshold,
      allows_custom_quantity,
    } = req.body || {};

    console.log("req", req.body);

    const discount_start = toDateOnly(discount_start_str);
    const discount_end = toDateOnly(discount_end_str);

    // Parse JSON fields if sent as strings
    try {
      if (typeof tags === "string") tags = JSON.parse(tags);
      if (typeof deleted_images === "string")
        deleted_images = JSON.parse(deleted_images);
      if (typeof main_image_index === "string")
        main_image_index = parseInt(main_image_index);

      // Parse boolean values
      if (typeof has_measure_unit === "string") {
        has_measure_unit = has_measure_unit === "true";
      } else if (has_measure_unit === undefined) {
        has_measure_unit = false;
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message:
          "فشل في قراءة أحد الحقول (tags, deleted_images, main_image_index, has_measure_unit)",
      });
    }

    let price = null;
    const parsedDiscount = parseFloat(discount_percentage) || 0;
    const parsedDiscountPrice = parseFloat(discount_price);

    let final_discount_start = discount_start;
    let final_discount_end = discount_end;
    let final_discount_price = null;

    if (!isNaN(parsedDiscountPrice) && parsedDiscountPrice >= 0) {
      final_discount_price = parsedDiscountPrice;
    }

    if (parsedDiscount <= 0 || isNaN(parsedDiscount)) {
      final_discount_price = null;
      final_discount_start = null;
      final_discount_end = null;
    }

    if (initial_price !== undefined && profit !== undefined) {
      price = parseFloat(initial_price) + parseFloat(profit);
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [duplicateCheck] = await connection.execute(
      "SELECT id FROM products WHERE name = ? AND id != ?",
      [name, id],
    );

    if (duplicateCheck.length > 0) {
      return res.status(409).json({
        success: false,
        message: `يوجد منتج بنفس الاسم "${name}". يرجى اختيار اسم مختلف`,
        errorType: "DUPLICATE_PRODUCT_NAME",
      });
    }

    let category_id = null;
    let subcategory_id = null;
    const defaultSubcategoryId = 6769;

    if (category) {
      const [catRows] = await connection.execute(
        "SELECT id FROM categories WHERE name = ?",
        [category],
      );
      if (catRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `التصنيف "${category}" غير موجود.`,
        });
      }
      category_id = catRows[0].id;
    }

    if (subcategory) {
      const [subcatRows] = await connection.execute(
        "SELECT id FROM subcategories WHERE name = ? AND category_id = ?",
        [subcategory, category_id],
      );
      if (subcatRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `الفرع "${subcategory}" غير موجود لهذا التصنيف.`,
        });
      }
      subcategory_id = subcatRows[0].id;
    } else {
      subcategory_id = await ensureDefaultSubcategory(
        connection,
        category_id,
        defaultSubcategoryId,
      );
    }

    // Update query with new fields
    await connection.execute(
      `UPDATE products SET 
    name = ?, description = ?, initial_price = ?, profit = ?, price = ?, 
    discount_percentage = ?, discount_price = ?, discount_start = ?, 
    discount_end = ?, category_id = ?, subcategory_id = ?,
    has_measure_unit = ?, measure_unit = ?, prod_ref = ?, discount_threshold = ?,
    allows_custom_quantity = ?
  WHERE id = ?`,
      [
        name,
        description,
        initial_price,
        profit,
        price,
        parsedDiscount,
        final_discount_price,
        final_discount_start || null,
        final_discount_end || null,
        category_id,
        subcategory_id,
        has_measure_unit,
        measure_unit || null,
        prod_ref || null,
        discount_threshold || null,
        allows_custom_quantity === "true" || allows_custom_quantity === true,
        id,
      ],
    );

    if (deleted_images?.length) {
      const urlsToDelete = deleted_images
        .map((img) => (typeof img === "string" ? img : img.url))
        .filter((url) => url);

      if (urlsToDelete.length > 0) {
        const placeholders = urlsToDelete.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM product_images WHERE product_id = ? AND url IN (${placeholders})`,
          [id, ...urlsToDelete],
        );
      }
    }

    if (req.uploadedImages?.length) {
      for (const imageData of req.uploadedImages) {
        await connection.execute(
          "INSERT INTO product_images (product_id, url, public_id) VALUES (?, ?, ?)",
          [id, imageData.url, imageData.public_id],
        );
      }
    }

    const [updatedImages] = await connection.execute(
      "SELECT id, url, public_id, is_main FROM product_images WHERE product_id = ?",
      [id],
    );

    if (updatedImages.length > 0) {
      const targetIndex =
        typeof main_image_index === "number" &&
        main_image_index >= 0 &&
        main_image_index < updatedImages.length
          ? main_image_index
          : 0;

      const mainImageId = updatedImages[targetIndex].id;

      await connection.execute(
        "UPDATE product_images SET is_main = FALSE WHERE product_id = ?",
        [id],
      );

      await connection.execute(
        "UPDATE product_images SET is_main = TRUE WHERE id = ?",
        [mainImageId],
      );
    }

    await connection.execute("DELETE FROM product_tags WHERE product_id = ?", [
      id,
    ]);

    if (tags?.length) {
      for (const tagName of tags) {
        if (!tagName || typeof tagName !== "string") continue;

        const [existingTag] = await connection.execute(
          "SELECT id FROM tags WHERE name = ?",
          [tagName.trim()],
        );

        let tagId;
        if (existingTag.length > 0) {
          tagId = existingTag[0].id;
        } else {
          const [insertResult] = await connection.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName.trim()],
          );
          tagId = insertResult.insertId;
        }

        await connection.execute(
          "INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)",
          [id, tagId],
        );
      }
    }

    await connection.commit();

    res.status(200).json({
      success: true,
      message: "تم تحديث المنتج بنجاح",
    });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({
      success: false,
      message: "حدث خطأ أثناء تعديل المنتج",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

// Enhanced Backend Response Handler
export async function addProduct(req, res) {
  const {
    name,
    description,
    initial_price,
    profit,
    category,
    subcategory,
    discount_percentage = 0,
    discount_price,
    discount_start,
    discount_end,
    main_image_index = 0,
    tags = [],
    // Keep existing fields that match your schema
    has_measure_unit = false,
    measure_unit = null,
    allows_custom_quantity = false,
    prod_ref = null,
    discount_threshold = null,
  } = req.body;

  console.log("req body of adding", req.body);

  const validationErrors = [];
  if (!name)
    validationErrors.push({ field: "name", message: "اسم المنتج مطلوب" });
  if (!description)
    validationErrors.push({
      field: "description",
      message: "وصف المنتج مطلوب",
    });
  if (!initial_price)
    validationErrors.push({
      field: "initial_price",
      message: "السعر الأساسي مطلوب",
    });
  if (!profit)
    validationErrors.push({ field: "profit", message: "هامش الربح مطلوب" });
  if (!category)
    validationErrors.push({ field: "category", message: "الفئة مطلوبة" });
  if (!subcategory)
    validationErrors.push({
      field: "subcategory",
      message: "الفئة الفرعية مطلوبة",
    });

  // Validate measure_unit
  const parsed_has_measure_unit =
    typeof has_measure_unit === "string"
      ? has_measure_unit.toLowerCase() === "true"
      : has_measure_unit;
  if (parsed_has_measure_unit && !measure_unit) {
    validationErrors.push({
      field: "measure_unit",
      message: "وحدة القياس مطلوبة",
    });
  }

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "بيانات غير مكتملة",
      description: "يرجى ملء جميع الحقول المطلوبة",
      errors: validationErrors,
      errorType: "VALIDATION_ERROR",
    });
  }

  let parsedTags = tags;
  if (typeof tags === "string") {
    try {
      parsedTags = JSON.parse(tags);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "خطأ في تنسيق الكلمات المفتاحية",
        description: "تأكد من صحة تنسيق الكلمات المفتاحية",
        errorType: "TAGS_FORMAT_ERROR",
      });
    }
  }

  const initialPriceFloat = parseFloat(initial_price);
  const profitFloat = parseFloat(profit);

  if (isNaN(initialPriceFloat) || initialPriceFloat <= 0) {
    return res.status(400).json({
      success: false,
      message: "السعر الأساسي غير صحيح",
      description: "يجب أن يكون السعر الأساسي رقماً موجباً",
      errorType: "INVALID_PRICE",
    });
  }

  if (isNaN(profitFloat) || profitFloat < 0) {
    return res.status(400).json({
      success: false,
      message: "هامش الربح غير صحيح",
      description: "يجب أن يكون هامش الربح رقماً موجباً أو صفر",
      errorType: "INVALID_PROFIT",
    });
  }

  const price = initialPriceFloat + profitFloat;

  const hasDiscountPrice =
    discount_price !== undefined &&
    discount_price !== null &&
    parseFloat(discount_price) > 0;

  const hasDiscountDates =
    discount_start !== undefined &&
    discount_start !== null &&
    discount_start !== "" &&
    discount_end !== undefined &&
    discount_end !== null &&
    discount_end !== "";

  const hasAllDiscountFields = hasDiscountPrice && hasDiscountDates;

  if (hasDiscountDates) {
    const startDate = new Date(discount_start);
    const endDate = new Date(discount_end);
    const now = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "تواريخ الخصم غير صحيحة",
        description: "يجب أن يكون تاريخ بداية الخصم قبل تاريخ النهاية",
        errorType: "INVALID_DISCOUNT_DATES",
      });
    }

    if (endDate <= now) {
      return res.status(400).json({
        success: false,
        message: "تاريخ انتهاء الخصم غير صحيح",
        description: "يجب أن يكون تاريخ انتهاء الخصم في المستقبل",
        errorType: "EXPIRED_DISCOUNT_DATE",
      });
    }
  }

  const imageUrls = req.uploadedImages?.map((img) => img.url) || [];

  if (!imageUrls.length) {
    return res.status(400).json({
      success: false,
      message: "لا توجد صور للمنتج",
      description: "يجب إضافة صورة واحدة على الأقل للمنتج",
      errorType: "NO_IMAGES",
    });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [categoryRows] = await connection.execute(
      "SELECT id FROM categories WHERE name = ?",
      [category],
    );

    if (!categoryRows.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "الفئة غير موجودة",
        description: `الفئة "${category}" غير متوفرة في النظام`,
        errorType: "CATEGORY_NOT_FOUND",
      });
    }
    const category_id = categoryRows[0].id;

    let subcategory_id = null;
    const defaultSubcategoryId = 6769;

    if (subcategory) {
      const [subcategoryRows] = await connection.execute(
        "SELECT id FROM subcategories WHERE name = ? AND category_id = ?",
        [subcategory, category_id],
      );

      if (!subcategoryRows.length) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "الفئة الفرعية غير موجودة",
          description: `الفئة الفرعية "${subcategory}" غير متوفرة في فئة "${category}"`,
          errorType: "SUBCATEGORY_NOT_FOUND",
        });
      }
      subcategory_id = subcategoryRows[0].id;
    } else {
      subcategory_id = await ensureDefaultSubcategory(
        connection,
        category_id,
        defaultSubcategoryId,
      );
    }

    const [existingProduct] = await connection.execute(
      "SELECT id FROM products WHERE name = ?",
      [name],
    );

    if (existingProduct.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "اسم المنتج موجود مسبقاً",
        description: `يوجد منتج بنفس الاسم "${name}". يرجى اختيار اسم مختلف`,
        errorType: "DUPLICATE_PRODUCT_NAME",
      });
    }

    // Parse boolean values properly
    const parsed_allows_custom_quantity =
      typeof allows_custom_quantity === "string"
        ? allows_custom_quantity.toLowerCase() === "true"
        : allows_custom_quantity;

    // Base columns and values that match your schema exactly
    const baseColumns = [
      "name",
      "description",
      "price",
      "category_id",
      "subcategory_id",
      "initial_price",
      "profit",
      "discount_percentage",
      "has_measure_unit",
      "measure_unit",
      "allows_custom_quantity",
      "prod_ref",
      "discount_threshold",
    ];
    const baseValues = [
      name,
      description,
      price,
      category_id,
      subcategory_id,
      initialPriceFloat,
      profitFloat,
      parseFloat(discount_percentage),
      parsed_has_measure_unit,
      parsed_has_measure_unit ? measure_unit : null,
      parsed_allows_custom_quantity,
      prod_ref || null,
      discount_threshold ? parseInt(discount_threshold) : null,
    ];

    if (hasAllDiscountFields) {
      const discountPriceFloat = parseFloat(discount_price);

      if (price <= discountPriceFloat) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "سعر الخصم غير صحيح",
          description: `سعر الخصم (${discountPriceFloat}) يجب أن يكون أقل من السعر الأساسي (${price})`,
          errorType: "INVALID_DISCOUNT_PRICE",
        });
      }

      baseColumns.push("discount_price", "discount_start", "discount_end");
      baseValues.push(discountPriceFloat, discount_start, discount_end);
    }

    const sql = `INSERT INTO products (${baseColumns.join(
      ", ",
    )}) VALUES (${baseColumns.map(() => "?").join(", ")})`;
    const [result] = await connection.execute(sql, baseValues);
    const productId = result.insertId;

    for (let i = 0; i < req.uploadedImages.length; i++) {
      const isMain = i === parseInt(main_image_index);
      const imageData = req.uploadedImages[i];
      await connection.execute(
        "INSERT INTO product_images (url, public_id, product_id, is_main) VALUES (?, ?, ?, ?)",
        [imageData.url, imageData.public_id, productId, isMain],
      );
    }

    let processedTagsCount = 0;
    if (parsedTags.length > 0) {
      for (const tagName of parsedTags) {
        let [tagRows] = await connection.execute(
          "SELECT id FROM tags WHERE name = ?",
          [tagName],
        );

        let tagId;
        if (tagRows.length) {
          tagId = tagRows[0].id;
        } else {
          const [newTag] = await connection.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName],
          );
          tagId = newTag.insertId;
        }

        await connection.execute(
          "INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)",
          [productId, tagId],
        );
        processedTagsCount++;
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "تم إضافة المنتج بنجاح! 🎉",
      description: "تم حفظ المنتج وجميع البيانات المرفقة بنجاح",
      data: {
        productId: productId,
        name: name,
        price: price,
        category: category,
        subcategory: subcategory,
        imagesCount: imageUrls.length,
        tagsCount: processedTagsCount,
        hasDiscount: hasAllDiscountFields,
        has_measure_unit: parsed_has_measure_unit,
        measure_unit: parsed_has_measure_unit ? measure_unit : null,
        allows_custom_quantity: parsed_allows_custom_quantity,
        discountInfo: hasAllDiscountFields
          ? {
              discountPrice: parseFloat(discount_price),
              discountStart: discount_start,
              discountEnd: discount_end,
            }
          : null,
      },
    });
  } catch (err) {
    console.error("addProduct error:", err);
    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى لاحقاً",
      errorType: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

function toDateOnly(isoString) {
  return typeof isoString === "string" ? isoString.split("T")[0] : null;
}

async function ensureDefaultSubcategory(connection, categoryId, subcategoryId) {
  if (!categoryId) {
    return subcategoryId;
  }

  const [existingRows] = await connection.execute(
    "SELECT id FROM subcategories WHERE id = ?",
    [subcategoryId],
  );

  if (existingRows.length > 0) {
    return subcategoryId;
  }

  await connection.execute(
    "INSERT INTO subcategories (id, category_id, name) VALUES (?, ?, ?)",
    [subcategoryId, categoryId, "بدون فئة فرعية"],
  );

  return subcategoryId;
}

export async function deleteProduct(req, res) {
  const { id } = req.params;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Get product images first (for Cloudinary cleanup)
    const [images] = await connection.execute(
      "SELECT url FROM product_images WHERE product_id = ?",
      [id],
    );

    // 2. Verify product exists
    const [product] = await connection.execute(
      "SELECT id FROM products WHERE id = ?",
      [id],
    );

    if (product.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // 3. Check for orders containing this product
    const [ordersWithProduct] = await connection.execute(
      `SELECT o.id, o.status, o.created_at, o.total_price, 
       oi.quantity, oi.unit_price 
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE oi.product_id = ?`,
      [id],
    );

    // If there are orders with this product, we'll need to delete them first
    if (ordersWithProduct.length > 0) {
      // Get all order IDs that contain this product
      const orderIds = ordersWithProduct.map((order) => order.id);

      // Create placeholders for the IN clause
      const placeholders = orderIds.map(() => "?").join(",");

      // Delete order items first (to maintain referential integrity)
      await connection.execute(
        `DELETE FROM order_items WHERE order_id IN (${placeholders})`,
        orderIds,
      );

      // Then delete the orders
      await connection.execute(
        `DELETE FROM orders WHERE id IN (${placeholders})`,
        orderIds,
      );
    }

    // 4. Delete related records (to maintain referential integrity)
    await connection.execute("DELETE FROM product_tags WHERE product_id = ?", [
      id,
    ]);

    await connection.execute(
      "DELETE FROM product_images WHERE product_id = ?",
      [id],
    );

    // 5. Delete the product
    await connection.execute("DELETE FROM products WHERE id = ?", [id]);

    await connection.commit();

    // 6. Delete from Cloudinary (after successful DB deletion)
    if (images.length > 0) {
      await deleteCloudinaryImages(images.map((img) => img.url));
    }

    res.status(200).json({
      success: true,
      message: "Product and all related data deleted successfully",
      deletedOrders:
        ordersWithProduct.length > 0 ? ordersWithProduct : undefined,
      ordersCount: ordersWithProduct.length,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Delete product error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (connection) connection.release();
  }
}
// Helper function for Cloudinary deletion
async function deleteCloudinaryImages(imageUrls) {
  return Promise.all(
    imageUrls.map((url) => {
      const publicId = url.split("/").pop().split(".")[0];
      return cloudinaryV2.uploader.destroy(publicId);
    }),
  );
}

export async function removeProductDiscount(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }
    if (
      rows[0].discount_price === null &&
      rows[0].discount_start === null &&
      rows[0].discount_end === null
    ) {
      return res
        .status(400)
        .json({ message: "Product discount already removed" });
    }
    await db.execute(
      `UPDATE products 
       SET discount_price = NULL, 
           discount_start = NULL, 
           discount_end = NULL 
       WHERE id = ?`,
      [id],
    );
    res.status(200).json({
      message: "Product discount removed successfully",
    });
  } catch (err) {
    console.error("Delete product discount error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

export async function removeProductDiscountPercentage(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    await db.execute(
      `UPDATE products 
       SET discount_price = ?, 
           discount_start = NULL, 
           discount_end = NULL 
       WHERE id = ?`,
      [0, id],
    );

    return res.status(200).json({
      message: "Discount removed successfully",
    });
  } catch (err) {
    console.error("Remove product discount error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}

// ADD PRODUCT VARIANT
export async function addProductVariants(req, res) {
  console.log("Adding multiple product variants");

  // Helper functions
  function toMySQLDateTime(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace("T", " ");
  }

  function calculateDiscountPercentage(price, discountPrice) {
    if (!discountPrice || !price || price <= 0) return null;
    return ((price - discountPrice) / price) * 100;
  }

  // Parse variants
  let variants;
  try {
    variants = JSON.parse(req.body.variants);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "بيانات المتغيرات غير صحيحة",
      errorType: "INVALID_VARIANTS_DATA",
    });
  }

  const { product_id } = req.body;

  // VALIDATION - Fixed for new pricing structure
  const errors = [];
  if (!product_id) {
    errors.push({ field: "product_id", message: "رقم المنتج مطلوب" });
  }

  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    errors.push({ field: "variants", message: "متغيرات المنتج مطلوبة" });
  }

  variants.forEach((variant, index) => {
    if (!variant.title) {
      errors.push({
        field: `variants[${index}].title`,
        message: `عنوان المتغير ${index + 1} مطلوب`,
      });
    }

    // Validate initial_price
    if (!variant.initial_price || variant.initial_price <= 0) {
      errors.push({
        field: `variants[${index}].initial_price`,
        message: `السعر الأساسي للمتغير ${index + 1} مطلوب`,
      });
    }

    // Validate profit
    if (typeof variant.profit === "undefined" || variant.profit === null) {
      errors.push({
        field: `variants[${index}].profit`,
        message: `الربح للمتغير ${index + 1} مطلوب`,
      });
    }

    const initialPrice = parseFloat(variant.initial_price);
    const profit = parseFloat(variant.profit || 0);

    if (isNaN(initialPrice)) {
      errors.push({
        field: `variants[${index}].initial_price`,
        message: `السعر الأساسي للمتغير ${index + 1} غير صحيح`,
      });
    }

    if (isNaN(profit) || profit < 0) {
      errors.push({
        field: `variants[${index}].profit`,
        message: `الربح للمتغير ${index + 1} غير صحيح أو سالب`,
      });
    }

    // Calculate final price (initial_price + profit)
    const finalPrice = initialPrice + profit;

    // Discount validation using calculated final price
    if (variant.discount_price) {
      const discountPrice = parseFloat(variant.discount_price);
      if (discountPrice >= finalPrice) {
        errors.push({
          field: `variants[${index}].discount_price`,
          message: `سعر الخصم يجب أن يكون أقل من السعر النهائي (${finalPrice.toFixed(
            2,
          )})`,
        });
      }

      // If discount_price is provided, require discount dates
      if (variant.discount_start && variant.discount_end) {
        const startDate = new Date(variant.discount_start);
        const endDate = new Date(variant.discount_end);
        if (startDate >= endDate) {
          errors.push({
            field: `variants[${index}].discount_dates`,
            message: `تاريخ انتهاء الخصم يجب أن يكون بعد تاريخ البداية`,
          });
        }
      }
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "بيانات غير مكتملة",
      errors,
      errorType: "VALIDATION_ERROR",
    });
  }
  const variantImages = req.variantUploadedImages || {};

  // Database operations
  let conn;
  try {
    conn = await db.getConnection({ timeout: 30000 });
    await conn.beginTransaction();

    // Verify product exists
    const [productCheck] = await conn.execute(
      "SELECT id FROM products WHERE id = ?",
      [product_id],
    );

    if (!productCheck.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "المنتج غير موجود",
        errorType: "PRODUCT_NOT_FOUND",
      });
    }

    const insertedVariants = [];

    // Process each variant with new pricing logic
    for (const [index, variant] of variants.entries()) {
      const initialPrice = parseFloat(variant.initial_price);
      const profit = parseFloat(variant.profit || 0);
      const finalPrice = initialPrice + profit; // This is the calculated price

      // Discount calculations
      const hasDiscount =
        variant.discount_price &&
        variant.discount_start &&
        variant.discount_end;
      const discountPercentage = hasDiscount
        ? calculateDiscountPercentage(
            finalPrice,
            parseFloat(variant.discount_price),
          )
        : null;

      // Prepare INSERT statement - Note: we store finalPrice as 'price' in DB
      const cols = [
        "product_id",
        "title",
        "price",
        "initial_price",
        "profit",
        "measure_unit",
        "size",
        "is_active",
        "prod_ref",
        "discount_threshold",
        "allows_custom_quantity",
      ];

      const vals = [
        product_id,
        variant.title,
        finalPrice,
        initialPrice,
        profit,
        variant.measure_unit || null,
        variant.size || null,
        variant.is_active ? 1 : 0,
        variant.prod_ref || null,
        variant.discount_threshold
          ? parseInt(variant.discount_threshold)
          : null,
        variant.allows_custom_quantity ? 1 : 0,
      ];

      // Add discount fields if applicable
      if (hasDiscount) {
        cols.push(
          "discount_price",
          "discount_start",
          "discount_end",
          "discount_percentage",
        );
        vals.push(
          parseFloat(variant.discount_price),
          toMySQLDateTime(variant.discount_start),
          toMySQLDateTime(variant.discount_end),
          discountPercentage,
        );
      }

      // Execute INSERT
      const [result] = await conn.execute(
        `INSERT INTO product_variants (${cols.join(",")}) VALUES (${cols
          .map(() => "?")
          .join(",")})`,
        vals,
      );

      const variantId = result.insertId;

      // FIXED: Handle images from processed middleware data
      const currentVariantImages = variantImages[index] || [];
      console.log(
        "currentVariantImages for variant",
        index,
        ":",
        currentVariantImages,
      );

      if (currentVariantImages.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `لا توجد صور للمتغير ${index + 1}`,
          errorType: "NO_IMAGES_FOR_VARIANT",
        });
      }

      const mainImageIndex = parseInt(variant.main_image_index) || 0;
      for (const [imgIndex, image] of currentVariantImages.entries()) {
        await conn.execute(
          `INSERT INTO product_variant_images (variant_id, url, public_id, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)`,
          [
            variantId,
            image.url,
            image.public_id,
            imgIndex === mainImageIndex ? 1 : 0,
            imgIndex,
          ],
        );
      }

      insertedVariants.push({
        variantId,
        title: variant.title,
        initialPrice,
        profit,
        finalPrice,
        discountPrice: variant.discount_price,
        imagesCount: currentVariantImages.length,
      });
    }

    await conn.commit();

    res.status(201).json({
      success: true,
      message: `تمت إضافة ${variants.length} متغيرات بنجاح`,
      data: {
        insertedVariants,
        totalVariants: variants.length,
      },
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (conn) conn.release();
  }
}

// MODIFY PRODUCT VARIANT
export async function editVariants(req, res) {
  // Helper functions
  function toMySQLDateTime(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace("T", " ");
  }

  function calculateDiscountPercentage(price, discountPrice) {
    if (!discountPrice || !price || price <= 0) return null;
    return ((price - discountPrice) / price) * 100;
  }

  // Parse variants
  let variants;
  try {
    variants = JSON.parse(req.body.variants);
    console.log("variants to edit", variants);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "بيانات المتغيرات غير صحيحة",
      errorType: "INVALID_VARIANTS_DATA",
    });
  }

  const { id: productId } = req.params; // Get productId from params

  // VALIDATION
  const errors = [];
  if (!productId) {
    errors.push({ field: "product_id", message: "رقم المنتج مطلوب" });
  }
  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    errors.push({ field: "variants", message: "متغيرات المنتج مطلوبة" });
  }

  variants.forEach((variant, index) => {
    // Validate variant ID
    if (!variant.id) {
      errors.push({
        field: `variants[${index}].id`,
        message: `رقم المتغير ${index + 1} مطلوب`,
      });
    }

    if (!variant.title) {
      errors.push({
        field: `variants[${index}].title`,
        message: `عنوان المتغير ${index + 1} مطلوب`,
      });
    }

    // Validate initial_price
    if (!variant.initial_price || variant.initial_price <= 0) {
      errors.push({
        field: `variants[${index}].initial_price`,
        message: `السعر الأساسي للمتغير ${index + 1} مطلوب`,
      });
    }

    // Validate profit
    if (typeof variant.profit === "undefined" || variant.profit === null) {
      errors.push({
        field: `variants[${index}].profit`,
        message: `الربح للمتغير ${index + 1} مطلوب`,
      });
    }

    const initialPrice = parseFloat(variant.initial_price);
    const profit = parseFloat(variant.profit || 0);

    if (isNaN(initialPrice)) {
      errors.push({
        field: `variants[${index}].initial_price`,
        message: `السعر الأساسي للمتغير ${index + 1} غير صحيح`,
      });
    }

    if (isNaN(profit) || profit < 0) {
      errors.push({
        field: `variants[${index}].profit`,
        message: `الربح للمتغير ${index + 1} غير صحيح أو سالب`,
      });
    }

    // Validate discountPercentage if provided
    if (
      variant.discountPercentage !== null &&
      variant.discountPercentage !== undefined &&
      variant.discountPercentage !== ""
    ) {
      const discountPerc = parseFloat(variant.discountPercentage);
      if (isNaN(discountPerc) || discountPerc < 0 || discountPerc > 100) {
        errors.push({
          field: `variants[${index}].discountPercentage`,
          message: `نسبة خصم الكمية للمتغير ${
            index + 1
          } يجب أن تكون بين 0 و 100`,
        });
      }
    }

    // Calculate final price (initial_price + profit)
    const finalPrice = initialPrice + profit;

    // Discount validation using calculated final price
    if (variant.discount_price) {
      const discountPrice = parseFloat(variant.discount_price);
      if (discountPrice >= finalPrice) {
        errors.push({
          field: `variants[${index}].discount_price`,
          message: `سعر الخصم يجب أن يكون أقل من السعر النهائي (${finalPrice.toFixed(
            2,
          )})`,
        });
      }

      // If discount_price is provided, require discount dates
      if (variant.discount_start && variant.discount_end) {
        const startDate = new Date(variant.discount_start);
        const endDate = new Date(variant.discount_end);
        if (startDate >= endDate) {
          errors.push({
            field: `variants[${index}].discount_dates`,
            message: `تاريخ انتهاء الخصم يجب أن يكون بعد تاريخ البداية`,
          });
        }
      }
    }

    // Validate deletedImages if provided
    if (variant.deletedImages && Array.isArray(variant.deletedImages)) {
      for (const imageId of variant.deletedImages) {
        if (!Number.isInteger(imageId) || imageId <= 0) {
          errors.push({
            field: `variants[${index}].deletedImages`,
            message: `معرف الصورة المحذوفة غير صحيح في المتغير ${index + 1}`,
          });
        }
      }
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "بيانات غير مكتملة",
      errors,
      errorType: "VALIDATION_ERROR",
    });
  }

  // Get uploaded images from middleware processed data
  const variantImages = req.variantUploadedImages || {};

  // Database operations
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Verify product exists
    const [productCheck] = await conn.execute(
      "SELECT id FROM products WHERE id = ?",
      [productId],
    );

    if (!productCheck.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "المنتج غير موجود",
        errorType: "PRODUCT_NOT_FOUND",
      });
    }

    const updatedVariants = [];

    // Process each variant
    for (const [index, variant] of variants.entries()) {
      // Verify variant exists and belongs to the correct product
      const [variantCheck] = await conn.execute(
        "SELECT id, product_id FROM product_variants WHERE id = ? AND product_id = ?",
        [variant.id, productId],
      );

      if (!variantCheck.length) {
        await conn.rollback();
        return res.status(404).json({
          success: false,
          message: `المتغير برقم ${variant.id} غير موجود`,
          errorType: "VARIANT_NOT_FOUND",
        });
      }

      const initialPrice = parseFloat(variant.initial_price);
      const profit = parseFloat(variant.profit || 0);
      const finalPrice = initialPrice + profit;

      // Discount calculations
      const hasDiscount =
        variant.discount_price &&
        variant.discount_start &&
        variant.discount_end;
      const discountPercentage = hasDiscount
        ? calculateDiscountPercentage(
            finalPrice,
            parseFloat(variant.discount_price),
          )
        : null;

      // Handle bulk discount percentage
      const bulkDiscountPercentage =
        variant.discountPercentage && variant.discountPercentage !== ""
          ? parseFloat(variant.discountPercentage)
          : null;

      // Prepare UPDATE statement
      const updateCols = [
        "title = ?",
        "price = ?",
        "initial_price = ?",
        "profit = ?",
        "measure_unit = ?",
        "size = ?",
        "is_active = ?",
        "prod_ref = ?",
        "discount_threshold = ?",
        "allows_custom_quantity = ?",
        "updated_at = NOW()",
      ];

      const updateVals = [
        variant.title,
        finalPrice,
        initialPrice,
        profit,
        variant.measure_unit || null,
        variant.size || null,
        variant.is_active ? 1 : 0,
        variant.prod_ref || null,
        variant.discount_threshold
          ? parseInt(variant.discount_threshold)
          : null,
        variant.allows_custom_quantity ? 1 : 0,
      ];

      // Handle discount fields
      if (hasDiscount) {
        updateCols.push(
          "discount_price = ?",
          "discount_start = ?",
          "discount_end = ?",
          "discount_percentage = ?",
        );
        updateVals.push(
          parseFloat(variant.discount_price),
          toMySQLDateTime(variant.discount_start),
          toMySQLDateTime(variant.discount_end),
          discountPercentage,
        );
      } else {
        // Clear discount fields if no discount but preserve bulk discount
        updateCols.push(
          "discount_price = NULL",
          "discount_start = NULL",
          "discount_end = NULL",
        );

        // Only set bulk discount percentage if no regular discount
        if (
          bulkDiscountPercentage !== null &&
          bulkDiscountPercentage !== undefined
        ) {
          updateCols.push("discount_percentage = ?");
          updateVals.push(bulkDiscountPercentage);
        }
      }

      // Handle bulk discount percentage
      updateCols.push("discount_percentage = ?");
      updateVals.push(bulkDiscountPercentage);

      updateVals.push(variant.id);

      console.log("Updating variant with values:", {
        id: variant.id,
        title: variant.title,
        finalPrice: finalPrice,
        initialPrice: initialPrice,
        profit: profit,
        discountPrice: variant.discount_price,
        bulkDiscountPercentage: bulkDiscountPercentage,
      });

      // Execute UPDATE
      await conn.execute(
        `UPDATE product_variants SET ${updateCols.join(", ")} WHERE id = ?`,
        updateVals,
      );

      // Handle image deletion if provided
      let deletedImagesCount = 0;
      if (variant.deletedImages && variant.deletedImages.length > 0) {
        console.log(
          `Deleting images for variant ${variant.id}:`,
          variant.deletedImages,
        );

        // Verify that images belong to this variant before deletion
        const [imagesToDelete] = await conn.execute(
          `SELECT id, public_id FROM product_variant_images 
           WHERE id IN (${variant.deletedImages.map(() => "?").join(",")}) 
           AND variant_id = ?`,
          [...variant.deletedImages, variant.id],
        );

        if (imagesToDelete.length > 0) {
          // Store public_ids of deleted images
          if (!req.body.deletedImagesPublicKeys) {
            req.body.deletedImagesPublicKeys = [];
          }
          req.body.deletedImagesPublicKeys.push(
            ...imagesToDelete.map((img) => img.public_id),
          );

          // Delete the images from database
          await conn.execute(
            `DELETE FROM product_variant_images 
             WHERE id IN (${imagesToDelete.map(() => "?").join(",")}) 
             AND variant_id = ?`,
            [...imagesToDelete.map((img) => img.id), variant.id],
          );

          deletedImagesCount = imagesToDelete.length;
          console.log(
            `Successfully deleted ${deletedImagesCount} images for variant ${variant.id}`,
          );
        }
      }

      // Reorder remaining images after deletion
      const [remainingImages] = await conn.execute(
        "SELECT id FROM product_variant_images WHERE variant_id = ? ORDER BY sort_order ASC",
        [variant.id],
      );

      for (const [imgIndex, img] of remainingImages.entries()) {
        await conn.execute(
          "UPDATE product_variant_images SET sort_order = ? WHERE id = ?",
          [imgIndex, img.id],
        );
      }

      // Handle new images if provided for this variant
      const currentVariantImages = variantImages[variant.id];
      let newImagesCount = 0;
      if (currentVariantImages && currentVariantImages.length > 0) {
        // Get current images count after deletion to continue sort_order
        const [currentImages] = await conn.execute(
          "SELECT COUNT(*) as count FROM product_variant_images WHERE variant_id = ?",
          [variant.id],
        );
        const currentCount = currentImages[0].count;

        // Insert new images
        for (const [imgIndex, image] of currentVariantImages.entries()) {
          await conn.execute(
            `INSERT INTO product_variant_images (variant_id, url, public_id, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)`,
            [
              variant.id,
              image.url,
              image.public_id,
              0, // New images are not primary by default
              currentCount + imgIndex, // Continue sort order from current images
            ],
          );
        }

        newImagesCount = currentVariantImages.length;
        console.log(
          `Added ${newImagesCount} new images for variant ${variant.id}`,
        );
      }

      // Update main image if specified
      const mainImageIndex = parseInt(variant.main_image_index);
      if (!isNaN(mainImageIndex) && mainImageIndex >= 0) {
        // Reset all images to non-primary
        await conn.execute(
          "UPDATE product_variant_images SET is_primary = 0 WHERE variant_id = ?",
          [variant.id],
        );

        // Get all images for this variant to set the correct one as primary
        const [allImages] = await conn.execute(
          "SELECT id FROM product_variant_images WHERE variant_id = ? ORDER BY sort_order ASC",
          [variant.id],
        );

        if (allImages[mainImageIndex]) {
          await conn.execute(
            "UPDATE product_variant_images SET is_primary = 1 WHERE id = ?",
            [allImages[mainImageIndex].id],
          );
          console.log(
            `Set image at index ${mainImageIndex} as primary for variant ${variant.id}`,
          );
        }
      }

      updatedVariants.push({
        variantId: variant.id,
        title: variant.title,
        initialPrice,
        profit,
        finalPrice,
        discountPrice: variant.discount_price,
        bulkDiscountPercentage,
        imagesDeleted: deletedImagesCount,
        imagesAdded: newImagesCount,
        totalImages: remainingImages.length + newImagesCount,
      });
    }

    await conn.commit();

    res.status(200).json({
      success: true,
      message: `تم تحديث ${variants.length} متغيرات بنجاح`,
      data: {
        updatedVariants,
        totalVariants: variants.length,
      },
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (conn) conn.release();
  }
}
// Delete single variant
export async function deleteVariant(req, res) {
  const { id } = req.params;

  // Validation
  if (!id) {
    return res.status(400).json({
      success: false,
      message: "رقم المتغير مطلوب",
      errorType: "VARIANT_ID_REQUIRED",
    });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check if variant exists
    const [variantCheck] = await conn.execute(
      "SELECT id, product_id, title FROM product_variants WHERE id = ?",
      [id],
    );

    if (!variantCheck.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "المتغير غير موجود",
        errorType: "VARIANT_NOT_FOUND",
      });
    }

    const variant = variantCheck[0];

    // Check if variant is used in any orders
    const [ordersWithVariant] = await conn.execute(
      "SELECT COUNT(*) as count FROM order_items WHERE variant_id = ?",
      [id],
    );

    if (ordersWithVariant[0].count > 0) {
      // Soft delete: just mark as inactive instead of deleting
      await conn.execute(
        "UPDATE product_variants SET is_active = 0 WHERE id = ?",
        [id],
      );

      await conn.commit();

      return res.status(200).json({
        success: true,
        message:
          "⚠️ تم إلغاء تفعيل هذا المتغير بدلاً من حذفه لأنه موجود في طلبات سابقة",
        data: {
          variantId: parseInt(id),
          variantTitle: variant.title,
          action: "deactivated",
          reason: "variant_used_in_orders",
        },
      });
    } else {
      // Hard delete if not used in orders
      // Delete variant images first
      const [deleteImages] = await conn.execute(
        "DELETE FROM product_variant_images WHERE variant_id = ?",
        [id],
      );

      // Delete the variant
      const [deleteResult] = await conn.execute(
        "DELETE FROM product_variants WHERE id = ?",
        [id],
      );

      if (deleteResult.affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({
          success: false,
          message: "فشل في حذف المتغير",
          errorType: "DELETE_FAILED",
        });
      }

      await conn.commit();

      res.status(200).json({
        success: true,
        message: "تم حذف المتغير بنجاح",
        data: {
          deletedVariantId: parseInt(id),
          variantTitle: variant.title,
          deletedImages: deleteImages.affectedRows,
          action: "deleted",
        },
      });
    }
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (conn) conn.release();
  }
}
// Get all variants for a specific product
export async function getVariants(req, res) {
  console.log("Getting variants for product");

  const { productId } = req.params;

  // Validation
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: "رقم المنتج مطلوب",
      errorType: "PRODUCT_ID_REQUIRED",
    });
  }

  let conn;
  try {
    conn = await db.getConnection();

    // First, check if product exists and get basic product info
    // FIXED: Removed is_active column which doesn't exist in products table
    const [productCheck] = await conn.execute(
      `
      SELECT 
        id,
        name,
        description,
        category_id,
        created_at
      FROM products 
      WHERE id = ?
    `,
      [productId],
    );

    if (!productCheck.length) {
      return res.status(404).json({
        success: false,
        message: "المنتج غير موجود",
        errorType: "PRODUCT_NOT_FOUND",
      });
    }

    const product = productCheck[0];

    // Get all variants for this product with their order counts
    const [variants] = await conn.execute(
      `
      SELECT 
        pv.id,
    pv.title,
    pv.price,
    pv.initial_price,
    pv.profit,
    pv.discount_price,
    pv.discount_start,
    pv.discount_end,
    pv.discount_percentage,
    pv.measure_unit,
    pv.size,
    pv.is_active,
    pv.prod_ref,
    pv.discount_threshold,
    pv.allows_custom_quantity,
    pv.created_at,
    pv.updated_at,
        COALESCE(order_counts.total_orders, 0) as total_orders,
        COALESCE(order_counts.total_quantity, 0) as total_quantity_ordered
      FROM product_variants pv
      LEFT JOIN (
        SELECT 
          oi.variant_id,
          COUNT(DISTINCT oi.order_id) as total_orders,
          SUM(oi.quantity) as total_quantity
        FROM order_items oi
        GROUP BY oi.variant_id
      ) as order_counts ON pv.id = order_counts.variant_id
      WHERE pv.product_id = ?
      ORDER BY pv.created_at ASC
    `,
      [productId],
    );

    if (!variants.length) {
      return res.status(200).json({
        success: true,
        message: "لا توجد متغيرات لهذا المنتج",
        data: {
          product: product,
          variants: [],
          totalVariants: 0,
          hasVariants: false,
        },
      });
    }

    // Get images for all variants in one query
    const variantIds = variants.map((v) => v.id);
    const [images] = await conn.execute(
      `
      SELECT 
        id,
        variant_id,
        url,
        public_id,
        is_primary,
        sort_order
      FROM product_variant_images
      WHERE variant_id IN (${variantIds.map(() => "?").join(",")})
      ORDER BY variant_id, sort_order ASC
    `,
      variantIds,
    );

    // Group images by variant_id
    const imagesByVariant = {};
    images.forEach((image) => {
      if (!imagesByVariant[image.variant_id]) {
        imagesByVariant[image.variant_id] = [];
      }
      imagesByVariant[image.variant_id].push({
        id: image.id,
        url: image.url,
        public_id: image.public_id,
        isPrimary: image.is_primary === 1,
        sortOrder: image.sort_order,
      });
    });

    // Format variants with their images, calculated fields, and order information
    const formattedVariants = variants.map((variant) => {
      const variantImages = imagesByVariant[variant.id] || [];
      const primaryImage =
        variantImages.find((img) => img.isPrimary) || variantImages[0] || null;

      // Calculate discount info - always include discountPercentage even if no active discount
      let discountInfo = null;
      const now = new Date();

      if (
        variant.discount_price &&
        variant.discount_start &&
        variant.discount_end
      ) {
        const discountStart = new Date(variant.discount_start);
        const discountEnd = new Date(variant.discount_end);
        const isActiveDiscount = now >= discountStart && now <= discountEnd;

        discountInfo = {
          discountPrice: parseFloat(variant.discount_price),
          discountPercentage: parseFloat(variant.discount_percentage || 0),
          discountStart: variant.discount_start,
          discountEnd: variant.discount_end,
          isActive: isActiveDiscount,
          savings:
            parseFloat(variant.price) - parseFloat(variant.discount_price),
        };
      } else {
        // Even if no active discount, include discountPercentage if it exists
        discountInfo = {
          discountPrice: null,
          discountPercentage: parseFloat(variant.discount_percentage || 0),
          discountStart: null,
          discountEnd: null,
          isActive: false,
          savings: 0,
        };
      }

      return {
        id: variant.id,
        title: variant.title,
        pricing: {
          initialPrice: parseFloat(variant.initial_price),
          profit: parseFloat(variant.profit),
          finalPrice: parseFloat(variant.price), // This is initial_price + profit
          currentPrice:
            discountInfo && discountInfo.isActive
              ? discountInfo.discountPrice
              : parseFloat(variant.price),
        },
        discount: discountInfo,
        specifications: {
          measureUnit: variant.measure_unit,
          size: variant.size,
          prodRef: variant.prod_ref,
          discountThreshold: variant.discount_threshold,
          allowsCustomQuantity: variant.allows_custom_quantity === 1,
        },
        images: {
          primary: primaryImage,
          all: variantImages,
          count: variantImages.length,
        },
        orders: {
          totalOrders: parseInt(variant.total_orders),
          totalQuantityOrdered: parseInt(variant.total_quantity_ordered),
          hasOrders: parseInt(variant.total_orders) > 0,
        },
        status: {
          isActive: variant.is_active === 1,
          hasDiscount: discountInfo !== null,
          hasActiveDiscount: discountInfo ? discountInfo.isActive : false,
          hasOrders: parseInt(variant.total_orders) > 0,
        },
        timestamps: {
          createdAt: variant.created_at,
          updatedAt: variant.updated_at,
        },
      };
    });

    // Find main variant (first active variant, or first variant if none active)
    const mainVariant =
      formattedVariants.find((v) => v.status.isActive) ||
      formattedVariants[0] ||
      null;

    // Calculate summary statistics
    const activeVariants = formattedVariants.filter((v) => v.status.isActive);
    const variantsWithDiscount = formattedVariants.filter(
      (v) => v.status.hasActiveDiscount,
    );
    const variantsWithOrders = formattedVariants.filter(
      (v) => v.orders.hasOrders,
    );

    const priceRange = {
      min: Math.min(...formattedVariants.map((v) => v.pricing.currentPrice)),
      max: Math.max(...formattedVariants.map((v) => v.pricing.currentPrice)),
    };

    // Calculate total orders and quantities across all variants
    const totalOrdersCount = formattedVariants.reduce(
      (sum, v) => sum + v.orders.totalOrders,
      0,
    );
    const totalQuantityOrdered = formattedVariants.reduce(
      (sum, v) => sum + v.orders.totalQuantityOrdered,
      0,
    );

    console.log(`Found ${variants.length} variants for product ${productId}`);

    res.status(200).json({
      success: true,
      message: `تم العثور على ${variants.length} متغيرات`,
      data: {
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.category_id,
          createdAt: product.created_at,
        },
        variants: formattedVariants,
        mainVariant: mainVariant,
        summary: {
          totalVariants: variants.length,
          activeVariants: activeVariants.length,
          variantsWithActiveDiscount: variantsWithDiscount.length,
          variantsWithOrders: variantsWithOrders.length,
          totalOrdersCount: totalOrdersCount,
          totalQuantityOrdered: totalQuantityOrdered,
          priceRange: priceRange,
          hasVariants: variants.length > 0,
        },
      },
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (conn) conn.release();
  }
}
