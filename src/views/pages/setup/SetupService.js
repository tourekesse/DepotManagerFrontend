import axios from "axios";

// 🔥 Auto-switch PC / Téléphone / Prod avec normalisation de /api
const rawBase = import.meta.env.VITE_BACKEND_URL || "";
const base = rawBase.replace(/\/+$/, ""); // strip trailing slash
const apiBase = base.match(/\/api$/) ? base : `${base}/api`;

export async function finalizeSetup(payload) {
  console.log("➡️ FinalizeSetup Payload:", payload);

  try {
    const response = await axios.post(
      `${apiBase}/setup/finalize`,
      payload,
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("✔️ Setup success:", response.data);
    return response.data;

  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Erreur inconnue";

    console.error("❌ finalizeSetup ERROR:", message);

    throw new Error(message);
  }
}
