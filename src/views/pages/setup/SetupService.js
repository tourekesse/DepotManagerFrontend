import { privateApi } from "../../../api/axios";

export async function finalizeSetup(payload) {
  console.log("➡️ FinalizeSetup Payload:", payload);

  try {
    const response = await privateApi.post(
      "/api/setup/finalize",
      payload
    );

    console.log("✔️ Setup success:", response.data);
    return response.data;

  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Erreur inconnue";

    console.error("❌ finalizeSetup ERROR:", error);

    throw new Error(message);
  }
}
