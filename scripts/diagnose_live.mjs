async function check() {
  console.log('--- 1. Checking Student Portal Assets ---');
  const studentRes = await fetch('https://mutebites-std.vercel.app/');
  const studentHtml = await studentRes.text();

  const scriptRegex = /<script\s+[^>]*src="([^"]+)"[^>]*>/gi;
  let match;
  while ((match = scriptRegex.exec(studentHtml)) !== null) {
    const src = match[1];
    const fullUrl = src.startsWith('http') ? src : new URL(src, 'https://mutebites-std.vercel.app/').href;
    const sRes = await fetch(fullUrl);
    console.log('Student Script:', src, '-> Status:', sRes.status, 'Type:', sRes.headers.get('content-type'));
    if (sRes.status !== 200 || sRes.headers.get('content-type')?.includes('text/html')) {
      console.error('❌ STUDENT SCRIPT FAILED:', fullUrl);
    }
  }

  console.log('\n--- 2. Checking Admin Portal Assets ---');
  const adminRes = await fetch('https://mutebites-std.vercel.app/admin');
  const adminHtml = await adminRes.text();

  while ((match = scriptRegex.exec(adminHtml)) !== null) {
    const src = match[1];
    const fullUrl = src.startsWith('http') ? src : new URL(src, 'https://mutebites-std.vercel.app/admin').href;
    const sRes = await fetch(fullUrl);
    console.log('Admin Script from /admin:', src, '-> URL:', fullUrl, '-> Status:', sRes.status, 'Type:', sRes.headers.get('content-type'));
    if (sRes.status !== 200 || sRes.headers.get('content-type')?.includes('text/html')) {
      console.error('❌ ADMIN SCRIPT FAILED (MIME TYPE HTML):', fullUrl);
    }
  }
}

check().catch(console.error);
