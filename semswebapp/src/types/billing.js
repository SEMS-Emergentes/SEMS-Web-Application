/**
 * Tipos de suscripciones y pagos.
 *
 * @module types/billing
 */

/** @typedef {"ACTIVE" | "TRIAL" | "CANCELED" | "PAST_DUE"} SubscriptionStatus */
/** @typedef {"PAID" | "PENDING" | "FAILED"} InvoiceStatus */

/**
 * @typedef {object} SubscriptionPlan
 * @property {string} id
 * @property {string} name
 * @property {number} price  soles
 * @property {"mes" | "año"} period
 * @property {{code: string, name: string, value: string}[]} features
 * @property {boolean} [recommended]
 */

/**
 * @typedef {object} Subscription
 * @property {string} id
 * @property {string} planId
 * @property {string} planName
 * @property {SubscriptionStatus} status
 * @property {string} renewalDate
 * @property {number} price
 * @property {string} period
 */

/**
 * @typedef {object} Invoice
 * @property {string} id
 * @property {string} date
 * @property {number} amount
 * @property {InvoiceStatus} status
 * @property {string} description
 * @property {string | null} [number]  numero de comprobante, si se cobro
 * @property {string | null} [method]  p. ej. "Visa •••• 4242"
 */

export {};
