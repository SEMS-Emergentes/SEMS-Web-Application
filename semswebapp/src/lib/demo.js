// Datos de ejemplo del modo demo (VITE_DEMO_MODE=true).
//
// Permiten ver y revisar toda la interfaz sin levantar el backend, que es como
// se trabaja la mayor parte del tiempo. Cuando DEMO_MODE es false ningun
// servicio los toca.

export const demoUser = {
  id: "u-001",
  email: "demo@energix.pe",
  fullName: "Alexis Encalada",
  role: "STAFF",
};

// Todo equipo cuelga de un local, como en el backend: el registro de lecturas
// solo ofrece los equipos del local del medidor, y sin local no se ofrecerian.
export const demoDevices = [
  { deviceId: "d-01", externalDeviceCode: "AC-001", userId: "u-001", siteId: "site-demo-01", deviceName: "Aire acondicionado", deviceType: "AIR_CONDITIONER", brand: "Samsung", model: "AR12", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:00:00Z", updatedAt: "2026-06-01T10:00:00Z" },
  { deviceId: "d-02", externalDeviceCode: "REF-002", userId: "u-001", siteId: "site-demo-01", deviceName: "Refrigeradora", deviceType: "REFRIGERATOR", brand: "LG", model: "GT29", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:05:00Z", updatedAt: "2026-06-01T10:05:00Z" },
  { deviceId: "d-03", externalDeviceCode: "HEAT-003", userId: "u-001", siteId: "site-demo-01", deviceName: "Terma eléctrica", deviceType: "WATER_HEATER", brand: "Bosch", model: "Tronic", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:10:00Z", updatedAt: "2026-06-01T10:10:00Z" },
  { deviceId: "d-04", externalDeviceCode: "TV-004", userId: "u-001", siteId: "site-demo-01", deviceName: "Televisor", deviceType: "TV", brand: "Sony", model: "Bravia", connectionProtocol: "WIFI", status: "INACTIVE", registeredAt: "2026-06-01T10:15:00Z", updatedAt: "2026-06-01T10:15:00Z" },
  { deviceId: "d-05", externalDeviceCode: "WASH-005", userId: "u-001", siteId: "site-demo-01", deviceName: "Lavadora", deviceType: "WASHING_MACHINE", brand: "Mabe", model: "LMA", connectionProtocol: "BLUETOOTH", status: "MAINTENANCE", registeredAt: "2026-06-01T10:20:00Z", updatedAt: "2026-06-01T10:20:00Z" },
  { deviceId: "d-06", externalDeviceCode: "MW-006", userId: "u-001", siteId: "site-demo-01", deviceName: "Microondas", deviceType: "MICROWAVE", brand: "Panasonic", model: "NN", connectionProtocol: "WIFI", status: "ACTIVE", registeredAt: "2026-06-01T10:25:00Z", updatedAt: "2026-06-01T10:25:00Z" },
];

// Tarifa MT2, la del local de demostracion: la energia de hora punta vale mas,
// y la punta en Peru va de 18:00 a 23:00 todos los dias. El backend valora asi
// cada lectura, y la demostracion no deberia contar otra cosa.
const PUNTA_POR_KWH = 0.281;
const FUERA_DE_PUNTA_POR_KWH = 0.2395;
const PERU_UTC = 5;

/** Horas locales a las que mide el medidor de demostracion. */
const HORAS_DE_MEDICION = [8, 13, 19, 22];

/**
 * Lecturas crudas, con la misma forma que las devuelve el backend.
 *
 * <p>Antes la demostracion solo tenia el consumo ya agregado por dia, asi que
 * las tres pantallas que parten de las lecturas crudas (Resumen, Monitoreo y
 * Reportes) pedian el backend incluso en modo demo y se quedaban en su estado
 * de error.
 *
 * <p>Son deterministas a proposito: con valores al azar, cada recarga movia
 * los totales y el grafico, y una demostracion que cambia sola no se puede
 * ensenar.
 */
export function demoRawReadings(days = 30) {
  const out = [];
  const hoy = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const dia = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate() - i));
    HORAS_DE_MEDICION.forEach((hora, franja) => {
      const marca = new Date(dia);
      marca.setUTCHours(hora + PERU_UTC);
      const enPunta = hora >= 18 && hora < 23;
      // Onda suave y repetible: el consumo sube al mediodia y en la tarde.
      const kwh = +(3.4 + Math.sin(i / 3 + franja) * 0.9 + franja * 0.6).toFixed(2);
      out.push({
        id: `demo-r-${i}-${franja}`,
        user_id: demoUser.id,
        meter_id: "m-01",
        // Una de cada cuatro no se atribuye a ningun equipo: el medidor mide
        // el local, y eso es lo habitual, no una rareza.
        device_id: franja === 3 ? null : demoDevices[franja].deviceId,
        power_watts: Math.round(kwh * 950),
        voltage: 220,
        current: 9,
        frequency: 60,
        energy_kwh: kwh,
        estimated_cost: +(kwh * (enPunta ? PUNTA_POR_KWH : FUERA_DE_PUNTA_POR_KWH)).toFixed(2),
        timestamp: marca.toISOString(),
        reading_type: "INTERVAL",
        phase: null,
      });
    });
  }
  // Como las sirve el backend: de la mas reciente a la mas antigua.
  return out.reverse();
}

