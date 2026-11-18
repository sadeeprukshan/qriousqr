import { supabase, isMockMode } from '../supabaseClient.js';

// Counter displays (paired tablets), POS integration keys and customer check-in.
// All backend logic lives in Supabase RPCs; these are thin wrappers.

const one = (data) => (Array.isArray(data) ? data[0] : data);

async function rpc(name, params) {
  if (isMockMode) throw new Error('not_available_in_mock_mode');
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data;
}

export const POS_INTAKE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pos-order-intake`;

// ---------- Operator (owner/manager) ----------
export const createPosKey = async (name, branchId = null) =>
  one(await rpc('operator_create_pos_key', { p_name: name, p_branch_id: branchId }));
export const listPosKeys = async () => (await rpc('operator_list_pos_keys')) || [];
export const revokePosKey = (id) => rpc('operator_revoke_pos_key', { p_id: id });

export const createDisplay = async (name, branchId = null) =>
  one(await rpc('operator_create_display', { p_name: name, p_branch_id: branchId }));
export const newPairingCode = async (id) => one(await rpc('operator_new_pairing_code', { p_id: id }));
export const listDisplays = async () => (await rpc('operator_list_displays')) || [];
export const revokeDisplay = (id) => rpc('operator_revoke_display', { p_id: id });

// ---------- Counter tablet (anonymous, uses its device token) ----------
const TOKEN_KEY = 'qriousqr:counter_device_token';

export function getDeviceToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function clearDeviceToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}
export async function pairDisplay(code) {
  const row = one(await rpc('display_pair', { p_code: code }));
  try { localStorage.setItem(TOKEN_KEY, row.device_token); } catch {}
  return row;
}
export const getDisplayState = (token) => rpc('display_state', { p_device_token: token });

// ---------- Customer ----------
// .then() is required: Supabase queries are lazy and only send once awaited/then'd
export const markOrderViewed = (qrToken) =>
  isMockMode ? Promise.resolve() : supabase.rpc('quick_order_mark_viewed', { p_qr_token: qrToken }).then(() => {}, () => {});
export const getCheckinInfo = async (code) => one(await rpc('checkin_info', { p_checkin_code: code }));
export const checkinOrder = async (code, orderNumber) =>
  one(await rpc('checkin_quick_order', { p_checkin_code: code, p_order_number: orderNumber }));
