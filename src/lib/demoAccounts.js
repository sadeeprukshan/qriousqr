// Any @*.local email is a demo/test account and must be treated as read-only
// for account-mutating operations (password change, email change, etc.).
// `.local` is IANA-reserved — no real user would use it.
export function isDemoAccount(email) {
  if (!email) return false;
  const at = email.indexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return domain.endsWith('.local');
}
