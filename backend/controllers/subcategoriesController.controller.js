import db from "../config/db.js";

// for both client and admin
export async function getAllSubCategories(req,res){
    try{
        const [rows] = await db.execute("SELECT * FROM subcategories");
        res.status(200).json(rows);
    }catch(err){
        console.error("Erreur lors de la récupération des sous catégories :", err);
        res.status(500).json({ message: "Internal server error" });
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
export async function modifySubCategory(req,res){
    try{
        const {id} = req.params;

        const [rows] = await db.execute("SELECT * FROM subcategories WHERE id = ?", [id]);
        if (rows.length === 0) {
          return res.status(404).json({ message: "SubCategory not found" });
        }

        const { name } = req.body;
        await db.execute("UPDATE subcategories SET name = ? WHERE id = ?", [name, id]);
        res.status(200).json({ message: "SubCategory modified successfully" });
    }catch(err){
        console.error("Erreur lors de la modification de la sous catégorie :", err);
        res.status(500).json({ message: "Internal server error" });
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
    const {category, name} = req.body;
    try{
        const [rows] = await db.execute("SELECT * FROM categories WHERE name = ?", [category]);
        if (rows.length === 0) {
          return res.status(400).json({ message: "Category doesn't exist" });
        }
        const categoryId = rows[0].id;

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