export const demoConsumption = [
  { deviceId: "d-01", deviceName: "Aire acondicionado", kwh: 58.4, cost: 45.55, pct: 34 },
  { deviceId: "d-03", deviceName: "Terma eléctrica", kwh: 37.8, cost: 29.48, pct: 22 },
  { deviceId: "d-02", deviceName: "Refrigeradora", kwh: 30.9, cost: 24.1, pct: 18 },
  { deviceId: "d-06", deviceName: "Microondas", kwh: 18.2, cost: 14.2, pct: 11 },
  { deviceId: "d-04", deviceName: "Televisor", kwh: 13.7, cost: 10.69, pct: 8 },
  { deviceId: "d-05", deviceName: "Otros", kwh: 11.9, cost: 9.28, pct: 7 },
];

export const demoMeters = [
  // Con local asignado: la lectura de potencia solo se interpreta contra la
  // potencia contratada de ese suministro.
  { meterId: "m-01", name: "Medidor principal EOS", serial: "EOS-001842", siteId: "site-demo-01", zoneId: null, active: true, lastSeenAt: new Date().toISOString() },
];

/**
 * Ultima lectura del medidor principal (US24).
 *
 * Se genera con la hora actual, no fija: una lectura "actual" con marca de
 * tiempo de hace meses se lee como un medidor caido, que es justo lo contrario
 * de lo que la pantalla quiere mostrar.
 */
export function demoLatestReading() {
  const potenciaW = 61_400 + Math.round(Math.random() * 6_000);
  return {
    readingId: "read-demo-01",
    meterId: "m-01",
    deviceId: null,
    powerWatts: potenciaW,
    voltage: 219.4,
    current: 93.2,
    frequency: 59.9,
    energyKwh: 4.1,
    estimatedCost: 1.15,
    timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
    readingType: "INTERVAL",
    phase: "THREE_PHASE",
  };
}

export const demoRecommendations = [
  { id: "r-01", title: "Sube el aire a 24°C", detail: "Mantener el aire acondicionado en 24°C en vez de 21°C puede reducir su consumo hasta un 18%.", estimatedSaving: 14.2, applied: false },
  { id: "r-02", title: "Evita standby en la terma", detail: "Programa la terma 30 min antes del baño en lugar de dejarla encendida todo el día.", estimatedSaving: 11.5, applied: false },
  { id: "r-03", title: "Usa la lavadora en agua fría", detail: "El 90% de la energía de la lavadora se va en calentar el agua.", estimatedSaving: 6.8, applied: true },
];

export const demoAnomalies = [
  { id: "a-01", deviceName: "Aire acondicionado", description: "Encendido por 4 h continuas durante la madrugada.", severity: "HIGH", detectedAt: "Hoy, 03:12", resolved: false },
  { id: "a-02", deviceName: "Terma eléctrica", description: "Consumo 35% por encima de tu promedio semanal.", severity: "MEDIUM", detectedAt: "Ayer, 19:40", resolved: false },
  { id: "a-03", deviceName: "Refrigeradora", description: "Pico breve de consumo inusual.", severity: "LOW", detectedAt: "Lun, 11:05", resolved: true },
];

export const demoBillPrediction = {
  projectedCost: 318.4,
  projectedKwh: 408,
  confidence: 0.86,
  closingDate: "fin de mes",
};

export const demoRankings = demoConsumption
  .slice(0, 5)
  .map((c, i) => ({ rank: i + 1, deviceName: c.deviceName, kwh: c.kwh, cost: c.cost }));

