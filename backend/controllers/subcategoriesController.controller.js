import db from "../config/db.js";

// for both client and admin
export async function getAllSubCategories(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const categoryId = req.query.categoryId; // Optional filter by category ID
  
    try {
      let query = `
        SELECT s.*, c.name as category_name
        FROM subcategories s
        LEFT JOIN categories c ON s.category_id = c.id
      `;
      let countQuery = "SELECT COUNT(*) as total FROM subcategories";
      let params = [];
      let countParams = [];
  
      // Add category filter if provided
      if (categoryId) {
        query += " WHERE s.category_id = ?";
        countQuery += " WHERE category_id = ?";
        params.push(categoryId);
        countParams.push(categoryId);
      }
  
      // Add pagination to main query
      query += ` ORDER BY s.id LIMIT ? OFFSET ?`;
      params.push(limit, offset);
  
      // Execute both queries
      const [subcategories] = await db.query(query, params);
      const [totalResult] = await db.query(countQuery, countParams);
  
      const total = totalResult[0].total;
      const totalPages = Math.ceil(total / limit);
  
      res.json({
        success: true,
        subcategories,
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
      console.error("Erreur lors de la récupération des sous catégories :", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
}

// only for the client
export async function getSubCategoryById(req,res){
    const { id } = req.params;
    try{

        const [rows] = await db.execute("SELECT * FROM subcategories WHERE id = ?", [id]);
        if (rows.length === 0) {
          return res.status(404).json({ message: "SubCategory not found" });
        }
        res.status(200).json(rows[0]);
    }catch(err){
        console.error("Erreur lors de la récupération de la sous catégorie :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// only for the admin
export async function modifySubCategory(req, res) {
    const connection = await db.getConnection(); // Get a connection from the pool
    try {
        await connection.beginTransaction(); // Start transaction

        const { id } = req.params;
        const { name, category_id } = req.body;
        console.log("req body",req.body)

        // Validate inputs
        if (!name || !category_id) {
            return res.status(400).json({ message: "Name and category ID are required" });
        }

        // Check if subcategory exists
        const [subcategoryRows] = await connection.execute(
            "SELECT * FROM subcategories WHERE id = ?", 
            [id]
        );
        if (subcategoryRows.length === 0) {
            return res.status(404).json({ message: "SubCategory not found" });
        }

        // Check if new category exists
        const [categoryRows] = await connection.execute(
            "SELECT * FROM categories WHERE id = ?", 
            [category_id]
        );
        if (categoryRows.length === 0) {
            return res.status(400).json({ message: "Category not found" });
        }

        // Update subcategory
        await connection.execute(
            "UPDATE subcategories SET name = ?, category_id = ? WHERE id = ?",
            [name, category_id, id]
        );

        await connection.commit(); // Commit transaction
        res.status(200).json({ 
            success: true,
            message: "SubCategory modified successfully",
            data: {
                id: parseInt(id),
                name,
                category_id: parseInt(category_id)
            }
        });
    } catch (err) {
        await connection.rollback(); // Rollback on error
        console.error("Error modifying subcategory:", err);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        connection.release(); // Release the connection
    }
}

export async function deleteSubCategory(req, res) {
    const { id } = req.params;

    const connection = await db.getConnection(); // assuming you're using a MySQL pool
    try {
        await connection.beginTransaction();

        const [rows] = await connection.execute("SELECT * FROM subcategories WHERE id = ?", [id]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "SubCategory not found" });
        }

        // If later you need to delete associated products:
        // await connection.execute("DELETE FROM products WHERE subcategory_id = ?", [id]);

        await connection.execute("DELETE FROM subcategories WHERE id = ?", [id]);

        await connection.commit();
        res.status(200).json({ message: "SubCategory deleted successfully" });
    } catch (err) {
        await connection.rollback();
        console.error("Erreur lors de la suppression de la sous catégorie :", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
}

export async function addSubCategory(req,res){
    const {categoryId, name} = req.body;
    console.log("req body",req.body)
    try{
        const [rows2] = await db.execute("SELECT * FROM subcategories WHERE name = ? AND category_id = ?", 
            [name, categoryId]);
        if (rows2.length > 0) {
          return res.status(400).json({ message: "SubCategory already exists" });
        }
    
        await db.execute("INSERT INTO subcategories (category_id, name) VALUES (?, ?)", [categoryId, name]);
        res.status(201).json({ message: "SubCategory added successfully" });
    }catch(err){
        console.error("Erreur lors de l'ajout de la sous catégorie :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}