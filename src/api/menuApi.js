import { privateApi } from "./axios";

export async function fetchMenu(role, userId) {
  const params = {};
  if (userId) params.userId = userId;
  else if (role) params.role = role;

  const res = await privateApi.get("/api/menu", { params });
  return res.data || [];
}
