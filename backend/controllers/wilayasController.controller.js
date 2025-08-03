import db from "../config/db.js";

export async function getWilayas(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    try {
        let query = "SELECT * FROM wilayas";
        let countQuery = "SELECT COUNT(*) as total FROM wilayas";
        let params = [];

        // Add search functionality
        if (search) {
            query += " WHERE name LIKE ?";
            countQuery += " WHERE name LIKE ?";
            params.push(`%${search}%`);
        }

        // Add ordering by ID and pagination
        query += " ORDER BY id ASC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        // Execute queries
        const [wilayas] = await db.query(query, params);
        const [totalResult] = await db.query(countQuery, search ? [`%${search}%`] : []);

        const total = totalResult[0].total;
        const totalPages = Math.ceil(total / limit);

        res.status(200).json({
            success: true,
            wilayas,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                totalItems: total,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (err) {
        console.error("Erreur lors de la récupération des wilayas :", err);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur"
        });
    }
}

export async function modifyWilayaDeliveryPrice(req,res){
    const {delivery_fee} = req.body;
    const {id} = req.params;
    console.log("delivery_fee",delivery_fee,"id",id)
    try{
        await db.execute("UPDATE wilayas SET delivery_fee = ? WHERE id = ?", [delivery_fee, id]);
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