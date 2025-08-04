import db from "../config/db.js";

// for both client and admin
export async function getAllCategories(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        // 1. Get total number of categories first
        const [totalRows] = await db.execute("SELECT COUNT(*) AS total FROM categories");
        const total = totalRows[0].total;
        const totalPages = Math.ceil(total / limit);

        // 2. Get paginated categories with subcategory count
        // Using template literals for LIMIT/OFFSET to avoid parameter binding issues
        const [categories] = await db.execute(`
            SELECT 
                c.id,
                c.name,
                (SELECT COUNT(*) FROM subcategories sc WHERE sc.category_id = c.id) AS subcategory_count
            FROM categories c
            ORDER BY c.id
            LIMIT ${limit} OFFSET ${offset}
        `);

        // 3. Get all subcategories for the fetched categories
        const categoryIds = categories.map(c => c.id);
        let subcategoriesQuery = `
            SELECT id, name, category_id FROM subcategories
        `;
        
        if (categoryIds.length > 0) {
            // Create placeholders for the IN clause
            const placeholders = categoryIds.map(() => '?').join(',');
            subcategoriesQuery += ` WHERE category_id IN (${placeholders})`;
            
            const [subcategories] = await db.execute(subcategoriesQuery, categoryIds);
            
            // 4. Group subcategories by category_id
            const groupedSubcategories = {};
            subcategories.forEach(sub => {
                if (!groupedSubcategories[sub.category_id]) {
                    groupedSubcategories[sub.category_id] = [];
                }
                groupedSubcategories[sub.category_id].push({
                    id: sub.id,
                    name: sub.name
                });
            });

            // 5. Attach subcategories to corresponding category
            const enrichedCategories = categories.map(category => ({
                ...category,
                subcategories: groupedSubcategories[category.id] || []
            }));

            // 6. Return final JSON with pagination
            return res.status(200).json({
                success: true,
                total_categories: total,
                categories: enrichedCategories,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                }
            });
        }

        // If no categories were found
        return res.status(200).json({
            success: true,
            total_categories: total,
            categories: categories.map(category => ({
                ...category,
                subcategories: []
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        });

    } catch (err) {
        console.error("Erreur lors de la récupération des catégories :", err);
        return res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? {
                message: err.message,
                stack: err.stack
            } : undefined
        });
    }
}

// only for the client
export async function getCategoryById(req,res){
    const { id } = req.params;
    try{

        const [rows] = await db.execute("SELECT * FROM categories WHERE id = ?", [id]);
        if (rows.length === 0) {
          return res.status(404).json({ message: "Category not found" });
        }
        res.status(200).json(rows[0]);
    }catch(err){
        console.error("Erreur lors de la récupération de la catégorie :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

// only for the admin
export async function modifyCategory(req,res){
    try{
        const {id} = req.params;

        const [rows] = await db.execute("SELECT * FROM categories WHERE id = ?", [id]);
        if (rows.length === 0) {
          return res.status(404).json({ message: "Category not found" });
        }

        const { name } = req.body;
        await db.execute("UPDATE categories SET name = ? WHERE id = ?", [name, id]);
        res.status(200).json({ message: "Category modified successfully" });
    }catch(err){
        console.error("Erreur lors de la modification de la catégorie :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteCategory(req, res) {
    const { id } = req.params;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if category exists
        const [rows] = await connection.execute("SELECT * FROM categories WHERE id = ?", [id]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Category not found" });
        }

        // Get all subcategories for this category to track what we're deleting
        const [subcategories] = await connection.execute("SELECT id FROM subcategories WHERE category_id = ?", [id]);
        
        let deletedProductsCount = 0;
        let deletedSubcategoriesCount = subcategories.length;

        // Delete products first (they reference subcategories)
        if (subcategories.length > 0) {
            const subcategoryIds = subcategories.map(sub => sub.id);
            const placeholders = subcategoryIds.map(() => '?').join(',');
            
            // Count products that will be deleted
            const [productCount] = await connection.execute(
                `SELECT COUNT(*) as count FROM products WHERE subcategory_id IN (${placeholders})`,
                subcategoryIds
            );
            deletedProductsCount = productCount[0].count;

            // Delete all products that belong to these subcategories
            await connection.execute(
                `DELETE FROM products WHERE subcategory_id IN (${placeholders})`,
                subcategoryIds
            );
        }

        // Delete subcategories (now safe since products are deleted)
        await connection.execute("DELETE FROM subcategories WHERE category_id = ?", [id]);

        // Delete the category
        await connection.execute("DELETE FROM categories WHERE id = ?", [id]);

        await connection.commit();
        
        res.status(200).json({ 
            message: "Category deleted successfully with all related data",
            deletedData: {
                category: 1,
                subcategories: deletedSubcategoriesCount,
                products: deletedProductsCount
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error("Erreur lors de la suppression :", err);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
}

export async function addCategory(req, res) {
    let { name } = req.body;
  
    // Normalize the name: lowercase all, then capitalize the first letter
    name = name.trim().toLowerCase();
    name = name.charAt(0).toUpperCase() + name.slice(1);
  
    try {
      const [rows] = await db.execute("SELECT * FROM categories WHERE name = ?", [name]);
      if (rows.length > 0) {
        return res.status(400).json({ message: "Category already exists" });
      }
  
      await db.execute("INSERT INTO categories (name) VALUES (?)", [name]);
      res.status(201).json({ message: "Category added successfully" });
    } catch (err) {
      console.error("error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
}  