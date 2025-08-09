export async function setupPushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("Push messaging is not supported in this browser.");
    return;
  }

  const currentPath = window.location.pathname;
  if (currentPath !== "/admin" && currentPath !== "/admin/dashboard") {
    console.log("Not on /admin or /admin/dashboard, skipping push setup.");
    return;
  }

  try {
    console.log("Registering service worker...");
    const registration = await navigator.serviceWorker.register("/sw.js");
    console.log("✅ Service worker registered:", registration);

    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("❌ Notification permission denied.");
      return;
    }

    console.log("Fetching VAPID public key from server...");
    const response = await fetch("http://localhost:5000/vapid-public-key");
    const { publicKey } = await response.json();
    console.log("✅ VAPID public key received:", publicKey);

    console.log("Subscribing to push manager...");
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    console.log("✅ Push subscription created:", subscription);

    console.log("Sending subscription to server...");
    const saveResponse = await fetch(
      "http://localhost:5000/save-subscription",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ subscription }),
      }
    );

    if (saveResponse.ok) {
      console.log("✅ Push subscription saved to server.");
    } else {
      console.error(
        "❌ Failed to save subscription:",
        await saveResponse.text()
      );
    }
  } catch (err) {
    console.error("❌ Failed to setup push notifications:", err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
