console.log("Service worker loaded");

self.addEventListener("push", (event) => {
  console.log("Push received:", event);

  let data = {
    title: "Default Title",
    body: "Default notification body",
  };

  if (event.data) {
    try {
      data = event.data.json();
      console.log("Parsed push data:", data);
    } catch (error) {
      console.error("Error parsing push data:", error);
    }
  }

  const options = {
    body: data.body,
    icon: "/icons/logo.jpg", // Use your app icon
    badge: "/icons/logo.jpg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration
      .showNotification(data.title, options)
      .then(() => console.log("Notification shown"))
      .catch((error) => console.error("Error showing notification:", error))
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  // Optional: Open a specific URL when notification is clicked
  event.waitUntil(clients.openWindow("/admin/dashboard"));
});
