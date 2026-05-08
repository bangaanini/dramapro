#!/usr/bin/env node

import webPush from "web-push";

const keys = webPush.generateVAPIDKeys();

console.log("NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("WEB_PUSH_VAPID_PRIVATE_KEY=" + keys.privateKey);
