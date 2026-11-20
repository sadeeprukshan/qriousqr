import 'dart:convert';

import 'package:http/http.dart' as http;

// Public project URL + publishable key (same ones the website ships with; safe to embed).
const _supabaseUrl = 'https://snqsgqdovqrjsikcbaia.supabase.co';
const _publishableKey = 'sb_publishable_YqlmeBIQoALyCafbmc1btA_6cFsMEHt';

Future<dynamic> _rpc(String fn, Map<String, dynamic> params) async {
  final res = await http
      .post(
        Uri.parse('$_supabaseUrl/rest/v1/rpc/$fn'),
        headers: {'apikey': _publishableKey, 'Content-Type': 'application/json'},
        body: jsonEncode(params),
      )
      .timeout(const Duration(seconds: 15));
  final body = res.body.isEmpty ? null : jsonDecode(res.body);
  if (res.statusCode >= 400) {
    final msg = body is Map ? (body['message'] ?? body.toString()) : res.body;
    throw Exception(msg);
  }
  return body;
}

/// Report a printed receipt. orderNumber null = not found (still recorded for diagnostics).
Future<Map<String, dynamic>> ingestReceipt({
  required String deviceToken,
  required String? orderNumber,
  required String excerpt,
  String? printerIp,
}) async {
  final r = await _rpc('display_ingest_receipt', {
    'p_device_token': deviceToken,
    'p_order_number': orderNumber,
    'p_excerpt': excerpt,
    'p_printer_ip': printerIp,
  });
  return Map<String, dynamic>.from(r as Map);
}

/// Thrown when the Dashboard removed this display, or the stored token is no longer valid.
class DisplayRevoked implements Exception {}

/// Pair with the 6-digit code from Dashboard → Counter & POS. Returns the device token.
Future<String> pairDisplay(String code) async {
  final r = await _rpc('display_pair', {'p_code': code});
  final row = (r is List ? r.first : r) as Map;
  return row['device_token'] as String;
}

/// Everything the counter screen shows: restaurant branding, check-in code, active orders.
Future<Map<String, dynamic>> displayState(String deviceToken) async {
  try {
    final r = await _rpc('display_state', {'p_device_token': deviceToken});
    return Map<String, dynamic>.from(r as Map);
  } catch (e) {
    if ('$e'.contains('display_revoked')) throw DisplayRevoked();
    rethrow;
  }
}

/// The label the restaurant set in the Dashboard (e.g. "Order #"), or null.
Future<String?> fetchReceiptLabel(String deviceToken) async {
  final r = await _rpc('display_receipt_label', {'p_device_token': deviceToken});
  return r is String && r.trim().isNotEmpty ? r : null;
}
