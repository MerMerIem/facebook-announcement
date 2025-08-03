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

    const products = rows.map((product) => {
      const images = imagesByProduct[product.id] || [];
      const tags = tagsByProduct[product.id] || [];
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

  // Check if user is admin (assuming user info is available in req.user)
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

    // Structure the response with nested objects for better organization
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
      // Additional helpful fields
      has_discount:
        product.discount_price &&
        product.discount_start &&
        product.discount_end,
      total_images: Array.isArray(product.images)
        ? product.images.filter((img) => img !== null).length
        : 0,
    };

    // Add admin-only pricing information
    if (isAdmin) {
      response.admin_pricing = {
        initial_price: product.initial_price,
        profit: product.profit,
        discount_percentage: product.discount_percentage,
        calculated_price: product.price, // Show the calculated price for reference
      };
    } else {
      // For non-admin users, get related products
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
        product.subcategory_id
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

      const productData = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        discount_price: product.discount_price,
        discount_start: product.discount_start,
        discount_end: product.discount_end,
        category: {
          name: product.category_name,
        },
        subcategory: {
          name: product.subcategory_name,
        },
        tags: product.tags ? product.tags.split(",") : [],
        images,
        main_image_url: mainImage?.url || null,
        has_discount:
          product.discount_price &&
          product.discount_start &&
          product.discount_end,
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
export async function modifyProduct(req, res) {
  let connection;
  try {
    // 1. Validate and extract inputs
    const { id } = req.params;

    const {
      name,
      description,
      initial_price,
      profit,
      discount_percentage,
      category,
      subcategory,
      discount_start,
      discount_end,
      tags = [],
      images = [],
      deletedImages = [],
    } = req.body || {};

    // Calculate the actual price and discount_price if values are provided
    let price = null;
    let discount_price = null;

    if (parsedDiscount <= 0 || isNaN(parsedDiscount)) {
      discount_price = 0;
      discount_start = null;
      discount_end = null;
    }

    if (initial_price !== undefined && profit !== undefined) {
      price = parseFloat(initial_price) + parseFloat(profit);
    }

    const parsedDiscount = parseFloat(discount_percentage);
    if (price !== null && parsedDiscount > 0) {
      discount_price = price - price * (parsedDiscount / 100);
    }

    // 2. Initialize database connection
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 3. Verify product exists
    const [existingProduct] = await connection.execute(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );
    if (existingProduct.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Product not found" });
    }

    // 4. Handle category and subcategory
    let category_id = null;
    let subcategory_id = null;

    if (category !== undefined) {
      const [categoryRows] = await connection.execute(
        "SELECT id FROM categories WHERE name = ?",
        [category]
      );
      if (categoryRows.length === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ message: `Category '${category}' not found` });
      }
      category_id = categoryRows[0].id;

      if (subcategory !== undefined) {
        const [subcategoryRows] = await connection.execute(
          "SELECT id FROM subcategories WHERE name = ? AND category_id = ?",
          [subcategory, category_id]
        );
        if (subcategoryRows.length === 0) {
          await connection.rollback();
          return res.status(400).json({
            message: `Subcategory '${subcategory}' not found in category '${category}'`,
          });
        }
        subcategory_id = subcategoryRows[0].id;
      }
    }

    // 5. Check if another product with same details exists (exclude current product)
    if (name) {
      const [rows3] = await connection.execute(
        "SELECT id FROM products WHERE name = ? AND id != ?",
        [name, id]
      );
      if (rows3.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          message: "A product with the same title already exists",
        });
      }
    }

    // 6. Update product details
    const updateFields = [];
    const updateValues = [];

    // Helper function to safely add updates
    const addFieldUpdate = (field, value) => {
      if (value !== undefined && value !== null) {
        updateFields.push(`${field} = ?`);
        updateValues.push(value);
      }
    };

    addFieldUpdate("name", name?.trim());
    addFieldUpdate("description", description);
    addFieldUpdate("price", price); // Use calculated price
    addFieldUpdate("initial_price", initial_price); // Add initial_price field
    addFieldUpdate("profit", profit); // Add profit field
    addFieldUpdate("category_id", category_id);
    addFieldUpdate("subcategory_id", subcategory_id);
    addFieldUpdate("discount_price", discount_price); // Use calculated discount_price
    addFieldUpdate("discount_start", discount_start);
    addFieldUpdate("discount_end", discount_end);
    addFieldUpdate("discount_percentage", discount_percentage);

    if (updateFields.length > 0) {
      const updateQuery = `UPDATE products SET ${updateFields.join(
        ", "
      )} WHERE id = ?`;
      await connection.execute(updateQuery, [...updateValues, id]);
    }

    // 7. Handle Images
    if (
      Array.isArray(images) ||
      Array.isArray(deletedImages) ||
      req.uploadedImages
    ) {
      // Get current images from database
      const [currentImages] = await connection.execute(
        "SELECT id, url, is_main FROM product_images WHERE product_id = ?",
        [id]
      );

      // Handle deleted images
      if (Array.isArray(deletedImages) && deletedImages.length > 0) {
        const placeholders = deletedImages.map(() => "?").join(",");
        await connection.execute(
          `DELETE FROM product_images WHERE product_id = ? AND url IN (${placeholders})`,
          [id, ...deletedImages]
        );
      }

      // Combine new images from images array and req.uploadedImages
      const newImages = [];

      // Add images from request body (new images to add)
      if (Array.isArray(images)) {
        for (const img of images) {
          newImages.push({
            url: img.url,
            is_main: img.is_main === 1 || img.is_main === true,
          });
        }
      }

      // Add uploaded images from req.uploadedImages
      if (req.uploadedImages) {
        for (const img of req.uploadedImages) {
          if (!newImages.some((existing) => existing.url === img.url)) {
            newImages.push({
              url: img.url,
              is_main: false, // Default to false, will handle main image later
            });
          }
        }
      }

      // Insert new images
      for (const img of newImages) {
        await connection.execute(
          "INSERT INTO product_images (url, product_id, is_main) VALUES (?, ?, ?)",
          [img.url, id, img.is_main || false]
        );
      }

      // Ensure exactly one main image
      const [updatedImages] = await connection.execute(
        "SELECT id, url, is_main FROM product_images WHERE product_id = ?",
        [id]
      );

      const hasMainImage = updatedImages.some((img) => img.is_main);
      if (updatedImages.length > 0 && !hasMainImage) {
        // If no main image is set, make the first image main
        await connection.execute(
          "UPDATE product_images SET is_main = TRUE WHERE id = ?",
          [updatedImages[0].id]
        );
      } else if (updatedImages.filter((img) => img.is_main).length > 1) {
        // If multiple main images, keep only the first one
        const mainImage = updatedImages.find((img) => img.is_main);
        await connection.execute(
          "UPDATE product_images SET is_main = FALSE WHERE product_id = ?",
          [id]
        );
        await connection.execute(
          "UPDATE product_images SET is_main = TRUE WHERE id = ?",
          [mainImage.id]
        );
      }
    }

    // 8. Handle Tags
    if (Array.isArray(tags)) {
      const normalizedTags = tags.map((tag) =>
        typeof tag === "string" ? tag.trim().toLowerCase() : ""
      );
      const uniqueTags = [...new Set(normalizedTags.filter((tag) => tag))]; // Remove empty and duplicates

      // Get current tags
      const [currentTags] = await connection.execute(
        `SELECT t.id, t.name FROM tags t 
         JOIN product_tags pt ON t.id = pt.tag_id 
         WHERE pt.product_id = ?`,
        [id]
      );

      // Tags to add (new tags)
      const tagsToAdd = uniqueTags.filter(
        (tag) =>
          !currentTags.some((t) => t.name.toLowerCase() === tag.toLowerCase())
      );

      // Tags to remove (old tags not in new list)
      const tagsToRemove = currentTags
        .filter((tag) => !uniqueTags.includes(tag.name.toLowerCase()))
        .map((tag) => tag.id);

      // Add new tags
      for (const tagName of tagsToAdd) {
        let tagId;
        const [existingTag] = await connection.execute(
          "SELECT id FROM tags WHERE LOWER(name) = LOWER(?)",
          [tagName]
        );

        if (existingTag.length > 0) {
          tagId = existingTag[0].id;
        } else {
          const [result] = await connection.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName]
          );
          tagId = result.insertId;
        }

        await connection.execute(
          "INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)",
          [id, tagId]
        );
      }

      // Remove old tags
      if (tagsToRemove.length > 0) {
        await connection.execute(
          `DELETE FROM product_tags WHERE product_id = ? AND tag_id IN (${tagsToRemove
            .map(() => "?")
            .join(",")})`,
          [id, ...tagsToRemove]
        );
      }
    }

    // 9. Commit transaction
    await connection.commit();
    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (err) {
    console.error("Error modifying product:", err);
    if (
      connection &&
      connection.connection &&
      !connection.connection._fatalError
    ) {
      await connection.rollback();
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    if (connection) {
      connection.release();
    }
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

  console.log("Received request to add a product:",req.body)

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
