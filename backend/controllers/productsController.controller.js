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

    // Fetch images for all products in one batch
    const productIds = rows.map((p) => p.id);
    const [imagesRows] = await db.execute(
      `SELECT id, url, is_main, product_id FROM product_images WHERE product_id IN (${productIds
        .map(() => "?")
        .join(",")})`,
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

    const products = rows.map((product) => {
      const images = imagesByProduct[product.id] || [];
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
        main_image_url: mainImage?.url || null,
        has_discount:
          product.discount_price &&
          product.discount_start &&
          product.discount_end,
        total_images: images.length,
      };
    });

    res.status(200).json(products);
  } catch (err) {
    console.error("Error while fetching products:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// only for the client
export async function getProductById(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      `
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
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN subcategories s ON p.subcategory_id = s.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = ?
      GROUP BY p.id, p.name, p.description, p.price, p.discount_price, 
               p.discount_start, p.discount_end, p.category_id, p.subcategory_id,
               c.name, s.name
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = rows[0];

    // Parse images JSON and filter out null values
    let images = [];

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
      total_images: images.length,
    };

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

    // Build main product query
    let query = `
      SELECT 
        p.id, p.name, p.description, p.price,
        p.discount_price, p.discount_start, p.discount_end,
        c.name AS category_name,
        sc.name AS subcategory_name,
        GROUP_CONCAT(DISTINCT t.name) AS tags
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
      LIMIT ${numericLimit} OFFSET ${offset}
    `;

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

      return {
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
      price,
      category,
      subcategory,
      discount_price,
      discount_start,
      discount_end,
      tags = [],
      images = [],
      deletedImages = [],
    } = req.body || {};

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
    addFieldUpdate("price", price);
    addFieldUpdate("category_id", category_id);
    addFieldUpdate("subcategory_id", subcategory_id);
    addFieldUpdate("discount_price", discount_price);
    addFieldUpdate("discount_start", discount_start);
    addFieldUpdate("discount_end", discount_end);

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
  const {
    name,
    description,
    price,
    category,
    subcategory,
    discount_price,
    discount_start,
    discount_end,
    main_image_index,
    tags, // This should be an array of tag names from the frontend
  } = req.body;

  // Get Cloudinary URLs from middleware (instead of req.files)
  const imageUrls = req.uploadedImages
    ? req.uploadedImages.map((img) => img.url)
    : [];

  if (!imageUrls.length || imageUrls.length === 0) {
    return res.status(400).json({ message: "No images provided" });
  }

  let connection; // Declare connection outside the try block for scope

  try {
    connection = await db.getConnection(); // Get a connection from the pool
    await connection.beginTransaction(); // Start the transaction

    // 1. Verify category
    const [rows] = await connection.execute(
      "SELECT id FROM categories WHERE name = ?",
      [category]
    );
    if (rows.length === 0) {
      await connection.rollback(); // Rollback if category doesn't exist
      return res.status(400).json({ message: "Category doesn't exist" });
    }
    const category_id = rows[0].id;

    // 2. Verify subcategory
    const [rows2] = await connection.execute(
      "SELECT id FROM subcategories WHERE name = ? AND category_id = ?",
      [subcategory, category_id]
    );
    if (rows2.length === 0) {
      await connection.rollback(); // Rollback if subcategory doesn't exist
      return res.status(400).json({ message: "SubCategory doesn't exist" });
    }
    const subcategory_id = rows2[0].id;

    // 3. Check if product with same title already exists
    const [rows3] = await connection.execute(
      "SELECT id FROM products WHERE name = ?",
      [name]
    );
    if (rows3.length > 0) {
      await connection.rollback(); // Rollback if product already exists
      return res.status(400).json({
        message: "A product with the same title already exists",
      });
    }

    // 4. Insert product
    let result;
    if (discount_price && discount_start && discount_end) {
      // Fixed: was discount_price twice
      [result] = await connection.execute(
        "INSERT INTO products (name, description, price, category_id, subcategory_id, discount_price, discount_start, discount_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          description,
          price,
          category_id,
          subcategory_id,
          discount_price,
          discount_start,
          discount_end,
        ]
      );
    } else {
      [result] = await connection.execute(
        "INSERT INTO products (name, description, price, category_id, subcategory_id) VALUES (?, ?, ?, ?, ?)",
        [name, description, price, category_id, subcategory_id]
      );
    }

    const productId = result.insertId;

    // 5. Insert images with Cloudinary URLs
    const mainIndex = parseInt(main_image_index) || 0;
    if (imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        const isMain = i === mainIndex;
        await connection.execute(
          "INSERT INTO product_images (url, product_id, is_main) VALUES (?, ?, ?)",
          [imageUrls[i], productId, isMain]
        );
      }
    }

    // 6. Handle tags (Modified: Create tag if it doesn't exist)
    if (tags && Array.isArray(tags) && tags.length > 0) {
      console.log("called");
      for (const tagName of tags) {
        let tagId;
        const [tagRows] = await connection.execute(
          "SELECT id FROM tags WHERE name = ?",
          [tagName]
        );

        if (tagRows.length > 0) {
          tagId = tagRows[0].id; // Tag already exists, get its ID
        } else {
          // Tag does NOT exist, so create it in the 'tags' lookup table
          const [newTagResult] = await connection.execute(
            "INSERT INTO tags (name) VALUES (?)",
            [tagName]
          );
          tagId = newTagResult.insertId;
          console.log(`New tag "${tagName}" created with ID: ${tagId}`);
        }

        // Link the product to the tag in product_tags
        await connection.execute(
          "INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)",
          [productId, tagId]
        );
      }
    }

    await connection.commit(); // Commit the transaction if all operations are successful
    res.status(201).json({
      message: "Product added successfully",
    });
  } catch (err) {
    if (connection) {
      await connection.rollback(); // Rollback the transaction in case of an error
    }
    console.error("Error adding product:", err); // Changed error message for clarity
    res.status(500).json({ message: "Internal server error" });
  } finally {
    if (connection) {
      connection.release(); // Release the connection back to the pool
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

    // 3. Delete related records first (to maintain referential integrity)
    await connection.execute("DELETE FROM product_tags WHERE product_id = ?", [
      id,
    ]);

    await connection.execute(
      "DELETE FROM product_images WHERE product_id = ?",
      [id]
    );

    // 4. Delete the product
    await connection.execute("DELETE FROM products WHERE id = ?", [id]);

    await connection.commit();

    // 5. Delete from Cloudinary (after successful DB deletion)
    if (images.length > 0) {
      await deleteCloudinaryImages(images.map((img) => img.url));
    }

    res.status(200).json({
      success: true,
      message: "Product and all related data deleted successfully",
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