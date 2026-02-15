import { privateApi } from "./axios";

export async function fetchMenu(role) {
  const params = role ? { role } : {};
  const res = await privateApi.get("/api/menu", { params });
  return res.data || [];
}
