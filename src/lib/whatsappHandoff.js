// Strip leading + and any non-digit; wa.me wants pure digits like "96171234567".
export function normalizePhone(phoneFull) {
  if (!phoneFull) return null;
  const digits = String(phoneFull).replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

// Build the pre-filled message. Kept short — SMS-like. Uses restaurant name from
// the company row (bilingual — includes both EN and AR in one message so both
// language customers get value).
export function buildMessage({ companyName, orderNumber, otp, pickupUrl }) {
  const lines = [
    `🛍️ *${companyName}*`,
    ``,
    `Order *#${orderNumber}* is ready for pickup!`,
    `طلبك رقم *#${orderNumber}* جاهز للاستلام`,
    ``,
    `Your OTP: *${otp}*`,
    `رمز الاستلام: *${otp}*`,
  ];
  if (pickupUrl) {
    lines.push(``, `View: ${pickupUrl}`);
  }
  return lines.join('\n');
}

/**
 * Opens WhatsApp Web / WhatsApp on the operator's device with a pre-filled message.
 * Returns true if opened, false if we couldn't build a valid link.
 *
 * @param {{
 *   customerPhoneFull: string,     // "+96171234567" from customer_phone_full
 *   companyName: string,           // Kantami / Dolcetto Bakery / etc.
 *   orderNumber: string,           // "0042"
 *   otp: string,                   // "483920"
 *   pickupUrl?: string,            // optional: `${window.location.origin}/customer/orders`
 * }} args
 */
export function openWhatsAppHandoff(args) {
  const phone = normalizePhone(args.customerPhoneFull);
  if (!phone) return false;

  const text = buildMessage(args);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  // Use noopener so the WhatsApp tab can't script back into our app
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  return !!win;
}
