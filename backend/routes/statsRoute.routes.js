import { Router } from "express";
import db from "../config/db.js"; // IMPORTANT: Add this import!

import { verfyToken, isAuthorized } from "../middlewares/authMiddleware.js";

const router = Router();

async function getStats(req, res) {
  try {
    // Basic counts
    const [productsCount] = await db.query(
      "SELECT COUNT(*) as total FROM products"
    );
    const [categoriesCount] = await db.query(
      "SELECT COUNT(*) as total FROM categories"
    );
    const [ordersCount] = await db.query(
      "SELECT COUNT(*) as total FROM orders"
    );
    const [usersCount] = await db.query("SELECT COUNT(*) as total FROM users");

    // Revenue stats - using your actual column names
    const [revenueStats] = await db.query(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_price), 0) as total_revenue,
          COALESCE(AVG(total_price), 0) as average_order_value
        FROM orders
      `);

    // Orders by status
    const [ordersByStatus] = await db.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM orders 
        GROUP BY status
        ORDER BY count DESC
      `);

    // Products by category
    const [productsByCategory] = await db.query(`
        SELECT 
          c.name as category,
          COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        GROUP BY c.id, c.name
        ORDER BY product_count DESC
      `);


    res.json({
      success: true,
      stats: {
        // Basic counts
        totalProducts: productsCount[0].total,
        totalCategories: categoriesCount[0].total,
        totalOrders: ordersCount[0].total,
        totalUsers: usersCount[0].total,

        // Revenue stats
        totalRevenue: parseFloat(revenueStats[0].total_revenue),
        averageOrderValue: parseFloat(revenueStats[0].average_order_value),

        // Charts data
        ordersByStatus: ordersByStatus.map((item) => ({
          status: item.status,
          count: item.count,
        })),

        productsByCategory: productsByCategory.map((item) => ({
          category: item.category,
          count: item.product_count,
        }))


      },
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}
router.get("/", verfyToken(), isAuthorized, getStats);
export default router;
