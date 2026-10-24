// Datos de ejemplo del modo demo (VITE_DEMO_MODE=true).
//
// Permiten ver y revisar toda la interfaz sin levantar el backend, que es como
// se trabaja la mayor parte del tiempo. Cuando DEMO_MODE es false ningun
// servicio los toca.

// ---------- Alertas ----------
export const demoAlerts = [
   { id: "al-01", type: "THRESHOLD", title: "Consumo elevado detectado", deviceName: "Aire acondicionado", message: "Superó el umbral de 8 kWh/día.", severity: "HIGH", status: "ACTIVE", createdAt: "Hoy, 03:12" },
  { id: "al-02", type: "ANOMALY", title: "Anomalía de consumo", deviceName: "Terma eléctrica", message: "Consumo 35% por encima de tu promedio semanal.", severity: "MEDIUM", status: "ACTIVE", createdAt: "Ayer, 19:40" },
  { id: "al-03", type: "INACTIVITY", title: "Dispositivo inactivo", deviceName: "Lavadora", message: "Sin actividad por más de 7 días.", severity: "LOW", status: "ACKNOWLEDGED", createdAt: "Lun, 09:15" },
  { id: "al-04", type: "THRESHOLD", title: "Umbral superado", deviceName: "Microondas", message: "Encendido por tiempo prolongado.", severity: "LOW", status: "RESOLVED", createdAt: "Dom, 13:02" },];

export const demoThresholds = [
  { id: "th-01", deviceName: "Aire acondicionado", maxKwhPerDay: 8, enabled: true },
  { id: "th-02", deviceName: "Terma eléctrica", maxKwhPerDay: 6, enabled: true },
  { id: "th-03", deviceName: "Refrigeradora", maxKwhPerDay: 4, enabled: false },
];

export const demoPreferences = [
  { channel: "EMAIL", label: "Correo electrónico", enabled: true },
  { channel: "PUSH", label: "Notificaciones push", enabled: true },
  { channel: "SMS", label: "Mensaje de texto (SMS)", enabled: false },
];

// ---------- Suscripción y pagos ----------
// Los tres planes son los mismos que siembra el backend en PlanSeeder y los
// que publica la landing: el precio va por locales, no por medidores.
export const demoPlans = [
  { id: "p-starter", name: "Starter", price: 0, period: "mes", features: ["1 local incluido", "Hasta 10 medidores por local", "Panel de consumo del local", "Alertas de consumo"] },
  { id: "p-business", name: "Business", price: 149, period: "mes", recommended: true, features: ["Todo lo de Starter", "5 locales incluidos", "Hasta 50 medidores por local", "Consumo desglosado por zona", "Aviso de demanda antes de superar la potencia contratada", "Reportes de consumo en hora punta"] },
  { id: "p-enterprise", name: "Enterprise", price: 399, period: "mes", features: ["Todo lo de Business", "Locales y medidores ilimitados", "Comparación de rendimiento entre locales", "Análisis de categoría tarifaria", "Soporte prioritario"] },
];

export const demoSubscription = {
  id: "sub-demo-01",
  planId: "p-business",
  planName: "Business",
  status: "ACTIVE",
  renewalDate: "15 jul 2026",
  price: 149,
  period: "mes",
};

export const demoPaymentMethods = [
  { id: "pm-01", brand: "Visa", last4: "4242", expMonth: 8, expYear: 27, primary: true },
  { id: "pm-02", brand: "Mastercard", last4: "5588", expMonth: 3, expYear: 26, primary: false },
];

export const demoInvoices = [
  { id: "inv-1042", date: "15 jun 2026", amount: 149, status: "PAID", description: "Plan Business · Junio" },
  { id: "inv-1019", date: "15 may 2026", amount: 149, status: "PAID", description: "Plan Business · Mayo" },
  { id: "inv-0987", date: "15 abr 2026", amount: 149, status: "PAID", description: "Plan Business · Abril" },
  { id: "inv-0965", date: "15 mar 2026", amount: 0, status: "PAID", description: "Plan Starter" },
];