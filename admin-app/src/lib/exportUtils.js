// Export orders to CSV / Excel spreadsheet format

export function exportOrdersToCSV(orders, filename = 'srm_college_bites_orders') {
  if (!orders || orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const headers = [
    'Order ID',
    'Date & Time',
    'Student Name',
    'Student Phone',
    'Restaurant',
    'Delivery Location',
    'Status',
    'Payment Status',
    'Total Amount (INR)',
    'Items Ordered'
  ];

  const rows = orders.map((o) => {
    const dateStr = o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—';
    const itemsList = Array.isArray(o.items)
      ? o.items.map((i) => `${i.name || i.dish_name || 'Item'} (x${i.quantity || 1})`).join('; ')
      : '—';

    return [
      `#${(o.id || '').toString().slice(-8).toUpperCase()}`,
      `"${dateStr}"`,
      `"${(o.student_name || o.studentName || 'Student').replace(/"/g, '""')}"`,
      `"${(o.student_phone || o.studentPhone || '—').replace(/"/g, '""')}"`,
      `"${(o.restaurant_name || o.restaurantName || o.restaurant_id || 'Campus Kitchen').replace(/"/g, '""')}"`,
      `"${(o.delivery_location || o.deliveryLocation || 'Vit-ap Campus').replace(/"/g, '""')}"`,
      `"${(o.status || 'pending').toUpperCase()}"`,
      `"${(o.payment_status || 'PAID').toUpperCase()}"`,
      Number(o.total_amount || o.totalAmount || 0).toFixed(2),
      `"${itemsList.replace(/"/g, '""')}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
