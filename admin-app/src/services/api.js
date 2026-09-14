// Centralized API Service Layer for Vit: Mute Bites Admin Portal
// Seamlessly interacts with /api routes in both localhost (proxy port 5000) and Vercel cloud deployment.

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function handleResponse(res) {
  if (!res.ok) {
    let errorMsg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && (data.error || data.message)) {
        errorMsg = data.error || data.message;
      }
    } catch {}
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // 1. Authentication
  async adminLogin(identifier, password) {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        username: identifier.trim(),
        email: identifier.trim(),
        password: password.trim()
      })
    });
    return handleResponse(res);
  },

  // 2. Orders
  async getOrders() {
    const res = await fetch('/api/orders', { headers: { 'Accept': 'application/json' } });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.orders || data.data || []);
  },

  async updateOrderStatus(orderId, status, notes = '') {
    const res = await fetch('/api/orders/status', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ orderId, status, notes })
    });
    return handleResponse(res);
  },

  async deleteOrder(orderId) {
    const res = await fetch('/api/orders/delete', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ orderId })
    });
    return handleResponse(res);
  },

  // 3. Restaurants & Kitchen Controls
  async getRestaurants() {
    const res = await fetch('/api/restaurants', { headers: { 'Accept': 'application/json' } });
    const data = await handleResponse(res);
    return data.restaurants || (Array.isArray(data) ? data : []);
  },

  async toggleRestaurant(restaurantId, isOpen) {
    let res;
    try {
      res = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/toggle`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ is_open: isOpen })
      });
      if (res.ok) return handleResponse(res);
    } catch {}

    // Fallback toggle route
    res = await fetch('/api/restaurants/toggle', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ id: restaurantId, is_open: isOpen })
    });
    return handleResponse(res);
  },

  // 4. System Settings (Master Emergency Switch)
  async getSystemSettings() {
    const res = await fetch('/api/settings/ordering', { headers: { 'Accept': 'application/json' } });
    return handleResponse(res);
  },

  async updateSystemSettings(orderingEnabled, notice = '') {
    const res = await fetch('/api/settings/ordering', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        ordering_enabled: orderingEnabled,
        notice: notice
      })
    });
    return handleResponse(res);
  },

  // 5. Menu & Inventory
  async getMenu() {
    const res = await fetch('/api/menu', { headers: { 'Accept': 'application/json' } });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.menu || data.items || []);
  },

  async toggleItemAvailability(itemId, isAvailable) {
    const payload = JSON.stringify({ is_available: isAvailable, id: itemId });
    try {
      const res = await fetch(`/api/menu/${encodeURIComponent(itemId)}/availability`, {
        method: 'PATCH',
        headers: jsonHeaders,
        body: payload
      });
      if (res.ok) return handleResponse(res);
    } catch (e) {}

    const res2 = await fetch(`/api/menu/${encodeURIComponent(itemId)}/availability`, {
      method: 'POST',
      headers: jsonHeaders,
      body: payload
    });
    return handleResponse(res2);
  },

  async bulkUpdateAvailability(itemIds, isAvailable) {
    const res = await fetch('/api/menu/bulk-availability', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ item_ids: itemIds, is_available: isAvailable })
    });
    return handleResponse(res);
  },

  async createMenuItem(itemData) {
    const res = await fetch('/api/menu', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(itemData)
    });
    return handleResponse(res);
  },

  async updateMenuItem(itemId, itemData) {
    const res = await fetch(`/api/menu/${encodeURIComponent(itemId)}`, {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify(itemData)
    });
    return handleResponse(res);
  },

  async deleteMenuItem(itemId) {
    const res = await fetch(`/api/menu/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: jsonHeaders
    });
    return handleResponse(res);
  },

  // 6. Registered Students
  async getStudents() {
    const res = await fetch('/api/students', { headers: { 'Accept': 'application/json' } });
    const data = await handleResponse(res);
    return Array.isArray(data) ? data : (data.students || []);
  }
};
