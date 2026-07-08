import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useApi } from '../../contexts/RestContext'; // Make sure to import useApi

export function AdminLayout({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const { permission, requestPermission, initializePush } =
        usePushNotifications();
    const { api } = useApi(); // Get the api instance from your context

    // Check for unread notifications using your API pattern
    const checkUnreadNotifications = async () => {
        try {
            console.log('Attempting to fetch unread count...');
            const [data, response, responseCode, error] = await api.get(
                '/notification/unread-count'
            );

            if (responseCode === 200 && data) {
                console.log('✅ Unread count updated:', data.count);
                setUnreadCount(data.count);
            } else {
                console.error('Error checking notifications:', error);
                // Optional: Set unreadCount to 0 or show error state
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('API Call Failed:', {
                error: error,
                message: error.message,
                stack: error.stack,
            });
            setUnreadCount(0); // Fallback state
        }
    };

    // Initialize push notifications on mount
    useEffect(() => {
        if (permission === 'granted') {
            initializePush();
        } else {
            // Optionally request permission on first load
            requestPermission();
        }

        // Check notifications immediately and every 5 minutes
        checkUnreadNotifications();
        const interval = setInterval(checkUnreadNotifications, 5 * 60 * 1000);

        // Listen for push notification messages from service worker
        const handleServiceWorkerMessage = event => {
            console.log('📥 Message from service worker:', event.data);
            if (event.data && event.data.type === 'NOTIFICATION_RECEIVED') {
                console.log(
                    '🔔 New notification received, refreshing unread count...'
                );
                // Refresh unread count immediately when new notification arrives
                checkUnreadNotifications();
            }
        };

        if (navigator.serviceWorker) {
            navigator.serviceWorker.addEventListener(
                'message',
                handleServiceWorkerMessage
            );
            console.log('✅ Service worker message listener registered');
        }

        return () => {
            clearInterval(interval);
            if (navigator.serviceWorker) {
                navigator.serviceWorker.removeEventListener(
                    'message',
                    handleServiceWorkerMessage
                );
            }
        };
    }, [permission]);
    useEffect(() => {
        document.body.classList.add('admin-app');
        return () => document.body.classList.remove('admin-app');
    }, []);
    return (
        <div className="admin-app min-h-screen bg-background">
            <div
                className={cn(
                    'transition-all duration-300',
                    sidebarCollapsed ? 'mr-16' : 'mr-64'
                )}
            >
                <Header
                    onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    unreadCount={unreadCount}
                    setUnreadCount={setUnreadCount}
                />
                <main className="p-6">{children}</main>
            </div>
            <Sidebar
                collapsed={sidebarCollapsed}
                onCollapse={setSidebarCollapsed}
            />
        </div>
    );
}
