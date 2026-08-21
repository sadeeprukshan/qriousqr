import { supabase, isMockMode } from '../supabaseClient.js';

// Helper to load mock orders from localStorage
function getMockOrders() {
  try {
    return JSON.parse(localStorage.getItem('qriousqr:mock_orders') || '[]');
  } catch {
    return [];
  }
}

// Helper to save mock orders to localStorage
function saveMockOrders(orders) {
  localStorage.setItem('qriousqr:mock_orders', JSON.stringify(orders));
  // Dispatch storage event to alert other tabs and the same tab listeners
  window.dispatchEvent(new Event('storage'));
}

/**
 * OPERATOR ACTIONS
 */

// operator_create_order(p_customer_pin text, p_branch_id uuid?)
export async function operatorCreateOrder(customerPin, branchId = null) {
  if (isMockMode) {
    const cleanPin = customerPin.replace(/\D/g, '');
    
    // Find customer in mock users list
    const mockUsers = JSON.parse(localStorage.getItem('qriousqr:mock_customer_users') || '[]');
    const customer = mockUsers.find(u => {
      const uPin = (u.user_pin || '').replace(/\D/g, '');
      return uPin === cleanPin;
    });

    if (!customer) {
      throw new Error('customer_not_found');
    }

    const orders = getMockOrders();
    // Count existing company orders to generate sequential 4-digit order number
    const companyOrders = orders.filter(o => o.company_slug === 'kantami');
    const orderNum = (companyOrders.length + 1).toString().padStart(4, '0');
    
    const orderId = 'order-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newOrder = {
      id: orderId,
      order_number: orderNum,
      company_id: 'kantami-id',
      company_slug: 'kantami',
      company_name: 'Kantami',
      company_logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&h=150&fit=crop',
      company_primary_color: '#FF5722',
      branch_id: branchId || 'branch-kantami-1',
      customer_id: customer.id || 'mock-customer-id',
      customer_first_name: customer.first_name,
      customer_last_name: customer.last_name,
      customer_phone_full: customer.phone_full,
      status: 'pending',
      otp: otpCode,
      created_at: new Date().toISOString(),
      ready_at: null,
      delivered_at: null,
      cancelled_at: null,
      cancelled_reason: null
    };

    orders.push(newOrder);
    saveMockOrders(orders);

    return {
      id: orderId,
      order_number: orderNum,
      otp: otpCode,
      customer_first_name: customer.first_name,
      customer_last_name: customer.last_name,
      customer_phone_full: customer.phone_full,
      created_at: newOrder.created_at
    };
  }

  const { data, error } = await supabase.rpc('operator_create_order', {
    p_customer_pin: customerPin,
    p_branch_id: branchId
  });
  
  if (error) {
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data[0] : data;
}

// operator_mark_ready(p_order_id uuid)
export async function operatorMarkReady(orderId) {
  if (isMockMode) {
    const orders = getMockOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('order_not_found');
    if (order.status !== 'pending') throw new Error('invalid_status_transition');

    order.status = 'ready';
    order.ready_at = new Date().toISOString();
    saveMockOrders(orders);
    return order;
  }

  const { data, error } = await supabase.rpc('operator_mark_ready', {
    p_order_id: orderId
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

// operator_mark_delivered(p_order_id uuid, p_otp text)
export async function operatorMarkDelivered(orderId, otp) {
  if (isMockMode) {
    const orders = getMockOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('order_not_found');
    if (order.status !== 'ready') throw new Error('invalid_status_transition');
    if (order.otp !== otp.trim()) throw new Error('wrong_otp');

    order.status = 'delivered';
    order.delivered_at = new Date().toISOString();
    saveMockOrders(orders);
    return order;
  }

  const { data, error } = await supabase.rpc('operator_mark_delivered', {
    p_order_id: orderId,
    p_otp: otp
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

// operator_cancel_order(p_order_id uuid, p_reason text?)
export async function operatorCancelOrder(orderId, reason = null) {
  if (isMockMode) {
    const orders = getMockOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('order_not_found');
    if (order.status === 'delivered' || order.status === 'cancelled') {
      throw new Error('invalid_status_transition');
    }

    order.status = 'cancelled';
    order.cancelled_at = new Date().toISOString();
    order.cancelled_reason = reason;
    saveMockOrders(orders);
    return order;
  }

  const { data, error } = await supabase.rpc('operator_cancel_order', {
    p_order_id: orderId,
    p_reason: reason
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

// operator_orders_list(p_statuses text[]?, p_branch_id uuid?, p_limit int?)
export async function operatorOrdersList(statuses = null, branchId = null, limit = null) {
  if (isMockMode) {
    let orders = getMockOrders().filter(o => o.company_slug === 'kantami');
    
    if (statuses && statuses.length > 0) {
      orders = orders.filter(o => statuses.includes(o.status));
    }
    if (branchId) {
      orders = orders.filter(o => o.branch_id === branchId);
    }
    
    // Sort descending by created_at
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (limit) {
      orders = orders.slice(0, limit);
    }
    return orders;
  }

  const { data, error } = await supabase.rpc('operator_orders_list', {
    p_statuses: statuses,
    p_branch_id: branchId,
    p_limit: limit
  });
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * CUSTOMER ACTIONS
 */

// customer_my_orders(p_limit int?)
export async function customerMyOrders(limit = null) {
  if (isMockMode) {
    const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
    const customerId = session?.user?.id || 'mock-customer-id';
    
    let orders = getMockOrders().filter(o => o.customer_id === customerId);
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (limit) {
      orders = orders.slice(0, limit);
    }
    return orders;
  }

  const { data, error } = await supabase.rpc('customer_my_orders', {
    p_limit: limit
  });
  if (error) throw new Error(error.message);
  return data || [];
}

// customer_active_orders_count()
export async function customerActiveOrdersCount() {
  if (isMockMode) {
    const session = JSON.parse(localStorage.getItem('qriousqr:mock_customer_session') || '{}');
    const customerId = session?.user?.id || 'mock-customer-id';
    
    const active = getMockOrders().filter(o => o.customer_id === customerId && (o.status === 'pending' || o.status === 'ready'));
    return active.length;
  }

  const { data, error } = await supabase.rpc('customer_active_orders_count');
  if (error) throw new Error(error.message);
  return data || 0;
}
