// Nombres de los tipos de equipo y de las conexiones en el idioma activo.
//
// Los valores son los codigos que guarda el backend y no se tocan. El
// formulario y la tarjeta los mostraban tal cual ("AIR_CONDITIONER",
// "smart_plug"), en ingles y con guiones bajos dentro de una interfaz en espanol.

/** @type {Record<string, [string, string]>} */
const TIPOS = {
  meter: ["Medidor", "Meter"],
  AIR_CONDITIONER: ["Aire acondicionado", "Air conditioner"],
  REFRIGERATOR: ["Refrigeración", "Refrigeration"],
  WATER_HEATER: ["Terma", "Water heater"],
  TV: ["Televisor", "TV"],
  WASHING_MACHINE: ["Lavadora", "Washing machine"],
  MICROWAVE: ["Microondas", "Microwave"],
  THERMOSTAT: ["Termostato", "Thermostat"],
  SENSOR: ["Sensor", "Sensor"],
  smart_plug: ["Enchufe inteligente", "Smart plug"],
  Mobile: ["Dispositivo móvil", "Mobile device"],
};

const CONEXIONES = { WIFI: "Wi-Fi", BLUETOOTH: "Bluetooth" };

/** Nombre del tipo; un codigo que la web aun no conoce se muestra tal cual. */
export function deviceTypeLabel(code, t) {
  const par = TIPOS[code];
  return par ? t(par[0], par[1]) : code ?? "";
}

export function protocolLabel(code) {
  return CONEXIONES[code] ?? code ?? "";
}
