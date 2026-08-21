/**
 * Recuperation du token d'activation via l'endpoint DEV sécurisé du backend
 * (/api/auth/dev/activation-token). Évite d'ouvrir Gmail pendant la démo.
 * Le token est ensuite utilisé pour appeler /api/auth/verify-email.
 */
export async function fetchVerificationToken(
  appUrl: string,
  email: string,
  apiKey: string
): Promise<string> {
  const url = `${appUrl}/api/auth/dev/activation-token?email=${encodeURIComponent(
    email
  )}&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Endpoint dev /dev/activation-token a répondu ${res.status}. ` +
        "Vérifie que app.dev-api-key est configurée sur le backend."
    );
  }
  const data = (await res.json()) as { success: boolean; token: string };
  if (!data.success || !data.token) {
    throw new Error(
      `Aucun token d'activation trouvé pour ${email} (compte déjà activé ?).`
    );
  }
  return data.token;
}