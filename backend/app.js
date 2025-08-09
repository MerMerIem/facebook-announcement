import express from "express";
import { json } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import pino from "pino";
import webpush from "web-push";
import { verfyToken } from "./middlewares/authMiddleware.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import dotenv from "dotenv";
import db from "./config/db.js";
import rd from "./config/rd.js";
import authRoute from "./routes/authRoute.routes.js";
import categoryRoute from "./routes/categoriesRoute.routes.js";
import productRoute from "./routes/productsRoute.routes.js";
import subCategoryRoute from "./routes/subcategoriesRoute.routes.js";
import tagRoute from "./routes/tagsRoute.routes.js";
import wilayaRoute from "./routes/wilayasRoute.routes.js";
import orderRoute from "./routes/ordersRoute.routes.js";
import notificationRoute from "./routes/notificationsRoute.routes.js";
import statsRoute from "./routes/statsRoute.routes.js";
import { sendPushNotification } from "./utils/sendPushNotification.js";
dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();

// ===== Middleware =====
app.use(cookieParser());
app.use(logger());
app.use(json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(compression());
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
  exposedHeaders: ["Authorization"], // Add this line
};

app.use(cors(corsOptions));

// ===== Logger Setup =====
function logger() {
  return pinoHttp({
    logger: pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname,req,res,responseTime",
          messageFormat:
            "{req.method} {req.url} {res.statusCode} {responseTime}ms",
        },
      },
    }),
  });
}

// ===== VAPID Configuration =====
const vapidDetails = {
  subject: "mailto:projetfinetude25@gmail.com",
  publicKey: process.env.PUBLIC_VAPID_KEY,
  privateKey: process.env.PRIVATE_VAPID_KEY,
};

if (!vapidDetails.publicKey || !vapidDetails.privateKey) {
  console.error(
    "⚠️  Missing VAPID keys - set PUBLIC_VAPID_KEY and PRIVATE_VAPID_KEY in .env"
  );
} else {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey
  );
  console.log("✅ Push notifications configured");
}

// ===== Push Notification Endpoints =====
app.get("/test-notification", async (req, res) => {
  await sendPushNotification(4);
  res.status(200).json({ success: true });
});

// Save subscription to database
app.post("/save-subscription", verfyToken(), async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    console.log(`Received subscription for user ${userId}:`, subscription);

    // Validate subscription structure
    if (
      !subscription ||
      typeof subscription !== "object" ||
      !subscription.endpoint ||
      !subscription.keys ||
      !subscription.keys.auth ||
      !subscription.keys.p256dh
    ) {
      console.warn("Invalid subscription format:", subscription);
      return res.status(400).json({ error: "Invalid subscription format" });
    }

    // Using subscription_keys column (JSON type)
    await db.query(
      `
      INSERT INTO push_subscriptions (user_id, endpoint, subscription_keys)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        endpoint = VALUES(endpoint),
        subscription_keys = VALUES(subscription_keys)
      `,
      [userId, subscription.endpoint, JSON.stringify(subscription.keys)]
    );

    console.log(`✅ Subscription saved for user ${userId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error saving subscription:", error);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});
// Get unread notifications count
app.get("/notification/unread-count", verfyToken(), async (req, res) => {
  console.log("GET /notification/unread-count called");
  try {
    const userId = req.user.id;
    console.log(`Fetching unread notification count for user ${userId}`);

    const [result] = await db.query(
      `SELECT COUNT(*) as count
       FROM notification
       WHERE user_id = ? AND notification_status = 'unread'`,
      [userId]
    );

    console.log(`Unread count for user ${userId}: ${result[0].count}`);
    res.status(200).json({ count: result[0].count });
  } catch (error) {
    console.error("Error getting unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

// Send notification
app.post("/send-notification", verfyToken(), async (req, res) => {
  console.log("POST /send-notification called");
  try {
    const userId = req.user.id;
    console.log(`Sending notification for user ${userId}`);

    if (!vapidDetails.publicKey || !vapidDetails.privateKey) {
      console.error("Missing VAPID keys");
      return res.status(500).json({
        error: "Push notifications not configured",
        details: "VAPID keys are missing on server",
      });
    }

    // Fetch unread notifications
    const [notifications] = await db.query(
      `SELECT * FROM notification
       WHERE user_id = ? AND notification_status = 'unread'
       ORDER BY time DESC`,
      [userId]
    );

    console.log(`Found ${notifications.length} unread notifications`);

    if (notifications.length === 0) {
      return res.status(200).json({ message: "No unread notifications" });
    }

    // Fetch stored subscription
    const [subs] = await db.query(
      `SELECT * FROM push_subscriptions WHERE user_id = ?`,
      [userId]
    );

    if (subs.length === 0) {
      console.warn(`No subscription found for user ${userId}`);
      return res.status(404).json({ error: "No push subscription found" });
    }

    const storedSubscription = {
      endpoint: subs[0].endpoint,
      keys: JSON.parse(subs[0].keys),
    };

    console.log("Stored subscription:", storedSubscription);

    // Build payload
    let payload;

    if (notifications.length === 1) {
      payload = JSON.stringify({
        title: "New Notification",
        body: notifications[0].content,
        icon: "/icon-192x192.png",
        data: {
          url: "/notifications",
          notificationId: notifications[0].notification_id,
        },
      });
    } else {
      payload = JSON.stringify({
        title: `${notifications.length} New Notifications`,
        body: `You have ${notifications.length} unread notifications`,
        icon: "/icon-192x192.png",
        data: {
          url: "/notifications",
          count: notifications.length,
        },
      });
    }

    console.log("Sending payload:", payload);

    await webpush.sendNotification(storedSubscription, payload);

    console.log(`Notification sent to user ${userId}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// VAPID public key route
app.get("/vapid-public-key", (req, res) => {
  console.log("GET /vapid-public-key called");
  try {
    if (!vapidDetails.publicKey) {
      console.error("VAPID public key not found on server");
      return res.status(500).json({
        error: "VAPID public key not configured on server",
      });
    }

    console.log("Returning VAPID public key");
    res.status(200).json({ publicKey: vapidDetails.publicKey });
  } catch (error) {
    console.error("Error serving VAPID public key:", error);
    res.status(500).json({ error: "Failed to get VAPID public key" });
  }
});
// ===== Routes =====
app.use("/auth", authRoute);
app.use("/category", categoryRoute);
app.use("/subcategory", subCategoryRoute);
app.use("/wilaya", wilayaRoute);
app.use("/tag", tagRoute);
app.use("/product", productRoute);
app.use("/order", orderRoute);
app.use("/notification", notificationRoute);
app.use("/stats", statsRoute);

// ===== Error Handling =====
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ===== Start Server =====
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `🔔 Push notifications: ${vapidDetails.publicKey ? "ENABLED" : "DISABLED"}`
  );
});
