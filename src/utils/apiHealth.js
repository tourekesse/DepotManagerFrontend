export function checkApiHealth(timeout = 5000) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || "/api";
  const healthUrl = `${baseUrl.replace(/\/$/, "")}/health`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(healthUrl, {
    method: "GET",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      clearTimeout(timeoutId);
      return response.ok;
    })
    .catch(() => {
      clearTimeout(timeoutId);
      return false;
    });
}


