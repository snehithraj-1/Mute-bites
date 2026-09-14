/**
 * Excel / CSV Export Utility for Vit: Mute Bites Admin
 * Formats orders data into Excel-compatible CSV with UTF-8 BOM,
 * ensuring proper parsing of Indian phone numbers, item lists, and dates.
 */

export function exportOrdersToExcel(orders, {
  timeframe = 'ALL', // 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'
  startDate = null,
  endDate = null,
  restaurantName = 'All Restaurants'
} = {}) {
  try {
    if (!Array.isArray(orders) || orders.length === 0) {
      alert('No orders available to export for the current filter.');
      return false;
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter orders by timeframe
    const filtered = orders.filter((order) => {
      if (!order) return false;
      if (!order.created_at) return true;
      
      const orderDate = new Date(order.created_at);
      if (isNaN(orderDate.getTime())) return true;

      if (timeframe === 'TODAY') {
        return orderDate >= startOfDay;
      }

      if (timeframe === 'THIS_WEEK') {
        const dayOfWeek = now.getDay() || 7; // 1 (Mon) to 7 (Sun)
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        return orderDate >= startOfWeek;
      }

      if (timeframe === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return orderDate >= startOfMonth;
      }

      if (timeframe === 'CUSTOM' && startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }

      return true; // 'ALL'
    });

    if (filtered.length === 0) {
      alert(`No orders found matching the timeframe "${timeframe}". Please select "All Orders".`);
      return false;
    }

    // Headers required for Admin Reporting
    const headers = [
      'Order ID',
      'Student Name',
      'Phone Number',
      'Email Address',
      'Delivery Location',
      'Restaurant Name',
      'Ordered Items',
      'Total Quantity',
      'Total Amount (INR)',
      'Payment Mode',
      'Order Status',
      'Date',
      'Time'
    ];

    const rows = filtered.map((order) => {
      const rawItems = order.items || order.order_items || [];
      let itemsArr = [];
      if (typeof rawItems === 'string') {
        try { itemsArr = JSON.parse(rawItems); } catch { itemsArr = []; }
      } else if (Array.isArray(rawItems)) {
        itemsArr = rawItems;
      } else if (typeof rawItems === 'object' && rawItems !== null) {
        itemsArr = Object.values(rawItems);
      }

      // Format items safely
      const validItems = itemsArr.filter(i => i && typeof i === 'object');
      const itemsDescription = validItems.map(i => {
        const name = i.name || i.item_name || i.title || 'Item';
        const qty = Number(i.quantity ?? i.qty ?? 1);
        return `${name} x ${qty}`;
      }).join('; ');

      const totalQty = validItems.reduce((sum, i) => sum + (Number(i.quantity ?? i.qty) || 1), 0) || 1;

      let dateStr = 'Today';
      let timeStr = 'Just now';
      try {
        if (order.created_at) {
          const d = new Date(order.created_at);
          if (!isNaN(d.getTime())) {
            dateStr = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
            timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          }
        }
      } catch (e) {
        // fallback
      }

      const rawPhone = order.student_phone !== null && order.student_phone !== undefined ? String(order.student_phone) : '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      // Excel formula `="9989955833"` forces Excel to treat Indian phone numbers as strings without scientific notation
      const phoneFormatted = cleanPhone ? `="${cleanPhone}"` : '';

      return [
        order.id ? String(order.id) : '',
        order.student_name ? String(order.student_name) : 'Student',
        phoneFormatted,
        order.student_email ? String(order.student_email) : '',
        order.delivery_location ? String(order.delivery_location) : 'Vit-ap Campus',
        order.restaurant_name ? String(order.restaurant_name) : (restaurantName || 'Campus Kitchen'),
        itemsDescription || 'Order items recorded',
        totalQty,
        order.total_amount ? Number(order.total_amount) : 0,
        order.payment_method ? String(order.payment_method).toUpperCase() : 'COD',
        (order.status === 'COMPLETED' || order.status === 'DELIVERED') ? 'COMPLETED' : (order.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'),
        dateStr,
        timeStr
      ];
    });

    // Convert to CSV with RFC 4180 escaping
    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\r\n');

    // Prefix with UTF-8 BOM (\uFEFF) so Excel opens UTF-8 characters properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const cleanRestaurant = String(restaurantName || 'Orders').replace(/[^a-zA-Z0-9]/g, '_');
    const dateTag = new Date().toISOString().slice(0, 10);
    const fileName = `Srm_College_Bites_${cleanRestaurant}_${timeframe}_${dateTag}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    link.setAttribute('target', '_self'); // CRITICAL: Never open a blank new tab
    link.style.display = 'none';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);

    // Trigger download safely
    link.click();

    // CRITICAL: Do NOT revoke URL immediately. Give Chromium 30 seconds to finish file streaming.
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (err) {
        // ignore
      }
    }, 30000);

    return true;
  } catch (err) {
    console.error('[Excel Export Error]:', err);
    alert('Failed to export orders: ' + (err.message || 'Unknown error occurred.'));
    return false;
  }
}

function escapeCsvCell(cell) {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
