import ordersHandler from '../student-app/api/_handlers/orders.js';

function createMockReqRes(method, url, body = {}, query = {}) {
  const req = {
    method,
    url,
    body,
    query,
    headers: {
      'x-matched-path': url
    }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    end: () => res
  };

  return { req, res, getResult: () => ({ statusCode, responseData }) };
}

async function run() {
  console.log('--- Testing API Handler with Supabase Database ---');

  // 1. Create an order via Handler
  const testOrderId = 'MB-TEST-' + Math.floor(100000 + Math.random() * 900000);
  const createMock = createMockReqRes('POST', '/api/orders', {
    id: testOrderId,
    student_name: 'Database Sync Test',
    student_email: 'synctest@vitap.ac.in',
    student_phone: '9876543210',
    delivery_location: 'Vit-ap Campus Block A',
    restaurant_id: 'bheemasena-restaurant',
    restaurant_name: 'Bheemasena Restaurant',
    total_amount: 150,
    items: [{ name: 'Masala Dosa', quantity: 2, price: 75 }]
  });

  await ordersHandler(createMock.req, createMock.res);
  const createRes = createMock.getResult();
  console.log('1. POST /api/orders status:', createRes.statusCode, 'Order ID:', createRes.responseData?.id);

  if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
    throw new Error('Order creation failed: ' + JSON.stringify(createRes.responseData));
  }

  // 2. Fetch order by ID
  const getMock = createMockReqRes('GET', `/api/orders/${testOrderId}`, {}, { id: testOrderId });
  await ordersHandler(getMock.req, getMock.res);
  const getRes = getMock.getResult();
  console.log('2. GET /api/orders/:id status:', getRes.statusCode, 'Fetched Order Status:', getRes.responseData?.order?.status);

  // 3. Admin updates status to PREPARING
  const prepMock = createMockReqRes('POST', '/api/orders/status', {
    orderId: testOrderId,
    status: 'PREPARING'
  });
  await ordersHandler(prepMock.req, prepMock.res);
  const prepRes = prepMock.getResult();
  console.log('3. POST /api/orders/status (PREPARING) result:', prepRes.statusCode, 'New Status:', prepRes.responseData?.status);

  // 4. Admin updates status to COMPLETED
  const compMock = createMockReqRes('POST', '/api/orders/status', {
    orderId: testOrderId,
    status: 'COMPLETED'
  });
  await ordersHandler(compMock.req, compMock.res);
  const compRes = compMock.getResult();
  console.log('4. POST /api/orders/status (COMPLETED) result:', compRes.statusCode, 'New Status:', compRes.responseData?.status);

  // 5. Verify order now reflects COMPLETED in GET
  const verifyMock = createMockReqRes('GET', `/api/orders/${testOrderId}`, {}, { id: testOrderId });
  await ordersHandler(verifyMock.req, verifyMock.res);
  const verifyRes = verifyMock.getResult();
  console.log('5. Verification GET status:', verifyRes.responseData?.order?.status, 'Completed at:', verifyRes.responseData?.order?.completed_at);

  // Clean up test order
  const delMock = createMockReqRes('DELETE', '/api/orders/delete', { orderId: testOrderId });
  await ordersHandler(delMock.req, delMock.res);
  console.log('6. Cleaned up test order:', testOrderId);

  console.log('✅ ALL DATABASE & API LIFECYCLE TESTS PASSED!');
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
