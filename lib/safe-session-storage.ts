"use client";

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const safeSessionStorage = {
  getItem(key: string) {
    const storage = getSessionStorage();

    if (!storage) {
      return null;
    }

    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string) {
    const storage = getSessionStorage();

    if (!storage) {
      return false;
    }

    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string) {
    const storage = getSessionStorage();

    if (!storage) {
      return false;
    }

    try {
      storage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  getJSON<T>(key: string) {
    const rawValue = this.getItem(key);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      this.removeItem(key);
      return null;
    }
  },

  setJSON(key: string, value: unknown) {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
};
