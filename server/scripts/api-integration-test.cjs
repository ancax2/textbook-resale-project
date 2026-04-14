/**
 * API integration tests (session cookies via Node http — fetch hides Set-Cookie).
 * Run with API up:  node scripts/api-integration-test.cjs
 *
 */
/* eslint-disable no-console */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOST = process.env.TEST_API_HOST || '127.0.0.1';
const PORT = Number(process.env.TEST_API_PORT || 5000, 10);

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

class ApiClient {
  constructor() {
    this.cookies = '';
    this.user = null;
  }

  mergeSetCookie(setCookie) {
    if (!setCookie) return;
    const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
    const jar = new Map();
    if (this.cookies) {
      for (const p of this.cookies.split('; ')) {
        if (!p) continue;
        jar.set(p.split('=')[0], p);
      }
    }
    for (const line of arr) {
      const pair = line.split(';')[0].trim();
      if (!pair) continue;
      jar.set(pair.split('=')[0], pair);
    }
    this.cookies = [...jar.values()].join('; ');
  }

  async request(method, pth, { json, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const hdrs = { ...headers };
      if (this.cookies) hdrs.Cookie = this.cookies;
      let payload = null;
      if (json !== undefined) {
        payload = Buffer.from(JSON.stringify(json), 'utf8');
        hdrs['Content-Type'] = 'application/json';
        hdrs['Content-Length'] = String(payload.length);
      }
      const req = http.request(
        { hostname: HOST, port: PORT, path: pth, method, headers: hdrs },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            this.mergeSetCookie(res.headers['set-cookie']);
            const raw = Buffer.concat(chunks).toString('utf8');
            let body = raw;
            try {
              body = raw ? JSON.parse(raw) : null;
            } catch {
              body = { _raw: raw };
            }
            resolve({ status: res.statusCode, body, raw });
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  async login(email, password) {
    const res = await this.request('POST', '/api/login', {
      json: { email, password }
    });
    assert(res.status === 200 && res.body && res.body.success, `Login failed ${email}: ${res.raw}`);
    this.user = res.body.user;
    return this.user;
  }

  async logout() {
    await this.request('POST', '/api/logout', {});
    this.user = null;
  }

  async multipartPostListings(parts) {
    const boundary = `----TestBoundary${Date.now()}`;
    const bufs = [];
    const CRLF = '\r\n';
    for (const part of parts) {
      if (part.field) {
        bufs.push(
          Buffer.from(
            `--${boundary}${CRLF}Content-Disposition: form-data; name="${part.field}"${CRLF}${CRLF}${part.value}${CRLF}`,
            'utf8'
          )
        );
      } else if (part.file) {
        const { name, mime, buffer } = part.file;
        bufs.push(
          Buffer.from(
            `--${boundary}${CRLF}Content-Disposition: form-data; name="images"; filename="${name}"${CRLF}Content-Type: ${mime}${CRLF}${CRLF}`,
            'utf8'
          )
        );
        bufs.push(buffer);
        bufs.push(Buffer.from(CRLF, 'utf8'));
      }
    }
    bufs.push(Buffer.from(`--${boundary}--${CRLF}`, 'utf8'));
    const body = Buffer.concat(bufs);

    return new Promise((resolve, reject) => {
      const hdrs = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(body.length)
      };
      if (this.cookies) hdrs.Cookie = this.cookies;
      const req = http.request(
        { hostname: HOST, port: PORT, path: '/api/listings', method: 'POST', headers: hdrs },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            this.mergeSetCookie(res.headers['set-cookie']);
            const raw = Buffer.concat(chunks).toString('utf8');
            let parsed = raw;
            try {
              parsed = raw ? JSON.parse(raw) : null;
            } catch {
              parsed = { _raw: raw };
            }
            resolve({ status: res.statusCode, body: parsed, raw });
          });
        }
      );
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

async function main() {
  let passed = 0;
  const ok = (name) => {
    passed += 1;
    console.log(`OK  ${passed}. ${name}`);
  };

  // --- Guest / auth ---
  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/user');
    assert(r.status === 401, 'guest /api/user should 401');
    ok('guest GET /api/user → 401');
  }

  {
    const c = new ApiClient();
    const r = await c.request('POST', '/api/login', {
      json: { email: 'john.doe@mynbcc.ca', password: 'wrong-password-xyz' }
    });
    assert(r.status === 401 && r.body && r.body.success === false, 'bad password should 401');
    ok('POST /api/login invalid password → 401');
  }

  {
    const c = new ApiClient();
    const r = await c.request('POST', '/api/login', {
      json: { email: '', password: '' }
    });
    assert(r.status === 400, 'empty login should 400');
    ok('POST /api/login empty body → 400');
  }

  const accounts = [
    ['john.doe@mynbcc.ca', 'password123', 'student'],
    ['jane.smith@mynbcc.ca', 'password123', 'student'],
    ['mike.wilson@mynbcc.ca', 'password123', 'student'],
    ['sarah.jones@mynbcc.ca', 'password123', 'student'],
    ['admin@nbcc.ca', 'admin123', 'admin']
  ];
  for (const [email, pw, role] of accounts) {
    const c = new ApiClient();
    const u = await c.login(email, pw);
    assert(u.email === email && u.role === role, `role/email for ${email}`);
    const me = await c.request('GET', '/api/user');
    assert(me.status === 200 && me.body.user.email === email, 'session /api/user');
    ok(`login + session: ${email} (${role})`);
  }

  {
    const c = new ApiClient();
    await c.login('john.doe@mynbcc.ca', 'password123');
    await c.logout();
    const me = await c.request('GET', '/api/user');
    assert(me.status === 401, 'after logout should 401');
    ok('logout clears session');
  }

  // --- Public reads ---
  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/programs');
    assert(r.status === 200 && Array.isArray(r.body), 'programs array');
    assert(r.body.length > 0, 'programs non-empty');
    ok('GET /api/programs');
  }

  let programs;
  let sampleListingId;
  let programNameForFilter;
  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/listings?limit=5');
    assert(r.status === 200 && r.body.listings && Array.isArray(r.body.listings), 'listings shape');
    assert(typeof r.body.total === 'number', 'total');
    sampleListingId = r.body.listings[0].listing_id;
    const pr = await c.request('GET', '/api/programs');
    programs = pr.body;
    programNameForFilter = programs[0];
    ok('GET /api/listings (paginated)');
  }

