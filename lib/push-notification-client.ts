"use client";

export type PushNotificationSubscribeResult = {
  id: string;
  isActive: boolean;
  userId: string | null;
};

type VapidResponse = {
  enabled: boolean;
  publicKey: string;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/gu, "+").replace(/_/gu, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function detectBrowserName() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes("edg/")) {
    return "Edge";
  }

  if (userAgent.includes("firefox")) {
    return "Firefox";
  }

  if (userAgent.includes("chrome") || userAgent.includes("crios")) {
    return "Chrome";
  }

  if (userAgent.includes("safari")) {
    return "Safari";
  }

  return "Browser";
}

function detectPlatformName() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/u.test(userAgent)) {
    return "iOS";
  }

  if (userAgent.includes("android")) {
    return "Android";
  }

  if (userAgent.includes("windows")) {
    return "Windows";
  }

  if (userAgent.includes("mac os")) {
    return "macOS";
  }

  return "Unknown";
}

async function loadVapidPublicKey() {
  const response = await fetch("/api/push/vapid-public-key", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Konfigurasi push notification belum bisa dibaca.");
  }

  const payload = (await response.json()) as VapidResponse;

  if (!payload.enabled || !payload.publicKey) {
    throw new Error("Push notification belum dikonfigurasi admin.");
  }

  return payload.publicKey;
}

export async function savePushSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscriptions", {
    body: JSON.stringify({
      browserName: detectBrowserName(),
      deviceLabel: `${detectPlatformName()} ${detectBrowserName()}`,
      platformName: detectPlatformName(),
      subscription: subscription.toJSON(),
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error || "Subscription gagal disimpan.");
  }

  return (await response.json()) as PushNotificationSubscribeResult;
}

export async function getCurrentPushSubscription() {
  if (!isPushNotificationSupported()) {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPushNotifications() {
  if (!isPushNotificationSupported()) {
    throw new Error("Browser ini belum mendukung push notification.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const [registration, publicKey] = await Promise.all([
    navigator.serviceWorker.ready,
    loadVapidPublicKey(),
  ]);
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey),
      userVisibleOnly: true,
    }));

  return savePushSubscription(subscription);
}

export async function syncExistingPushSubscription() {
  if (!isPushNotificationSupported() || Notification.permission !== "granted") {
    return null;
  }

  const [registration, publicKey] = await Promise.all([
    navigator.serviceWorker.ready,
    loadVapidPublicKey(),
  ]);
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(publicKey),
      userVisibleOnly: true,
    }));

  return savePushSubscription(subscription);
}

export async function disablePushNotifications() {
  const subscription = await getCurrentPushSubscription();

  if (!subscription) {
    return;
  }

  await fetch("/api/push/subscriptions", {
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "DELETE",
  }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}
