import db from "../config/db.js";

// only for the admin
export async function getAllTags(req,res){
    try{
        const [rows] = await db.execute("SELECT * FROM tags");
        res.status(200).json(rows);
    }catch(err){
        console.error("Erreur lors de la récupération des tags :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function addTag(req,res){
    const {name} = req.body;
    try{
        const [rows] = await db.execute("SELECT * FROM tags WHERE name = ?", [name]);
        if (rows.length > 0) {
            return res.status(400).json({ message: "Tag already exists" });
        }
        await db.execute("INSERT INTO tags (name) VALUES (?)", [name]);
        res.status(201).json({ message: "Tag added successfully" });
    }catch(err){
        console.error("Erreur lors de l'ajout du tag :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function modifyTag(req,res){
    const {id} = req.params;
    const {name} = req.body;
    try{
        const [rows] = await db.execute("SELECT * FROM tags WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Tag not found" });
        }
        await db.execute("UPDATE tags SET name = ? WHERE id = ?", [name, id]);
        res.status(200).json({ message: "Tag modified successfully" });
    }catch(err){
        console.error("Erreur lors de la modification du tag :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteTag(req,res){
    const {id} = req.params;
    try{
        const [rows] = await db.execute("SELECT * FROM tags WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Tag not found" });
        }
        await db.execute("DELETE FROM tags WHERE id = ?", [id]);
        res.status(200).json({ message: "Tag deleted successfully" });
    }catch(err){
        console.error("Erreur lors de la suppression du tag :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}