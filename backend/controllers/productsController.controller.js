import db from "../config/db.js";
import cloudinary from "cloudinary";
const cloudinaryV2 = cloudinary.v2;

//for both client and admin
export async function getAllProducts(req, res) {
  try {
    const { limit = 20, page = 1 } = req.query;
    const parsedLimit = Math.max(1, Math.min(100, parseInt(limit, 10))) || 20;
    const parsedPage = Math.max(1, parseInt(page, 10)) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

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

    const [rows] = await db.execute(query);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No products found" });
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
        tags, // Added tags array
        main_image_url: mainImage?.url || null,
        has_discount:
          product.discount_price &&
          product.discount_start &&
          product.discount_end,
        total_images: images.length,
        total_tags: tags.length, // Added total tags count
      };
    });

    res.status(200).json(products);
  } catch (err) {
    console.error("Error while fetching products:", err);
    res.status(500).json({ message: "Internal server error" });
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

export async function addProduct(req, res) {
  console.log("called add product");
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

  console.log("request body", req.body);

  // Calculate base price
  const price = parseFloat(initial_price) + parseFloat(profit);

  // Check if ALL discount fields are provided and valid (not undefined, null, or empty)
  const hasAllDiscountFields = [
    discount_price,
    discount_start,
    discount_end,
  ].every((field) => field !== undefined && field !== null && field !== "");
  console.log("hasAllDiscountFields", hasAllDiscountFields);

  // Get Cloudinary URLs
  const imageUrls = req.uploadedImages?.map((img) => img.url) || [];
  if (!imageUrls.length) {
    return res.status(400).json({ message: "No images provided" });
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
      return res.status(400).json({ message: "Category doesn't exist" });
    }
    const category_id = categoryRows[0].id;

    // 2. Verify subcategory
    const [subcategoryRows] = await connection.execute(
      "SELECT id FROM subcategories WHERE name = ? AND category_id = ?",
      [subcategory, category_id]
    );
    if (!subcategoryRows.length) {
      await connection.rollback();
      return res.status(400).json({ message: "SubCategory doesn't exist" });
    }
    const subcategory_id = subcategoryRows[0].id;

    // 3. Check for duplicate product name
    const [existingProduct] = await connection.execute(
      "SELECT id FROM products WHERE name = ?",
      [name]
    );
    if (existingProduct.length) {
      await connection.rollback();
      return res
        .status(400)
        .json({ message: "Product with this name already exists" });
    }

    // 4. Build SQL query dynamically based on provided fields
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
      initial_price,
      profit,
      discount_percentage,
    ];

    // Add discount fields only if all are provided
    if (hasAllDiscountFields) {
      if (price > discount_price) {
        baseColumns.push("discount_price", "discount_start", "discount_end");
        baseValues.push(discount_price, discount_start, discount_end);
      } else {
        return res
          .status(400)
          .json({ message: "Discount price should be less than the price" });
      }
    }

    const sql = `INSERT INTO products (${baseColumns.join(
      ", "
    )}) VALUES (${baseColumns.map(() => "?").join(", ")})`;
    const [result] = await connection.execute(sql, baseValues);
    const productId = result.insertId;

    // 5. Insert images
    for (let i = 0; i < imageUrls.length; i++) {
      await connection.execute(
        "INSERT INTO product_images (url, product_id, is_main) VALUES (?, ?, ?)",
        [imageUrls[i], productId, i === parseInt(main_image_index)]
      );
    }

    // 6. Handle tags
    if (tags.length > 0) {
      for (const tagName of tags) {
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
      }
    }

    await connection.commit();
    res.status(201).json({
      message: "Product added successfully",
      productId: productId,
    });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error("Error adding product:", err);
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  } finally {
    if (connection) connection.release();
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
      const orderIds = ordersWithProduct.map(order => order.id);

      // Create placeholders for the IN clause
      const placeholders = orderIds.map(() => '?').join(',');
      
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
      deletedOrders: ordersWithProduct.length > 0 ? ordersWithProduct : undefined,
      ordersCount: ordersWithProduct.length
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
