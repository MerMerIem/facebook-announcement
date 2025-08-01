import {useState, useEffect} from "react";
const PUBLIC_VAPID_KEY = import.meta.env.VITE_PUBLIC_VAPID_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

console.log("PUBLIC_VAPID_KEY",PUBLIC_VAPID_KEY);

function urlBase64ToUint8Array(base64String) {
    if (!base64String) {
        throw new Error("VAPID key is missing");
    }
    
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");
        
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const usePushNotifications = () => {
    const [permission, setPermission] = useState(Notification.permission);
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("Push notifications hook initialized, VAPID key:", PUBLIC_VAPID_KEY ? "Present" : "Missing");
        
        if (permission === 'granted') {
            initializePush();
        }
    }, []);

    const requestPermission = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setError('Push notifications are not supported in this browser');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);
            
            if (permission === 'granted') {
                await initializePush();
                return true;
            }
            return false;
        } catch (err) {
            setError('Failed to request notification permission');
            console.error('Permission request error:', err);
            return false;
        }
    };

    const initializePush = async () => {
        if (!('serviceWorker' in navigator)) {
            setError('Service workers are not supported');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const registration = await navigator.serviceWorker.register('/worker.js', {
                scope: '/'
            });
            
            await navigator.serviceWorker.ready;
            
            let pushSubscription = await registration.pushManager.getSubscription();
            
            if (!pushSubscription) {
                pushSubscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
                });
                
                // Save to backend - NEW ADDITION
                await fetch(`${BACKEND_URL}/save-subscription`, {
                    method: 'POST',
                    body: JSON.stringify({ subscription: pushSubscription }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Cookies.get('accessToken')}`
                    }
                });
            }
            
            setSubscription(pushSubscription);
        } catch (error) {
            console.error("Error initializing push:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // KEEP YOUR EXISTING sendTestNotification FUNCTION
    const sendTestNotification = async () => {
        const token = Cookies.get('accessToken');
        if (!subscription) {
            setError('No push subscription available');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/send-notification`, {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log("Notification sent successfully:", result);
            
        } catch (error) {
            console.error("Error sending notification:", error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        permission,
        subscription,
        isLoading,
        error,
        requestPermission,
        sendTestNotification,
        initializePush
    };
};