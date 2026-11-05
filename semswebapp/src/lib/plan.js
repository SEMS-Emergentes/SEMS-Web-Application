// Niveles de plan y que desbloquea cada uno.
//
// Los niveles se llaman como los planes que vende el producto —Starter,
// Business y Enterprise— y no free/plus/pro. No es cosmetico: el nivel se
// deducia del nombre del plan buscando "plus" y "pro", de modo que un cliente
// de Business o de Enterprise caia en el nivel mas bajo y seguia viendo el
// muro de "mejora tu plan" en Analitica y en Reportes, que son justo lo que
// habia pagado.

/** @typedef {"starter" | "business" | "enterprise"} PlanTier */

const ORDER = ["starter", "business", "enterprise"];

/** @type {Record<PlanTier, string>} */
export const TIER_LABEL = {
  starter: "Starter",
  business: "Business",
  enterprise: "Enterprise",
};

/**
 * Deriva el nivel a partir del nombre del plan de la suscripcion.
 *
 * Reconoce tambien los nombres antiguos (Free, Plus, Pro) para que una
 * suscripcion creada antes del cambio de catalogo siga valiendo lo mismo.
 *
 * @param {string} [name]
 * @returns {PlanTier}
 */
export function tierFromName(name) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("enterprise") || n.includes("pro")) return "enterprise";
  if (n.includes("business") || n.includes("plus")) return "business";
  return "starter";
}

/**
 * El nivel actual alcanza el requerido? (starter < business < enterprise)
 * @param {PlanTier} current
 * @param {PlanTier} required
 */
export function hasTier(current, required) {
  return ORDER.indexOf(current) >= ORDER.indexOf(required);
}

// Limite de dispositivos vinculados por plan (Enterprise = ilimitado).
export const DEVICE_LIMIT = {
  starter: 3,
  business: 10,
  enterprise: Number.POSITIVE_INFINITY,
};
