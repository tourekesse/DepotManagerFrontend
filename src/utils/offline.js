// Utilities offline (cache catalogue, queue POST)

export const setCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (_e) {}
};

export const getCache = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_e) {
    return fallback;
  }
};

export const enqueue = (key, payload) => {
  try {
    const raw = localStorage.getItem(key);
    const queue = raw ? JSON.parse(raw) : [];
    queue.push(payload);
    localStorage.setItem(key, JSON.stringify(queue));
  } catch (_e) {}
};

export const flushQueue = async (key, handler) => {
  const raw = localStorage.getItem(key);
  const queue = raw ? JSON.parse(raw) : [];
  if (!queue.length) return;
  const remaining = [];
  for (const item of queue) {
    try {
      await handler(item);
    } catch (e) {
      remaining.push(item);
      if (!navigator.onLine) break;
    }
  }
  localStorage.setItem(key, JSON.stringify(remaining));
  return queue.length - remaining.length;
};