  {
    const c = new ApiClient();
    const r = await c.request('GET', `/api/listings?program_name=${encodeURIComponent(programNameForFilter)}&limit=100`);
    assert(r.status === 200);
    for (const L of r.body.listings) {
      assert(L.program_name === programNameForFilter, 'program filter');
    }
    ok('filter: program_name');
  }

  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/listings?program_year=1&limit=100');
    assert(r.status === 200);
    for (const L of r.body.listings) assert(String(L.program_year) === '1', 'year filter');
    ok('filter: program_year');
  }

  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/listings?condition_type=Good&limit=100');
    assert(r.status === 200);
    for (const L of r.body.listings) assert(L.condition_type === 'Good', 'condition filter');
    ok('filter: condition_type');
  }

  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/listings?price_min=50&price_max=100&limit=100');
    assert(r.status === 200);
    for (const L of r.body.listings) {
      const p = Number(L.price);
      assert(p >= 50 && p <= 100, 'price range');
    }
    ok('filter: price_min & price_max');
  }

  {
    const c = new ApiClient();
    const r = await c.request(
      'GET',
      `/api/listings?search=${encodeURIComponent('science')}&program_name=${encodeURIComponent(programNameForFilter)}&limit=50`
    );
    assert(r.status === 200);
    ok('search + program filter combined');
  }

  {
    const c = new ApiClient();
    const r = await c.request('GET', `/api/listings/${sampleListingId}`);
    assert(r.status === 200 && r.body.listing_id == sampleListingId, 'detail');
    ok('GET /api/listings/:id');
  }

  {
    const c = new ApiClient();
    const r = await c.request('GET', '/api/listings/999999999');
    assert(r.status === 404, 'missing listing 404');
    ok('GET /api/listings/:id not found → 404');
  }

  // --- Student: create listing (1 img, 3 img, validation) ---
  const john = new ApiClient();
  await john.login('john.doe@mynbcc.ca', 'password123');
  const johnId = john.user.user_id;

  const baseFields = {
    book_title: `E2E API Test ${Date.now()}`,
    author: 'Tester',
    publish_year: '2023',
    program_name: 'Computer Science',
    program_year: '1',
    price: '12.34',
    condition_type: 'Good',
    comments: 'integration test'
  };

  let createdId;
  {
    const r = await john.multipartPostListings([
      ...Object.entries(baseFields).map(([k, v]) => ({ field: k, value: String(v) })),
      { file: { name: 'one.png', mime: 'image/png', buffer: MIN_PNG } }
    ]);
    assert(r.status === 200 && r.body.success && r.body.listing_id, `create 1 img: ${r.raw}`);
    createdId = r.body.listing_id;
    ok('POST /api/listings with 1 PNG');
  }

  {
    const fields = {
      ...baseFields,
      book_title: `E2E Three Img ${Date.now()}`,
      price: '15.00'
    };
    const r = await john.multipartPostListings([
      ...Object.entries(fields).map(([k, v]) => ({ field: k, value: String(v) })),
      { file: { name: 'a.jpg', mime: 'image/jpeg', buffer: MIN_PNG } },
      { file: { name: 'b.jpg', mime: 'image/jpeg', buffer: MIN_PNG } },
      { file: { name: 'c.jpg', mime: 'image/jpeg', buffer: MIN_PNG } }
    ]);
    assert(r.status === 200 && r.body.success, `create 3 img: ${r.raw}`);
    ok('POST /api/listings with 3 JPEGs');
  }

  {
    const r = await john.multipartPostListings([
      { field: 'book_title', value: 'Incomplete' },
      { file: { name: 'x.png', mime: 'image/png', buffer: MIN_PNG } }
    ]);
    assert(r.status === 400, 'missing fields should 400');
    ok('POST /api/listings missing required fields → 400');
  }

  {
    const r = await john.multipartPostListings([
      ...Object.entries(baseFields).map(([k, v]) => ({
        field: k,
        value: k === 'book_title' ? `E2E NoImg ${Date.now()}` : String(v)
      }))
    ]);
    assert(r.status === 400, 'no images 400');
    ok('POST /api/listings no images → 400');
  }

  {
    const r = await john.multipartPostListings([
      ...Object.entries({ ...baseFields, book_title: `E2E BadFile ${Date.now()}` }).map(([k, v]) => ({
        field: k,
        value: String(v)
      })),
      { file: { name: 'evil.pdf', mime: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fake') } }
    ]);
    assert(r.status === 400, `invalid type → 400 got ${r.status}: ${r.raw}`);
    const errMsg = String((r.body && r.body.error) || '');
    assert(
      /image|required|png|jpeg/i.test(errMsg),
      `expected image-related error, got: ${errMsg}`
    );
    ok('POST /api/listings invalid file type → 400');
  }

  {
    const mine = await john.request('GET', '/api/listings/mine');
    assert(mine.status === 200 && Array.isArray(mine.body.active), 'mine');
    const found = mine.body.active.some((x) => Number(x.listing_id) === Number(createdId));
    assert(found, 'new listing in mine.active');
    ok('GET /api/listings/mine includes new listing');
  }

  // --- Messages ---
  const jane = new ApiClient();
  await jane.login('jane.smith@mynbcc.ca', 'password123');

  {
    const r = await jane.request('POST', '/api/messages', {
      json: { listing_id: createdId, message_text: 'E2E buyer message' }
    });
    assert(r.status === 200 && r.body.success, `message: ${r.raw}`);
    ok('POST /api/messages (buyer)');
  }

  {
    const r = await jane.request('POST', '/api/messages', {
      json: { listing_id: createdId, message_text: '' }
    });
    assert(r.status === 400, 'empty message 400');
    ok('POST /api/messages empty → 400');
  }

  {
    const r = await john.request('GET', `/api/messages/listing/${createdId}`);
    assert(r.status === 200 && Array.isArray(r.body), 'messages list');
    assert(r.body.some((m) => m.message_text && m.message_text.includes('E2E buyer')), 'thread content');
    ok('GET /api/messages/listing/:id (seller sees conversation)');
  }

  {
    const r = await john.request('POST', '/api/messages', {
      json: { listing_id: createdId, message_text: 'E2E seller reply' }
    });
    assert(r.status === 200 && r.body.success, `seller reply: ${r.raw}`);
    ok('POST /api/messages (seller reply)');
  }

  {
    const r = await john.request('GET', `/api/messages/listing/${createdId}`);
    assert(r.body.length >= 2, 'conversation length');
    ok('full thread after reply');
  }

  // --- Bookmarks ---
  {
    const r = await jane.request('POST', '/api/bookmarks', { json: { listing_id: createdId } });
    assert(r.status === 201 || r.status === 200, `bookmark add ${r.status}`);
    ok('POST /api/bookmarks');
  }

  {
    const r = await jane.request('GET', '/api/bookmarks');
    assert(r.status === 200 && Array.isArray(r.body), 'bookmarks list');
    assert(r.body.some((b) => Number(b.listing_id) === Number(createdId)), 'has bookmark');
    ok('GET /api/bookmarks');
  }

  let bookmarkRowId;
  {
    const r = await jane.request('GET', '/api/bookmarks');
    const row = r.body.find((b) => Number(b.listing_id) === Number(createdId));
    bookmarkRowId = row.bookmark_id;
    const del = await jane.request('DELETE', `/api/bookmarks/${bookmarkRowId}`);
    assert(del.status === 200 && del.body.success, 'delete by id');
    ok('DELETE /api/bookmarks/:id');
  }

  {
    await jane.request('POST', '/api/bookmarks', { json: { listing_id: createdId } });
    const del = await jane.request('DELETE', `/api/bookmarks/listing/${createdId}`);
    assert(del.status === 200 && del.body.success, 'delete by listing');
    ok('DELETE /api/bookmarks/listing/:listingId');
  }

  // --- Reports ---
  {
    const r = await jane.request('POST', '/api/reports', {
      json: {
        listing_id: createdId,
        report_type: 'Other',
        reason: 'E2E automated report'
      }
    });
    assert(r.status === 201 && r.body.success, `report: ${r.raw}`);
    ok('POST /api/reports');
  }

  {
    const r = await jane.request('POST', '/api/reports', {
      json: {
        listing_id: createdId,
        report_type: 'Other',
        reason: 'duplicate should fail'
      }
    });
    assert(r.status === 409, 'dup report 409');
    ok('POST /api/reports duplicate pending → 409');
  }

  // --- Mark sold + feedback ---
  {
    const r = await jane.request('PATCH', `/api/listings/${createdId}/sold`);
    assert(r.status === 403, 'non-seller cannot mark sold');
    ok('PATCH sold as non-owner → 403');
  }

  {
    const r = await john.request('PATCH', `/api/listings/${createdId}/sold`);
    assert(r.status === 200 && r.body.success, `mark sold: ${r.raw}`);
    ok('PATCH /api/listings/:id/sold (seller)');
  }

  {
    const r = await john.request('PATCH', `/api/listings/${createdId}/sold`);
    assert(r.status === 200 && r.body.success, 'idempotent sold');
    ok('PATCH sold again (already sold)');
  }

  {
    const r = await jane.request('POST', '/api/feedback', {
      json: { listing_id: createdId, rating: 5, comment: 'E2E great' }
    });
    assert(r.status === 201 && r.body.success, `feedback: ${r.raw}`);
    ok('POST /api/feedback (buyer, sold listing)');
  }

  {
    const r = await jane.request('POST', '/api/feedback', {
      json: { listing_id: createdId, rating: 4, comment: 'dup' }
    });
    assert(r.status === 409, 'dup feedback 409');
    ok('POST /api/feedback duplicate → 409');
  }

  {
    const r = await jane.request('GET', `/api/feedback/seller/${johnId}`);
    assert(r.status === 200 && r.body.items && Array.isArray(r.body.items), 'seller feedback');
    assert(r.body.count >= 1, 'at least one review');
    ok('GET /api/feedback/seller/:id');
  }

  {
    const r = await john.request('GET', `/api/feedback/mine/${createdId}`);
    assert(r.status === 200 && r.body.hasFeedback === false, 'seller has no buyer feedback row');
    ok('GET /api/feedback/mine/:listingId as seller');
  }

  {
    const r = await jane.request('GET', `/api/feedback/mine/${createdId}`);
    assert(r.status === 200 && r.body.hasFeedback === true, 'jane has feedback');
    ok('GET /api/feedback/mine/:listingId as buyer');
  }

  // --- Profile ---
  {
    const r = await john.request('GET', '/api/profile/me');
    assert(r.status === 200 && r.body.user && r.body.user.user_id == johnId, 'profile');
    ok('GET /api/profile/me');
  }

  // --- Admin ---
  const admin = new ApiClient();
  await admin.login('admin@nbcc.ca', 'admin123');

  {
    const r = await admin.request('GET', '/api/reports?status=pending');
    assert(r.status === 200 && Array.isArray(r.body), 'admin reports');
    ok('GET /api/reports (admin)');
  }

  {
    const r = await admin.request('GET', '/api/admin/stats');
    assert(r.status === 200 && typeof r.body.totalUsers === 'number', 'stats');
    ok('GET /api/admin/stats');
  }

  {
    const r = await john.request('GET', '/api/reports');
    assert(r.status === 403, 'student blocked from reports list');
    ok('GET /api/reports as student → 403');
  }

  let deleteTargetId;
  {
    const title = `E2E ADMIN DELETE ${Date.now()}`;
    const r = await john.multipartPostListings([
      ...Object.entries({ ...baseFields, book_title: title }).map(([k, v]) => ({ field: k, value: String(v) })),
      { file: { name: 'd.png', mime: 'image/png', buffer: MIN_PNG } }
    ]);
    assert(r.status === 200 && r.body.listing_id, 'listing for delete');
    deleteTargetId = r.body.listing_id;
    ok('create listing for admin delete');
  }

  {
    const r = await admin.request('DELETE', `/api/listings/${deleteTargetId}`, {
      json: { admin_notes: 'e2e soft delete' }
    });
    assert(r.status === 200 && r.body.success, `admin delete: ${r.raw}`);
    ok('DELETE /api/listings/:id (admin soft-delete)');
  }

  {
    const r = await new ApiClient().request('GET', `/api/listings/${deleteTargetId}`);
    assert(r.status === 404, 'deleted hidden from public detail');
    ok('deleted listing not in GET detail');
  }

  console.log(`\nDone. ${passed} checks passed.`);
}

main().catch((e) => {
  console.error('\nFAIL:', e.message || e);
  process.exit(1);
});
