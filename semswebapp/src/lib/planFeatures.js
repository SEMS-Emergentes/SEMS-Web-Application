// Rotulos de las caracteristicas de un plan, por codigo.
//
// El backend publica cada caracteristica con un codigo, un nombre en ingles y
// un valor ("5", "unlimited", "enabled"). La pagina mostraba el nombre tal cual:
// salia en ingles dentro de una interfaz en espanol y sin la cifra, de modo que
// los tres planes decian "Sites included" sin decir cuantos, que es justo lo que
// los distingue.

const ILIMITADO = "unlimited";

/** @type {Record<string, (v: string, t: Function) => string>} */
const ROTULOS = {
  BASIC_DASHBOARD: (_v, t) => t("Panel de consumo del local", "Site consumption dashboard"),
  CONSUMPTION_ALERTS: (_v, t) => t("Alertas de consumo", "Consumption alerts"),
  SITES_LIMIT: (v, t) =>
    v === ILIMITADO
      ? t("Locales ilimitados", "Unlimited sites")
      : v === "1"
        ? t("1 local incluido", "1 site included")
        : t(`${v} locales incluidos`, `${v} sites included`),
  // Es el limite que aplica la pantalla de Dispositivos: cuenta equipos, no
  // medidores, y el texto tiene que decir lo mismo que se bloquea.
  DEVICES_PER_SITE_LIMIT: (v, t) =>
    v === ILIMITADO
      ? t("Equipos ilimitados por local", "Unlimited devices per site")
      : t(`Hasta ${v} equipos por local`, `Up to ${v} devices per site`),
  BASIC_INCLUDED: (_v, t) => t("Todo lo de Starter", "Everything in Starter"),
  BUSINESS_INCLUDED: (_v, t) => t("Todo lo de Business", "Everything in Business"),
  ZONE_ANALYTICS: (_v, t) => t("Consumo desglosado por zona", "Consumption broken down by zone"),
  DEMAND_ALERTS: (_v, t) =>
    t("Aviso de demanda antes de superar la potencia contratada", "Demand warning before exceeding the contracted power"),
  PEAK_HOUR_REPORTS: (_v, t) => t("Reportes de consumo en hora punta", "Peak-hour consumption reports"),
  SITE_BENCHMARKING: (_v, t) => t("Comparación de rendimiento entre locales", "Performance benchmarking across sites"),
  TARIFF_OPTIMIZATION: (_v, t) => t("Análisis de categoría tarifaria", "Tariff category analysis"),
  PRIORITY_SUPPORT: (_v, t) => t("Soporte prioritario", "Priority support"),
};

/**
 * Texto de una caracteristica en el idioma activo. Un codigo nuevo que la web
 * aun no conoce se muestra con el nombre del backend, que es mejor que ocultarlo.
 *
 * @param {{code: string, name: string, value: string}} f
 * @param {Function} t
 */
export function planFeatureLabel(f, t) {
  const rotulo = ROTULOS[String(f.code ?? "").toUpperCase()];
  return rotulo ? rotulo(String(f.value ?? "").toLowerCase(), t) : f.name || f.value || "";
}
