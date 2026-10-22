/** `tel:` link for a phone number as typed by an admin ("8 (800) 123-45-67" → "tel:88001234567"). */
export function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}
