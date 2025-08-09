import webpush from "web-push";

const { setVapidDetails, sendNotification } = webpush;

import db from "../config/db.js";

const publicKey = process.env.PUBLIC_VAPID_KEY;
const privateKey = process.env.PRIVATE_VAPID_KEY;

if (!publicKey || !privateKey) {
  console.error("VAPID keys are missing from environment variables.");
} else {
  setVapidDetails("mailto:projetfinetude25@gmail.com", publicKey, privateKey);
}

async function sendPushNotification(userId) {
  console.log(
    `[Push Notification] Attempting to send notification to user ID: ${userId}`
  );

  try {
    // Log step 1: Fetching unread notifications
    console.log(
      `[Push Notification] Step 1: Fetching unread notifications for user ${userId}.`
    );
    const [notifications] = await db.query(
      `SELECT * FROM notification
         WHERE user_id = ? AND notification_status = 'unread'
         ORDER BY time DESC`,
      [userId]
    );

    if (notifications.length === 0) {
      console.log(
        `[Push Notification] Result: No unread notifications found for user ${userId}.`
      );
      return { success: true, message: "No unread notifications" };
    }
    console.log(
      `[Push Notification] Step 1 complete. Found ${notifications.length} unread notification(s).`
    );

    // Log step 2: Fetching push subscriptions
    console.log(
      `[Push Notification] Step 2: Fetching push subscriptions for user ${userId}.`
    );
    const [subs] = await db.query(
      `SELECT * FROM push_subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    if (subs.length === 0) {
      console.error(
        `[Push Notification] Error: No push subscription found for user ${userId}. Cannot send notification.`
      );
      return { success: false, error: "No push subscription found" };
    }
    console.log(
      `[Push Notification] Step 2 complete. Found ${subs.length} subscription(s) for user ${userId}.`
    );

    // Try each subscription until one works
    let lastError = null;
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      console.log(
        `[Push Notification] Trying subscription ${i + 1}/${subs.length} (ID: ${
          sub.id
        })`
      );

      try {
        // Debug: Log the raw subscription data
        console.log(`[Push Notification] Debug: Raw subscription data:`, sub);

        // Handle both old 'keys' column and new 'subscription_keys' column
        const keysData = sub.subscription_keys || sub.keys;

        if (!keysData) {
          console.warn(
            `[Push Notification] Warning: No keys data in subscription ID ${sub.id}, skipping`
          );
          continue;
        }

        console.log(`[Push Notification] Debug: Keys data:`, keysData);

        let parsedKeys;
        try {
          // Handle both string and already parsed JSON
          parsedKeys =
            typeof keysData === "string" ? JSON.parse(keysData) : keysData;
        } catch (parseError) {
          console.warn(
            `[Push Notification] Warning: Failed to parse keys for subscription ID ${sub.id}, skipping`
          );
          continue;
        }

        const storedSubscription = {
          endpoint: sub.endpoint,
          keys: parsedKeys,
        };

        console.log(
          `[Push Notification] Debug: Final subscription object:`,
          storedSubscription
        );

        // Log step 3: Building payload
        console.log(
          `[Push Notification] Step 3: Building notification payload.`
        );
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
          console.log(
            `[Push Notification] Payload created for single notification.`
          );
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
          console.log(
            `[Push Notification] Payload created for multiple notifications.`
          );
        }

        // Log step 4: Sending the notification
        console.log(
          `[Push Notification] Step 4: Sending notification using subscription ID ${sub.id}`
        );
        await sendNotification(storedSubscription, payload);
        console.log(
          `[Push Notification] Success: Notification sent successfully to user ${userId} using subscription ID ${sub.id}`
        );
        return { success: true };
      } catch (subError) {
        lastError = subError;

        if (subError.statusCode === 410 || subError.statusCode === 413) {
          console.warn(
            `[Push Notification] Subscription ID ${sub.id} expired/invalid (status ${subError.statusCode}), removing from database`
          );

          // Remove expired subscription
          try {
            await db.query(`DELETE FROM push_subscriptions WHERE id = ?`, [
              sub.id,
            ]);
            console.log(
              `[Push Notification] Removed expired subscription ID ${sub.id}`
            );
          } catch (dbError) {
            console.error(
              `[Push Notification] Failed to remove expired subscription:`,
              dbError
            );
          }

          // Continue to try next subscription
          continue;
        } else {
          // For other errors, log and continue
          console.warn(
            `[Push Notification] Failed to send with subscription ID ${sub.id}:`,
            subError.message
          );
          continue;
        }
      }
    }

    // If we get here, all subscriptions failed
    console.error(
      `[Push Notification] All ${subs.length} subscriptions failed for user ${userId}`
    );
    return {
      success: false,
      error: "All subscriptions failed",
      needsResubscription: true,
    };
  } catch (error) {
    console.error(
      `[Push Notification] Unexpected error for user ${userId}:`,
      error
    );
    return { success: false, error: "Unexpected error occurred" };
  }
}

export { sendPushNotification };
