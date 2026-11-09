import { supabase, isMockMode } from '../supabaseClient.js';

function getMockQuickOrders() {
  try {
    return JSON.parse(localStorage.getItem('qriousqr:mock_quick_orders') || '[]');
  } catch {
    return [];
  }
}

function saveMockQuickOrders(orders) {
  localStorage.setItem('qriousqr:mock_quick_orders', JSON.stringify(orders));
  window.dispatchEvent(new Event('storage'));
}

/**
 * operator_create_quick_order(p_order_number?, p_operator_note?, p_branch_id?)
 * Returns { id, qr_token, order_number, status, created_at }
 */
export async function operatorCreateQuickOrder(orderNumber = null, operatorNote = null, branchId = null) {
  if (isMockMode) {
    const orders = getMockQuickOrders();
    const trimmedNumber = orderNumber ? String(orderNumber).trim() : '';
    let finalOrderNum = trimmedNumber;

    if (!finalOrderNum) {
      const nextIndex = orders.length + 1;
      finalOrderNum = 'Q' + String(nextIndex).padStart(4, '0');
    } else {
      const duplicateActive = orders.some(
        (o) =>
          (o.status === 'pending' || o.status === 'ready') &&
          String(o.order_number).toLowerCase() === finalOrderNum.toLowerCase()
      );
      if (duplicateActive) {
        throw new Error('order_number_already_active');
      }
    }

    const id = 'qorder-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    const qrToken = 'qrt-' + Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();

    const newOrder = {
      id,
      qr_token: qrToken,
      order_number: finalOrderNum,
      operator_note: operatorNote ? String(operatorNote).trim() : null,
      branch_id: branchId || null,
      company_id: 'kantami-id',
      company_slug: 'kantami',
      company_name_en: 'Kantami',
      company_name_ar: 'كانتامي',
      company_logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop',
      company_primary_color: '#FF5722',
      status: 'pending',
      push_subs_count: 0,
      created_at: now,
      ready_at: null,
      delivered_at: null,
      cancelled_at: null,
      cancelled_reason: null,
    };

    orders.push(newOrder);
    saveMockQuickOrders(orders);

    return {
      id: newOrder.id,
      qr_token: newOrder.qr_token,
      order_number: newOrder.order_number,
      operator_note: newOrder.operator_note,
      status: newOrder.status,
      created_at: newOrder.created_at,
    };
  }

  const { data, error } = await supabase.rpc('operator_create_quick_order', {
    p_order_number: orderNumber && String(orderNumber).trim() ? String(orderNumber).trim() : null,
    p_operator_note: operatorNote && String(operatorNote).trim() ? String(operatorNote).trim() : null,
    p_branch_id: branchId || null,
  });

  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * operator_quick_order_set_status(p_order_id, p_status, p_reason?)
 * Transitions status: pending->ready, ready->delivered, {pending,ready}->cancelled
 */
export async function operatorQuickOrderSetStatus(orderId, status, reason = null) {
  if (isMockMode) {
    const orders = getMockQuickOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('order_not_found');

    const now = new Date().toISOString();
    order.status = status;
    if (status === 'ready') order.ready_at = now;
    if (status === 'delivered') order.delivered_at = now;
    if (status === 'cancelled') {
      order.cancelled_at = now;
      order.cancelled_reason = reason || null;
    }

    saveMockQuickOrders(orders);
    return order;
  }

  const { data, error } = await supabase.rpc('operator_quick_order_set_status', {
    p_order_id: orderId,
    p_status: status,
    p_reason: reason || null,
  });

  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * operator_quick_orders_list(p_statuses?, p_branch_id?, p_limit?)
 */
export async function operatorQuickOrdersList(statuses = null, branchId = null, limit = null) {
  if (isMockMode) {
    let orders = getMockQuickOrders();
    if (statuses && statuses.length > 0) {
      orders = orders.filter((o) => statuses.includes(o.status));
    }
    if (branchId) {
      orders = orders.filter((o) => o.branch_id === branchId);
    }
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (limit) {
      orders = orders.slice(0, limit);
    }
    return orders;
  }

  const { data, error } = await supabase.rpc('operator_quick_orders_list', {
    p_statuses: statuses,
    p_branch_id: branchId,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * track_quick_order(p_qr_token) — anon-callable
 * Returns order status + company branding (name_en, name_ar, logo_url, primary_color)
 */
export async function trackQuickOrder(qrToken) {
  if (isMockMode) {
    const orders = getMockQuickOrders();
    const found = orders.find((o) => o.qr_token === qrToken);
    if (!found) return null;
    return {
      id: found.id,
      qr_token: found.qr_token,
      order_number: found.order_number,
      status: found.status,
      created_at: found.created_at,
      ready_at: found.ready_at,
      delivered_at: found.delivered_at,
      cancelled_at: found.cancelled_at,
      cancelled_reason: found.cancelled_reason,
      company_name_en: found.company_name_en || 'Kantami',
      company_name_ar: found.company_name_ar || 'كانتامي',
      company_logo_url: found.company_logo_url,
      company_primary_color: found.company_primary_color || '#FF5722',
    };
  }

  const { data, error } = await supabase.rpc('track_quick_order', {
    p_qr_token: qrToken,
  });

  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}