export const demoSummary = {
  currentMonthCost: 231.6,
  savingAmount: 86.4,
  savingPct: 21,
  projectedCost: 318.4,
  totalKwh: 297,
  activeDevices: demoDevices.filter((d) => d.status === "ACTIVE").length,
  unreadAlerts: demoAnomalies.filter((a) => !a.resolved).length,
};

// ---------- Organizacion, locales y zonas ----------
export const demoOrganization = {
  organizationId: "org-demo-01",
  legalName: "Comercial Los Andes S.A.C.",
  tradeName: "Market Los Andes",
  taxId: "20512345678",
  businessType: "SUPERMARKET",
  status: "ACTIVE",
};

export const demoSites = [
  {
    siteId: "site-demo-01", organizationId: "org-demo-01", siteCode: "LIM-001",
    name: "Miraflores", address: "Av. Larco 345", district: "Miraflores",
    floorAreaM2: 620, contractedPowerKw: 95, tariffCategory: "MT2",
    chargesForDemand: true, excludesSundaysFromPeak: false, status: "ACTIVE",
  },
  {
    siteId: "site-demo-02", organizationId: "org-demo-01", siteCode: "LIM-002",
    name: "San Isidro", address: "Av. Camino Real 1200", district: "San Isidro",
    floorAreaM2: 410, contractedPowerKw: 60, tariffCategory: "BT5B",
    chargesForDemand: false, excludesSundaysFromPeak: false, status: "ACTIVE",
  },
];

export const demoZones = [
  { zoneId: "zone-demo-01", siteId: "site-demo-01", name: "Sala de ventas", zoneType: "SALES_FLOOR", operatesOffHours: false, status: "ACTIVE" },
  { zoneId: "zone-demo-02", siteId: "site-demo-01", name: "Cámaras de frío", zoneType: "COLD_STORAGE", operatesOffHours: true, status: "ACTIVE" },
  { zoneId: "zone-demo-03", siteId: "site-demo-02", name: "Almacén", zoneType: "WAREHOUSE", operatesOffHours: false, status: "ACTIVE" },
];

// Reparto por zona del local de Miraflores (US26) y comparacion entre los dos
// locales (US39). Los numeros cuadran con demoZones y demoSites.
export const demoZoneConsumption = {
  siteId: "site-demo-01",
  siteName: "Miraflores",
  days: 30,
  totalKwh: 2480,
  currency: "PEN",
  zones: [
    { zoneId: "zone-demo-02", zoneName: "Cámaras de frío", zoneType: "COLD_STORAGE", meterCount: 2, kwh: 1364, sharePercent: 55, estimatedEnergyCost: 505.2 },
    { zoneId: "zone-demo-01", zoneName: "Sala de ventas", zoneType: "SALES_FLOOR", meterCount: 1, kwh: 868, sharePercent: 35, estimatedEnergyCost: 286.4 },
  ],
  unassigned: { zoneId: null, zoneName: null, zoneType: null, meterCount: 1, kwh: 248, sharePercent: 10, estimatedEnergyCost: 81.8 },
};

export const demoSiteComparison = {
  organizationId: "org-demo-01",
  days: 30,
  totalKwh: 3720,
  currency: "PEN",
  sites: [
    { siteId: "site-demo-01", siteCode: "LIM-001", siteName: "Miraflores", contractedPowerKw: 95, tariffCategory: "MT2", meterCount: 4, kwh: 2480, sharePercent: 66.7, estimatedEnergyCost: 873.4, kwhPerContractedKw: 26.1, peakDemandKw: 78.4 },
    { siteId: "site-demo-02", siteCode: "LIM-002", siteName: "San Isidro", contractedPowerKw: 60, tariffCategory: "BT5B", meterCount: 2, kwh: 1240, sharePercent: 33.3, estimatedEnergyCost: 441.9, kwhPerContractedKw: 20.7, peakDemandKw: 41.2 },
  ],
};

export const demoMembers = [
  { membershipId: "mem-01", userId: "u-01", email: "alexis@sems.pe", role: "ORG_ADMIN", siteId: null, status: "ACTIVE" },
  { membershipId: "mem-02", userId: "u-02", email: "valeria@sems.pe", role: "SUPERVISOR", siteId: "site-demo-01", status: "ACTIVE" },
  { membershipId: "mem-03", userId: "u-03", email: "jorge@sems.pe", role: "OPERATOR", siteId: null, status: "ACTIVE" },
];
