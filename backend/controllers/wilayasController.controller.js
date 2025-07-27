import db from "../config/db.js";

export async function getWilayas(req,res){
    try{
        const [rows] = await db.execute("SELECT * FROM wilayas");
        res.status(200).json(rows);
    }catch(err){
        console.error("Erreur lors de la récupération des wilayas :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function modifyWilayaDeliveryPrice(req,res){
    const {wilaya, price} = req.body;
    try{
        await db.execute("UPDATE wilayas SET delivery_fee = ? WHERE name = ?", [price, wilaya]);
        res.status(200).json({ message: "Wilaya delivery price modified successfully" });
    }catch(err){
        console.error("Erreur lors de la modification de la wilaya :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteWilayaDeliveryPrice(req,res){
    const {wilaya} = req.body;
    try{
        await db.execute("DELETE FROM wilayas WHERE name = ?", [wilaya]);
        res.status(200).json({ message: "Wilaya delivery price deleted successfully" });
    }catch(err){
        console.error("Erreur lors de la suppression de la wilaya :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function addWilaya(req,res){
    const {wilaya} = req.body;
    try{
        await db.execute("INSERT INTO wilayas (name) VALUES (?)", [wilaya]);
        res.status(201).json({ message: "Wilaya added successfully" });
    }catch(err){
        console.error("Erreur lors de l'ajout de la wilaya :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}