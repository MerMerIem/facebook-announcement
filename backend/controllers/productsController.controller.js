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
      "SELECT COUNT(*) as total FROM products"
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
      `SELECT id, url, is_main, product_id FROM product_images WHERE product_id IN (${productIds
        .map(() => "?")
        .join(",")})`,
      productIds
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
      productIds
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
      productIds
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
        p.profit,
        p.discount_percentage
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
               c.name, s.name
    `;

    if (isAdmin) {
      query += `, p.initial_price, p.profit, p.discount_percentage`;
    }

    const [rows] = await db.execute(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    // ✅ Get tags
    const [tagRows] = await db.execute(
      `
      SELECT t.name
      FROM product_tags pt
      JOIN tags t ON pt.tag_id = t.id
      WHERE pt.product_id = ?
      `,
      [id]
    );

    const tags = tagRows.map((row) => row.name);

    // ✅ Get product variants with their images
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
               pv.size, pv.is_active
      ORDER BY pv.id
      `,
      [id]
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

    const response = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      discount_price: product.discount_price,
      discount_start: product.discount_start,
      discount_end: product.discount_end,
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
    };

    // Admin-only fields
    if (isAdmin) {
      response.admin_pricing = {
        initial_price: product.initial_price,
        profit: product.profit,
        discount_percentage: product.discount_percentage,
        calculated_price: product.price,
      };
    } else {
      // Related products
      const relatedProductsQuery = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.price,
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

      response.related_products = relatedRows;
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
      whereClauses.push("(p.name LIKE ? OR p.description LIKE ?)");
      queryParams.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (category) {
      const [categoryExists] = await db.execute(
        "SELECT id FROM categories WHERE name = ?",
        [category]
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
        [subcategory]
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
        c.name AS category_name,
        sc.name AS subcategory_name,
        GROUP_CONCAT(DISTINCT t.name) AS tags
    `;

    // Add admin-only fields
    if (isAdmin) {
      query += `,
        p.initial_price,
        p.profit,
        p.discount_percentage
      `;
    }

    query += `
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_tags pt ON p.id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.id
    `;

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += `
      GROUP BY p.id, p.name, p.description, p.price, p.discount_price, 
               p.discount_start, p.discount_end, c.name, sc.name
    `;

    if (isAdmin) {
      query += `, p.initial_price, p.profit, p.discount_percentage`;
    }

    query += ` LIMIT ${numericLimit} OFFSET ${offset}`;

    const [products] = await db.execute(query, queryParams);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT p.id) as total FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
      LEFT JOIN product_tags pt ON p.id = pt.product_id
      LEFT JOIN tags t ON pt.tag_id = t.id`;

    if (whereClauses.length > 0) {
      countQuery += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    const [totalCount] = await db.execute(countQuery, queryParams);

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
      `SELECT id, url, is_main, product_id FROM product_images WHERE product_id IN (${productIds
        .map(() => "?")
        .join(",")})`,
      productIds
    );

    const imagesByProduct = {};
    for (const img of imagesRows) {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push({
        id: img.id,
        url: img.url,
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
        current_price: hasValidDiscount
          ? product.discount_price
          : product.price, // Actual price to display
        category: {
          name: product.category_name,
        },
        subcategory: {
          name: product.subcategory_name,
        },
        tags: product.tags ? product.tags.split(",") : [],
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

function toDateOnly(isoString) {
  return typeof isoString === "string" ? isoString.split("T")[0] : null;
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
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message:
          "فشل في قراءة أحد الحقول (tags, deleted_images, main_image_index)",
      });
    }

    let price = null;
    const parsedDiscount = parseFloat(discount_percentage);
    const parsedDiscountPrice = parseFloat(discount_price);

    let final_discount_start = discount_start;
    let final_discount_end = discount_end;
    let final_discount_price = null; // Initialize as null instead of discount_price

    // Only set discount_price if it's provided and valid
    if (!isNaN(parsedDiscountPrice) && parsedDiscountPrice >= 0) {
      final_discount_price = parsedDiscountPrice;
    }

    // Reset discount fields if discount percentage is invalid
    if (parsedDiscount <= 0 || isNaN(parsedDiscount)) {
      final_discount_price = null; // Set to null instead of 0
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
      [name, id]
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

    if (category) {
      const [catRows] = await connection.execute(
        "SELECT id FROM categories WHERE name = ?",
        [category]
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
        [subcategory, category_id]
      );
      if (subcatRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `الفرع "${subcategory}" غير موجود لهذا التصنيف.`,
        });
      }
      subcategory_id = subcatRows[0].id;
    }

    await connection.execute(
      `UPDATE products SET 
        name = ?, description = ?, initial_price = ?, profit = ?, price = ?, 
        discount_percentage = ?, discount_price = ?, discount_start = ?, 
        discount_end = ?, category_id = ?, subcategory_id = ? 
      WHERE id = ?`,
      [
        name,
        description,
        initial_price,
        profit,
        price,
        parsedDiscount,
        final_discount_price, // This will be null if not provided/invalid
        final_discount_start || null,
        final_discount_end || null,
        category_id,
        subcategory_id,
        id,
      ]
    );

    if (deleted_images?.length) {
      const urlsToDelete = deleted_images
        .map((img) => (typeof img === "string" ? img : img.url))
        .filter((url) => url);

      if (urlsToDelete.length > 0) {
        const placeholders = urlsToDelete.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM product_images WHERE product_id = ? AND url IN (${placeholders})`,
          [id, ...urlsToDelete]
        );
      }
    }

    if (req.uploadedImages?.length) {
      for (const imageData of req.uploadedImages) {
        await connection.execute(
          "INSERT INTO product_images (product_id, url) VALUES (?, ?)",
          [id, imageData.url]
        );
      }
    }

    const [updatedImages] = await connection.execute(
      "SELECT id, url, is_main FROM product_images WHERE product_id = ?",
      [id]
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
        [id]
      );

      await connection.execute(
        "UPDATE product_images SET is_main = TRUE WHERE id = ?",
        [mainImageId]
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
          [tagName.trim()]
        );

        let tagId;
        if (existingTag.length > 0) {
          tagId = existingTag[0].id;
        } else {
          const [insertResult] = await connection.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName.trim()]
          );
          tagId = insertResult.insertId;
        }

        await connection.execute(
          "INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)",
          [id, tagId]
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
  } = req.body;

  // Enhanced validation with specific error messages
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

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "بيانات غير مكتملة",
      description: "يرجى ملء جميع الحقول المطلوبة",
      errors: validationErrors,
      errorType: "VALIDATION_ERROR",
    });
  }

  // Parse tags if it's a string
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

  // Calculate base price with validation
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

  // Enhanced discount validation
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

  // Validate discount dates if provided
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

  // Get Cloudinary URLs
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

    // 1. Verify category
    const [categoryRows] = await connection.execute(
      "SELECT id FROM categories WHERE name = ?",
      [category]
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

    // 2. Verify subcategory
    const [subcategoryRows] = await connection.execute(
      "SELECT id FROM subcategories WHERE name = ? AND category_id = ?",
      [subcategory, category_id]
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
    const subcategory_id = subcategoryRows[0].id;

    // 3. Check for duplicate product name
    const [existingProduct] = await connection.execute(
      "SELECT id FROM products WHERE name = ?",
      [name]
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

    // 4. Build SQL query dynamically
    const baseColumns = [
      "name",
      "description",
      "price",
      "category_id",
      "subcategory_id",
      "initial_price",
      "profit",
      "discount_percentage",
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
    ];

    // Add discount fields if valid
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
      ", "
    )}) VALUES (${baseColumns.map(() => "?").join(", ")})`;
    const [result] = await connection.execute(sql, baseValues);
    const productId = result.insertId;

    // 5. Insert images
    for (let i = 0; i < imageUrls.length; i++) {
      const isMain = i === parseInt(main_image_index);
      await connection.execute(
        "INSERT INTO product_images (url, product_id, is_main) VALUES (?, ?, ?)",
        [imageUrls[i], productId, isMain]
      );
    }

    // 6. Handle tags
    let processedTagsCount = 0;
    if (parsedTags.length > 0) {
      for (const tagName of parsedTags) {
        let [tagRows] = await connection.execute(
          "SELECT id FROM tags WHERE name = ?",
          [tagName]
        );

        let tagId;
        if (tagRows.length) {
          tagId = tagRows[0].id;
        } else {
          const [newTag] = await connection.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName]
          );
          tagId = newTag.insertId;
        }

        await connection.execute(
          "INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)",
          [productId, tagId]
        );
        processedTagsCount++;
      }
    }

    await connection.commit();

    // Success response with detailed information
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
    if (connection) {
      await connection.rollback();
    }

    // Enhanced error response
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

export async function deleteProduct(req, res) {
  const { id } = req.params;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Get product images first (for Cloudinary cleanup)
    const [images] = await connection.execute(
      "SELECT url FROM product_images WHERE product_id = ?",
      [id]
    );

    // 2. Verify product exists
    const [product] = await connection.execute(
      "SELECT id FROM products WHERE id = ?",
      [id]
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
      [id]
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
        orderIds
      );

      // Then delete the orders
      await connection.execute(
        `DELETE FROM orders WHERE id IN (${placeholders})`,
        orderIds
      );
    }

    // 4. Delete related records (to maintain referential integrity)
    await connection.execute("DELETE FROM product_tags WHERE product_id = ?", [
      id,
    ]);

    await connection.execute(
      "DELETE FROM product_images WHERE product_id = ?",
      [id]
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
    })
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
      [id]
    );
    res.status(200).json({ message: "Product discount removed successfully" });
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
      [0, id]
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

  // Helper function to format date for MySQL DATETIME
  function toMySQLDateTime(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null; // invalid date
    return d.toISOString().slice(0, 19).replace("T", " ");
  }

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

  // VALIDATION
  const errors = [];
  if (!product_id) {
    errors.push({ field: "product_id", message: "رقم المنتج مطلوب" });
  }

  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    errors.push({ field: "variants", message: "متغيرات المنتج مطلوبة" });
  }

  // Validate each variant
  variants.forEach((variant, index) => {
    if (!variant.title) {
      errors.push({
        field: `variants[${index}].title`,
        message: `عنوان المتغير ${index + 1} مطلوب`,
      });
    }
    if (!variant.price) {
      errors.push({
        field: `variants[${index}].price`,
        message: `سعر المتغير ${index + 1} مطلوب`,
      });
    }

    const priceFloat = parseFloat(variant.price);
    if (isNaN(priceFloat) || priceFloat <= 0) {
      errors.push({
        field: `variants[${index}].price`,
        message: `سعر المتغير ${index + 1} غير صحيح`,
      });
    }

    // Validate discount if provided
    const hasDiscount =
      variant.discount_price &&
      parseFloat(variant.discount_price) > 0 &&
      variant.discount_start &&
      variant.discount_end;

    if (hasDiscount) {
      const startDate = new Date(variant.discount_start);
      const endDate = new Date(variant.discount_end);
      if (startDate >= endDate) {
        errors.push({
          field: `variants[${index}].discount_dates`,
          message: `تواريخ الخصم للمتغير ${index + 1} غير صحيحة`,
        });
      }
      if (parseFloat(variant.discount_price) >= priceFloat) {
        errors.push({
          field: `variants[${index}].discount_price`,
          message: `سعر الخصم للمتغير ${index + 1} يجب أن يكون أقل من السعر`,
        });
      }
    }
  });

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: "بيانات غير مكتملة",
      errors,
      errorType: "VALIDATION_ERROR",
    });
  }

  // Check if we have variant images
  const variantImages = req.variantUploadedImages || {};

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Verify product exists
    const [productCheck] = await conn.execute(
      "SELECT id FROM products WHERE id = ?",
      [product_id]
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

    // Process each variant
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const priceFloat = parseFloat(variant.price);

      const hasDiscount =
        variant.discount_price &&
        parseFloat(variant.discount_price) > 0 &&
        variant.discount_start &&
        variant.discount_end;

      // Insert variant
      const cols = [
        "product_id",
        "title",
        "price",
        "measure_unit",
        "size",
        "is_active",
      ];
      const vals = [
        product_id,
        variant.title,
        priceFloat,
        variant.measure_unit || null,
        variant.size || null,
        variant.is_active ? 1 : 0,
      ];

      if (hasDiscount) {
        cols.push("discount_price", "discount_start", "discount_end");
        vals.push(
          parseFloat(variant.discount_price),
          toMySQLDateTime(variant.discount_start),
          toMySQLDateTime(variant.discount_end)
        );
      }

      const sql = `INSERT INTO product_variants (${cols.join(
        ","
      )}) VALUES (${cols.map(() => "?").join(",")})`;

      const [result] = await conn.execute(sql, vals);
      const variantId = result.insertId;

      // Insert variant images if available
      const currentVariantImages = variantImages[i] || [];
      if (currentVariantImages.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `لا توجد صور للمتغير ${i + 1}`,
          errorType: "NO_IMAGES_FOR_VARIANT",
        });
      }

      const mainImageIndex = parseInt(variant.main_image_index) || 0;

      for (
        let imgIndex = 0;
        imgIndex < currentVariantImages.length;
        imgIndex++
      ) {
        const image = currentVariantImages[imgIndex];
        await conn.execute(
          `INSERT INTO product_variant_images (variant_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?)`,
          [variantId, image.url, imgIndex === mainImageIndex ? 1 : 0, imgIndex]
        );
      }

      insertedVariants.push({
        variantId,
        title: variant.title,
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
export async function modifyProductVarient(req, res) {
  const variantId = req.params.id;
  const {
    title,
    price,
    discount_price,
    discount_start,
    discount_end,
    measure_unit,
    size,
    is_active,
    main_image_index = 0,
  } = req.body;

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check variant exists
    const [variantCheck] = await conn.execute(
      "SELECT id FROM product_variants WHERE id = ?",
      [variantId]
    );
    if (!variantCheck.length) {
      await conn.rollback();
      return res.status(404).json({
        success: false,
        message: "الفئة غير موجودة",
        errorType: "VARIANT_NOT_FOUND",
      });
    }

    // Build update fields
    const updates = [];
    const values = [];

    if (title) {
      updates.push("title = ?");
      values.push(title);
    }
    if (price) {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0) {
        return res
          .status(400)
          .json({ success: false, message: "سعر غير صحيح" });
      }
      updates.push("price = ?");
      values.push(p);
    }
    if (measure_unit) {
      updates.push("measure_unit = ?");
      values.push(measure_unit);
    }
    if (size) {
      updates.push("size = ?");
      values.push(size);
    }
    if (typeof is_active !== "undefined") {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (discount_price && discount_start && discount_end) {
      const dp = parseFloat(discount_price);
      if (dp >= parseFloat(price)) {
        return res
          .status(400)
          .json({ success: false, message: "سعر الخصم غير صحيح" });
      }
      updates.push(
        "discount_price = ?",
        "discount_start = ?",
        "discount_end = ?"
      );
      values.push(dp, discount_start, discount_end);
    }

    if (updates.length) {
      const sql = `UPDATE product_variants SET ${updates.join(
        ", "
      )} WHERE id = ?`;
      values.push(variantId);
      await conn.execute(sql, values);
    }

    // Replace images if new ones uploaded
    const imageUrls = req.uploadedImages?.map((img) => img.url) || [];
    if (imageUrls.length) {
      await conn.execute(
        "DELETE FROM product_variant_images WHERE variant_id = ?",
        [variantId]
      );
      for (let i = 0; i < imageUrls.length; i++) {
        await conn.execute(
          `INSERT INTO product_variant_images (variant_id, url, is_primary, sort_order) VALUES (?, ?, ?, ?)`,
          [variantId, imageUrls[i], i === parseInt(main_image_index) ? 1 : 0, i]
        );
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: "تم تعديل الفئة بنجاح",
      data: { variantId },
    });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({
      success: false,
      message: "خطأ في الخادم",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (conn) conn.release();
  }
}
