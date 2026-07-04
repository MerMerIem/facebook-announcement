import db from "../config/db.js";

export async function getWilayas(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    // Whitelist sortable columns
    const SORTABLE_COLUMNS = {
        id: "id",
        name: "name",
        delivery_fee: "delivery_fee",
    };
    const sortByRaw = req.query.sortBy || "id";
    const sortBy = SORTABLE_COLUMNS[sortByRaw] || "id";
    const sortOrder = req.query.sortOrder === "desc" ? "DESC" : "ASC";

    try {
        let whereClause = "";
        let params = [];
        let countParams = [];

        if (search) {
            whereClause = "WHERE name LIKE ?";
            const searchParam = `%${search}%`;
            params.push(searchParam);
            countParams.push(searchParam);
        }

        const query = `SELECT * FROM wilayas ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const countQuery = `SELECT COUNT(*) as total FROM wilayas ${whereClause}`;

        const [wilayas] = await db.query(query, params);
        const [totalResult] = await db.query(countQuery, countParams);

        const total = totalResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // Stats: free delivery vs paid
        const [[stats]] = await db.query(`
            SELECT
                COUNT(*) AS total_wilayas,
                SUM(CASE WHEN delivery_fee = 0 THEN 1 ELSE 0 END) AS free_delivery_count,
                SUM(CASE WHEN delivery_fee > 0 THEN 1 ELSE 0 END) AS paid_delivery_count,
                AVG(NULLIF(delivery_fee, 0)) AS avg_paid_fee
            FROM wilayas
        `);

        res.status(200).json({
            success: true,
            wilayas,
            stats: {
                total_wilayas: stats.total_wilayas,
                free_delivery_count: stats.free_delivery_count,
                paid_delivery_count: stats.paid_delivery_count,
                avg_paid_fee: stats.avg_paid_fee ? parseFloat(stats.avg_paid_fee).toFixed(0) : 0,
            },
            pagination: {
                page,
                limit,
                total,
                totalItems: total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        });
    } catch (err) {
        console.error("Erreur lors de la récupération des wilayas :", err);
        res.status(500).json({
            success: false,
            message: "Erreur interne du serveur",
        });
    }
}

export async function modifyWilayaDeliveryPrice(req, res) {
    const { delivery_fee } = req.body;
    const { id } = req.params;
    console.log("delivery_fee", delivery_fee, "id", id);
    try {
        await db.execute("UPDATE wilayas SET delivery_fee = ? WHERE id = ?", [delivery_fee, id]);
        res.status(200).json({ message: "Wilaya delivery price modified successfully" });
    } catch (err) {
        console.error("Erreur lors de la modification de la wilaya :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteWilayaDeliveryPrice(req, res) {
    const { wilaya } = req.body;
    try {
        await db.execute("DELETE FROM wilayas WHERE name = ?", [wilaya]);
        res.status(200).json({ message: "Wilaya delivery price deleted successfully" });
    } catch (err) {
        console.error("Erreur lors de la suppression de la wilaya :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function addWilaya(req, res) {
    const { wilaya } = req.body;
    try {
        await db.execute("INSERT INTO wilayas (name) VALUES (?)", [wilaya]);
        res.status(201).json({ message: "Wilaya added successfully" });
    } catch (err) {
        console.error("Erreur lors de l'ajout de la wilaya :", err);
        res.status(500).json({ message: "Internal server error" });
    }
}