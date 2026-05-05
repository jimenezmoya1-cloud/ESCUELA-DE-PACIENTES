/** Tipos de mensaje de sistema. El frontend usa esto para iconos / styling. */
export type MessageKind =
  | "manual_payment_approved"
  | "appointment_booked_patient"
  | "appointment_booked_clinician"
  | "appointment_cancelled_patient"
  | "reminder_24h_patient"
  | "reminder_1h_patient"
  | "reminder_1h_clinician"

/** Plantilla de email correspondiente. Usado por email.ts para resolver el componente. */
export type EmailTemplateKey =
  | "manual_payment_approved"
  | "appointment_booked_patient"
  | "appointment_booked_clinician"
  | "appointment_cancelled_patient"
  | "reminder_24h_patient"
  | "reminder_1h_patient"
  | "reminder_1h_clinician"
