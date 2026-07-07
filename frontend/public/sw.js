console.log('Service worker loaded');

self.addEventListener('install', () => {
    self.skipWaiting(); // Activate new SW immediately, don't wait for old tabs to close
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim()); // Take control of open pages right away
});

self.addEventListener('push', event => {
    console.log('Push received:', event);

    let data = {
        title: 'Default Title',
        body: 'Default notification body',
    };

    if (event.data) {
        try {
            data = event.data.json();
            console.log('Parsed push data:', data);
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }

    const options = {
        body: data.body,
        icon: '/icons/logo.jpg', // Use your app icon
        badge: '/icons/logo.jpg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1,
        },
    };

    event.waitUntil(
        self.registration
            .showNotification(data.title, options)
            .then(() => {
                console.log('✅ Notification shown');
                // Notify all clients that a new notification arrived
                self.clients.matchAll().then(clients => {
                    console.log(
                        `📢 Broadcasting to ${clients.length} client(s)`
                    );
                    clients.forEach(client => {
                        console.log('📨 Sending message to client');
                        client.postMessage({
                            type: 'NOTIFICATION_RECEIVED',
                            data: data,
                        });
                    });
                });
            })
            .catch(error => console.error('Error showing notification:', error))
    );
});

self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event);
    event.notification.close();

    // Optional: Open a specific URL when notification is clicked
    event.waitUntil(clients.openWindow('/admin/dashboard'));
});
