// Perfil del establecimiento y metas de consumo. Se guardan localmente por
// usuario (el backend aun no expone estos datos; migrarlo despues es directo).

/**
 * @typedef {object} EstablishmentProfile
 * @property {string} establishmentType  "SUPERMARKET" | "STORE" | "WAREHOUSE"
 * @property {number} zones
 * @property {string} location
 */

/**
 * @typedef {object} Goals
 * @property {number} monthlyKwh
 * @property {Record<string, number>} perDevice  deviceId -> meta kWh
 */

const profileKey = (userId) => `sems-establishment-${userId}`;
const legacyProfileKey = (userId) => `sems-home-${userId}`;
const goalsKey = (userId) => `sems-goals-${userId}`;

const DEFAULT_PROFILE = { establishmentType: "SUPERMARKET", zones: 3, location: "" };

// Los perfiles guardados antes del cambio de segmento usan otra clave y los
// tipos de vivienda (HOUSE/APARTMENT/ROOM). Se traducen al leer para que a
// nadie se le quede el formulario en blanco tras actualizar.
const LEGACY_TYPES = { HOUSE: "SUPERMARKET", APARTMENT: "STORE", ROOM: "WAREHOUSE" };

function fromLegacy(raw) {
  const old = JSON.parse(raw);
  return {
    establishmentType: LEGACY_TYPES[old.housingType] ?? DEFAULT_PROFILE.establishmentType,
    zones: Number(old.rooms) || DEFAULT_PROFILE.zones,
    location: old.location ?? "",
  };
}

/** @returns {EstablishmentProfile} */
export function getEstablishmentProfile(userId) {
  try {
    const raw = localStorage.getItem(profileKey(userId));
    if (raw) return JSON.parse(raw);
    const legacy = localStorage.getItem(legacyProfileKey(userId));
    if (legacy) return fromLegacy(legacy);
  } catch {
    /* dato corrupto: caemos al perfil por defecto */
  }
  return { ...DEFAULT_PROFILE };
}

export function saveEstablishmentProfile(userId, p) {
  localStorage.setItem(profileKey(userId), JSON.stringify(p));
}

/** @returns {Goals} */
export function getGoals(userId) {
  try {
    const raw = localStorage.getItem(goalsKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* dato corrupto: caemos a metas vacias */
  }
  return { monthlyKwh: 0, perDevice: {} };
}

export function saveGoals(userId, g) {
  localStorage.setItem(goalsKey(userId), JSON.stringify(g));
}
