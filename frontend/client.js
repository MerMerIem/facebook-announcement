import { sendEmail } from "../../../backend/config/invitation.js";

const PUBLIC_VAPID_KEY = import.meta.env.PUBLIC_VAPID_KEY;

if('serviceWorker' in navigator){
    send().catch(err => console.error(err));
}

// register the service worker, register the push and send the push
async function send(){
    // register sw
    console.log("registering sw");
    const register = await navigator.serviceWorker.register('/worker.js', {
        scope: '/'
    });
    console.log("service worker registered");

    // register the push
    console.log("registering the push");
    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });
    console.log("push registered");

    // send push notification
    console.log("sending push notification");
    await fetch('/send-notification', {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'content-type': 'application/json'
      }
    });
    console.log("push notification sent");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}