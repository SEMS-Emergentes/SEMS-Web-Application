import { api, DEMO_MODE, delay } from "@/lib/api";
import {
  demoRecommendations,
  demoAnomalies,
  demoBillPrediction,
  demoRankings,
} from "@/lib/demo";
import { listDevices } from "./devices.service";

// Modulo de analitica del backend.
const BASE = "/api/v1/analytics";

// Los nombres de campo son los de AnalyticsResources en el backend, que
// serializa en snake_case. Antes aqui habia listas de hasta trece candidatos
// por campo "por si el backend renombraba": tapaban el error en lugar de
// avisarlo, y asi paso inadvertido que ni applied ni resolved existen.
function num(...vals) {
  for (const v of vals) if (typeof v === "number" && !isNaN(v)) return v;
  return 0;
}
function str(...vals) {
  for (const v of vals) if (typeof v === "string" && v) return v;
  return "";
}
function normSeverity(s) {
  const u = String(s ?? "").toUpperCase();
  return u === "HIGH" || u === "MEDIUM" || u === "LOW" ? u : "LOW";
}

/** @returns {Promise<import("../types").Recommendation[]>} */
export async function getRecommendations(userId) {
  if (DEMO_MODE) {
    await delay();
    return demoRecommendations;
  }
  const { data } = await api.get(`${BASE}/recommendations/user/${userId}`);
  return (data ?? []).map((r) => ({
    id: str(r.id),
    title: str(r.title, "Recomendación"),
    detail: str(r.description),
    estimatedSaving: num(r.estimated_saving_amount),
    // El backend no manda ningun booleano: lleva el estado en status
    // ("pending" / "applied") y sella applied_at. Leer r.applied daba siempre
    // false, asi que la insignia "Aplicada" no aparecia nunca y el boton
    // "Aplicar" se quedaba ahi aunque la recomendacion ya estuviera aplicada.
    applied: str(r.status) === "applied" || Boolean(r.applied_at),
  }));
}

export async function applyRecommendation(id) {
  if (DEMO_MODE) {
    await delay(200);
    return;
  }
  await api.patch(`${BASE}/recommendations/${id}/apply`);
}

/** @returns {Promise<import("../types").Anomaly[]>} */
export async function getAnomalies(userId, cargado = {}) {
  if (DEMO_MODE) {
    await delay();
    return demoAnomalies;
  }
  // Los dispositivos solo sirven para poner nombre donde el backend manda un
  // identificador; si quien llama ya los tiene, se los pasa.
  const [{ data }, devices] = await Promise.all([
    api.get(`${BASE}/anomalies/user/${userId}`),
    cargado.devices ?? listDevices(userId).catch(() => []),
  ]);
  // El backend manda el identificador del dispositivo en el campo y tambien
  // dentro del texto; lo reemplazamos por el nombre real para que la
  // descripcion se lea.
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));
  return (data ?? []).map((a) => {
    const id = str(a.device_id);
    const name = nameById.get(id) || (id ? `Dispositivo ${id.slice(0, 6)}` : "Dispositivo");
    let description = str(a.description);
    if (id) description = description.split(id).join(name);
    return {
      id: str(a.id),
      deviceName: name,
      description,
      severity: normSeverity(a.severity),
      detectedAt: str(a.detected_at, a.created_at),
      // Igual que las recomendaciones: el estado viene en status y resolved_at.
      resolved: str(a.status) === "resolved" || Boolean(a.resolved_at),
    };
  });
}

/** @returns {Promise<import("../types").BillPrediction | null>} */
export async function getBillPrediction(userId) {
  if (DEMO_MODE) {
    await delay(300);
    return demoBillPrediction;
  }
  const { data } = await api.get(`${BASE}/bill-predictions/user/${userId}`);
  const p = Array.isArray(data) ? data[0] : data;
  if (!p) return null;
  // El backend no publica una confianza: publica el margen de error, y la
  // confianza es su complemento.
  const margin = num(p.error_margin_percentage);
  const confidence = margin > 0 ? Math.max(0, 1 - margin / 100) : 0;
  return {
    projectedCost: num(p.estimated_amount),
    projectedKwh: num(p.estimated_kwh),
    confidence,
    closingDate: str(p.period_end).slice(0, 10) || "fin de mes",
  };
}

/** @returns {Promise<import("../types").ConsumptionRanking[]>} */
export async function getRankings(userId, cargado = {}) {
  if (DEMO_MODE) {
    await delay();
    return demoRankings;
  }
  const { data } = await api.get(`${BASE}/consumption-rankings/user/${userId}`);
  const root = Array.isArray(data) ? data[0] : data;
  const items = (root?.rankings ?? (Array.isArray(data) ? data : [])) ?? [];

  const devices = cargado.devices ?? (await listDevices(userId).catch(() => []));
  const nameById = new Map(devices.map((d) => [d.deviceId, d.deviceName]));

  return items
    .filter((r) => {
      const id = str(r.device_id);
      return !id || devices.length === 0 || nameById.has(id);
    })
    .map((r, i) => {
      const id = str(r.device_id);
      const real = nameById.get(id);
      const name = str(r.device_name);
      return {
        rank: i + 1,
        deviceName: real || (name && name !== id ? name : `Dispositivo ${id.slice(0, 6)}`),
        kwh: num(r.total_kwh),
        cost: num(r.estimated_amount),
      };
    });
}
