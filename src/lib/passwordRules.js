export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;

export function validateNewPassword(next, confirm) {
  if (!next || next.length < PASSWORD_MIN) {
    return { ok: false, error: 'Password must be at least 6 characters.' };
  }
  if (next.length > PASSWORD_MAX) {
    return { ok: false, error: 'Password must be 72 characters or fewer.' };
  }
  if (next !== confirm) {
    return { ok: false, error: 'Passwords do not match.' };
  }
  return { ok: true, error: null };
}
