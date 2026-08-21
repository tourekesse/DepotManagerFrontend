/** Helpers session : rôle, clientId, creePar depuis localStorage / dmUser / JWT */

const readDmUser = () => {
  try {
    return JSON.parse(localStorage.getItem("dmUser") || "{}");
  } catch {
    return {};
  }
};

const readJwtPayload = () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};

export const getConnectedRole = () => {
  const dmUser = readDmUser();
  if (dmUser.role) return String(dmUser.role).toUpperCase();

  const stored = localStorage.getItem("role");
  if (stored) return stored.toUpperCase();

  const payload = readJwtPayload();
  if (payload?.role) return String(payload.role).toUpperCase();

  return "";
};

export const getConnectedClientId = () => {
  const fromStorage = localStorage.getItem("clientId");
  if (fromStorage) return fromStorage;

  const dmUser = readDmUser();
  if (dmUser.clientId != null) return String(dmUser.clientId);

  const payload = readJwtPayload();
  if (payload?.clientId != null) return String(payload.clientId);

  return null;
};

export const getCreePar = () => {
  const dmUser = readDmUser();
  return dmUser.role || localStorage.getItem("role") || "INCONNU";
};

/** Synchronise clientId et role dans localStorage depuis dmUser / JWT */
export const syncClientSession = () => {
  const clientId = getConnectedClientId();
  const role = getConnectedRole();
  if (clientId) localStorage.setItem("clientId", clientId);
  if (role) localStorage.setItem("role", role);
  return { clientId, role };
};

export const isClientBarUser = () => getConnectedRole() === "CLIENT_BAR";