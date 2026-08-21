import { privateApi } from "./axios";

export const fetchUnites = async () => {
  const response = await privateApi.get("/api/unites");
  return (response.data || []).filter((unite) => unite?.id && unite?.libelle);
};
