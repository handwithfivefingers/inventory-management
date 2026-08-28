/**
 * E2E API flow script - tests BE via real HTTP (no seeders)
 *
 * Loads config from .env.example (not .env) per request.
 * Runs full dependency-ordered flow:
 *  auth -> vendor/warehouse -> masters (category/tag/unit/provider/customer)
 *  -> products (simple + variants) -> orders/import-orders -> invoices
 *  -> staff/roles/shift/financial/stats/history/settings
 *
 * Usage:
 *   npx tsx scripts/e2e-api.ts
 *   BASE_URL=http://localhost:3001 E2E_EMAIL=e2e@test.com npx tsx scripts/e2e-api.ts
 *
 * Requires BE running: npm run dev  (PORT from .env.example, default 3001)
 */
import * as fs from 'node:fs'
import * as path from 'node:path'

// ---------------------------------------------------------------------------
// Load .env.example manually (no dotenv dep needed)
// ---------------------------------------------------------------------------
function loadEnvExample() {
  const envPath = path.resolve(__dirname, '../.env.example')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    // only set if not already set (allow process.env override)
    if (process.env[key] === undefined) process.env[key] = val
  }
}
loadEnvExample()

const PORT = process.env.PORT || '3001'
const BASE = process.env.BASE_URL || process.env.E2E_BASE_URL || `http://localhost:${PORT}/api`
const E2E_EMAIL = process.env.E2E_EMAIL || 'e2e-api@test.com'
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'password123'

// ---------------------------------------------------------------------------
// Cookie jar + fetch wrapper
// ---------------------------------------------------------------------------
let cookie = ''

function updateCookie(setCookie: string | null) {
  if (!setCookie) return
  // Take first cookie segment (session=xxx; Path=...). Support multiple Set-Cookie headers joined by ','
  const parts = setCookie.split(',').map((s) => s.trim())
  for (const p of parts) {
    const seg = p.split(';')[0]
    if (seg.includes('session=')) {
      cookie = seg
    }
  }
}

type ApiOpts = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | undefined>
  expectStatus?: number
}

async function api(pathname: string, opts: ApiOpts = {}) {
  const qs = opts.query
    ? '?' +
      Object.entries(opts.query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : ''
  const url = `${BASE}${pathname}${qs}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cookie) headers['Cookie'] = cookie

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })

  // capture session cookie (node fetch lowercases headers)
  const setCookie = res.headers.get('set-cookie')
  updateCookie(setCookie)

  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _raw: text }
  }

  if (opts.expectStatus && res.status !== opts.expectStatus) {
    throw new Error(`${opts.method || 'GET'} ${pathname} expected ${opts.expectStatus} got ${res.status} body=${text.slice(0, 500)}`)
  }
  return { status: res.status, json, headers: res.headers, raw: text, url }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type StepResult = { name: string; ok: boolean; detail?: string; data?: any }
const results: StepResult[] = []

function log(title: string) {
  console.log(`\n=== ${title} ===`)
}
function pass(name: string, data?: any) {
  console.log(`✅ ${name}`)
  results.push({ name, ok: true, data })
}
function fail(name: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`❌ ${name}: ${msg}`)
  results.push({ name, ok: false, detail: msg })
}
function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`)
}

// unique suffix to avoid collisions on re-run (code/sku are not globally unique but sequence helps)
const SUFFIX = Date.now().toString(36).slice(-5).toUpperCase()

// ---------------------------------------------------------------------------
// Main flow
// ---------------------------------------------------------------------------
async function main() {
  console.log(`BASE=${BASE} (from .env.example PORT=${PORT})`)
  console.log(`E2E_EMAIL=${E2E_EMAIL}  SUFFIX=${SUFFIX}`)
  console.log(`Cookie auth: session cookie + ?vendorId= guard`)

  let vendorId: number | null = null
  let warehouseId: number | null = null
  let warehouseId2: number | null = null
  let categoryId: number | null = null
  let categoryId2: number | null = null
  let tagId: number | null = null
  let unitId: number | null = null
  let providerId: number | null = null
  let customerId: number | null = null
  let productSimpleId: number | null = null
  let productVariantId: number | null = null
  let variantId: number | null = null
  let orderId: number | null = null
  let importOrderId: number | null = null
  let invoiceId: number | null = null
  let staffId: number | null = null
  let roleId: number | null = null
  let shiftId: number | null = null

  // 1. Auth: try login, fallback to register
  log('1. Auth - login or register')
  try {
    let r = await api('/auth/login', {
      method: 'POST',
      body: { email: E2E_EMAIL, password: E2E_PASSWORD },
    })
    if (r.status === 200 && r.json?.data?.token) {
      pass('POST /auth/login', r.json.data)
    } else if (r.status >= 400) {
      console.log(`Login failed ${r.status}, trying register...`, r.json)
      r = await api('/auth/register', {
        method: 'POST',
        body: {
          email: E2E_EMAIL,
          password: E2E_PASSWORD,
          vendor: `E2E Shop ${SUFFIX}`,
          warehouse: `Kho Chinh ${SUFFIX}`,
          nickname: `e2e-${SUFFIX}`,
        },
      })
      assert(r.status === 200 || r.status === 201, `register status ${r.status} body ${JSON.stringify(r.json)}`)
      pass('POST /auth/register', r.json)
      // login after register to get cookie
      r = await api('/auth/login', {
        method: 'POST',
        body: { email: E2E_EMAIL, password: E2E_PASSWORD },
      })
      assert(r.status === 200, `login after register ${r.status}`)
      pass('POST /auth/login (after register)', r.json.data)
    }
  } catch (e) {
    fail('Auth', e)
    printSummaryAndExit(1)
    return
  }

  // 2. Me -> vendorId / warehouseId
  log('2. Auth me + vendor/warehouse discovery')
  try {
    const r = await api('/auth/me', { expectStatus: 200 })
    const d = r.json?.data
    assert(d, 'me data missing')
    // vendors: [{id, name, warehouses:[{id,name,isMain}]}]
    if (d.vendors?.length) {
      vendorId = d.vendors[0].id
      warehouseId = d.vendors[0].warehouses?.[0]?.id ?? null
    }
    // fallback: staff + role shape
    vendorId = vendorId ?? d.vendorId ?? null
    if (!vendorId && r.json?.data?.vendorIds?.length) vendorId = r.json.data.vendorIds[0]
    assert(!!vendorId, `vendorId missing from /auth/me ${JSON.stringify(d).slice(0, 800)}`)
    assert(!!warehouseId, `warehouseId missing from /auth/me ${JSON.stringify(d).slice(0, 800)}`)
    pass('GET /auth/me', { vendorId, warehouseId, user: { id: d.id, email: d.email } })
  } catch (e) {
    fail('GET /auth/me', e)
    printSummaryAndExit(1)
    return
  }

  const q = { vendorId: vendorId! }

  // 2b. Verify vendor & warehouses
  try {
    const r1 = await api('/vendor/', { query: q })
    pass('GET /vendor', { total: r1.json?.total, count: r1.json?.data?.length })

    const r2 = await api('/warehouses/', { query: q })
    pass('GET /warehouses', { total: r2.json?.total })

    // create secondary warehouse
    const r3 = await api('/warehouses/', {
      method: 'POST',
      query: q,
      body: { name: `Kho Phu SG ${SUFFIX}`, address: '123 Le Loi, Q1, HCM', phone: '0901234567', email: `sg-${SUFFIX.toLowerCase()}@test.vn` },
    })
    if (r3.status === 200 || r3.status === 201) {
      warehouseId2 = r3.json?.data?.id ?? r3.json?.id ?? null
      pass('POST /warehouses (secondary)', r3.json?.data ?? r3.json)
    } else {
      fail('POST /warehouses', `${r3.status} ${JSON.stringify(r3.json).slice(0, 400)}`)
    }
  } catch (e) {
    fail('Warehouses', e)
  }

  // 3. Masters: categories, tags, units, providers, customers
  log('3. Masters (categories/tags/units/providers/customers)')
  try {
    const c1 = await api('/categories/', { method: 'POST', query: q, body: { name: `Do Uong ${SUFFIX}`, code: `CAT-DU-${SUFFIX}` } })
    if (c1.status === 200 || c1.status === 201) {
      categoryId = c1.json?.data?.id ?? null
      pass('POST /categories Do Uong', c1.json.data)
    } else fail('POST /categories', `${c1.status} ${JSON.stringify(c1.json)}`)

    const c2 = await api('/categories/', { method: 'POST', query: q, body: { name: `Thuc Pham ${SUFFIX}`, code: `CAT-TP-${SUFFIX}` } })
    if (c2.status === 200 || c2.status === 201) {
      categoryId2 = c2.json?.data?.id ?? null
      pass('POST /categories Thuc Pham', c2.json.data)
    }

    const t = await api('/tags/', { method: 'POST', query: q, body: { name: `Ban Chay ${SUFFIX}` } })
    if (t.status === 200 || t.status === 201) {
      tagId = t.json?.data?.id ?? null
      pass('POST /tags', t.json.data)
    } else fail('POST /tags', `${t.status} ${JSON.stringify(t.json)}`)

    const u = await api('/units/', { method: 'POST', query: q, body: { name: `Chai ${SUFFIX}` } })
    if (u.status === 200 || u.status === 201) {
      unitId = u.json?.data?.id ?? null
      pass('POST /units', u.json.data)
    } else fail('POST /units', `${u.status} ${JSON.stringify(u.json)}`)

    const p = await api('/providers/', {
      method: 'POST',
      query: q,
      body: { name: `NCC Vinamilk ${SUFFIX}`, phone: '0283888888', address: 'TP HCM', email: `ncc-${SUFFIX.toLowerCase()}@vinamilk.vn` },
    })
    if (p.status === 200 || p.status === 201) {
      providerId = p.json?.data?.id ?? p.json?.data?.dataValues?.id ?? null
      // fallback: fetch list to get last created
      if (!providerId) {
        const fetched = await api('/providers/', { query: q })
        const last = fetched.json?.data?.[fetched.json.data.length - 1]
        providerId = last?.id ?? null
      }
      pass('POST /providers', { id: providerId, data: p.json.data })
    } else fail('POST /providers', `${p.status} ${JSON.stringify(p.json)}`)

    const cust = await api('/customers/', {
      method: 'POST',
      query: q,
      body: { name: `Nguyen Van A ${SUFFIX}`, phone: '0912345678', email: `a-${SUFFIX.toLowerCase()}@test.vn`, address: 'Ha Noi', taxCode: '0101234567' },
    })
    if (cust.status === 200 || cust.status === 201) {
      customerId = cust.json?.data?.id ?? cust.json?.id ?? null
      pass('POST /customers', cust.json.data ?? cust.json)
    } else fail('POST /customers', `${cust.status} ${JSON.stringify(cust.json)}`)

    // verify GET lists
    await api('/categories/', { query: q }).then((r) => pass('GET /categories', { total: r.json?.total }))
    await api('/tags/', { query: q }).then((r) => pass('GET /tags', { total: r.json?.total }))
    await api('/units/', { query: q }).then((r) => pass('GET /units', { total: r.json?.total }))
    await api('/providers/', { query: q }).then((r) => pass('GET /providers', { total: r.json?.total }))
    await api('/customers/', { query: q }).then((r) => pass('GET /customers', { total: r.json?.total }))
  } catch (e) {
    fail('Masters', e)
  }

  // 4. Products
  log('4. Products (simple + variant)')
  try {
    // simple product - warehouseId required, quantity sets inventory+transfer type 0 (IN)
    const simple = await api('/products/', {
      method: 'POST',
      query: q,
      body: {
        name: `Sua Tuoi Vinamilk 1L ${SUFFIX}`,
        warehouseId: warehouseId!,
        quantity: 100,
        salePrice: 35000,
        regularPrice: 38000,
        costPrice: 28000,
        vendorId: vendorId!,
        unitId: unitId ?? undefined,
        categories: categoryId ? [categoryId] : undefined,
        tags: tagId ? [tagId] : undefined,
      },
    })
    if (simple.status === 200 || simple.status === 201) {
      productSimpleId = simple.json?.data?.product?.id ?? simple.json?.data?.id ?? null
      pass('POST /products simple', { id: productSimpleId, code: simple.json?.data?.product?.code })
    } else fail('POST /products simple', `${simple.status} ${JSON.stringify(simple.json).slice(0, 600)}`)

    // variant product
    const variant = await api('/products/', {
      method: 'POST',
      query: q,
      body: {
        name: `Ao Thun Cotton ${SUFFIX}`,
        warehouseId: warehouseId!,
        salePrice: 199000,
        vendorId: vendorId!,
        unitId: unitId ?? undefined,
        categories: categoryId2 ? [categoryId2] : undefined,
        attributes: [
          { name: 'Mau', values: ['Do', 'Xanh'] },
          { name: 'Size', values: ['M', 'L'] },
        ],
        generateAll: true,
        variants: [
          { skuCode: `AO-DO-M-${SUFFIX}`, salePrice: 199000, quantity: 10 },
          { skuCode: `AO-XANH-L-${SUFFIX}`, salePrice: 209000, quantity: 5 },
        ],
      },
    })
    if (variant.status === 200 || variant.status === 201) {
      productVariantId = variant.json?.data?.product?.id ?? variant.json?.data?.id ?? null
      const vars = variant.json?.data?.variants ?? []
      variantId = vars[0]?.id ?? null
      pass('POST /products variant', { id: productVariantId, variants: vars.length, sampleSku: vars[0]?.skuCode })
    } else fail('POST /products variant', `${variant.status} ${JSON.stringify(variant.json).slice(0, 800)}`)

    // GETs
    const list = await api('/products/', { query: q })
    pass('GET /products', { total: list.json?.total, count: list.json?.data?.length })

    if (productSimpleId) {
      const one = await api(`/products/${productSimpleId}`, { query: q })
      pass(`GET /products/${productSimpleId}`, { name: one.json?.data?.name })
    }
    if (productVariantId) {
      const vars = await api(`/products/${productVariantId}/variants`, { query: { vendorId: vendorId!, warehouseId: warehouseId! } })
      pass(`GET /products/${productVariantId}/variants`, { total: vars.json?.total })
      if (!variantId && vars.json?.data?.[0]?.id) variantId = vars.json.data[0].id

      const attrs = await api(`/products/${productVariantId}/attributes`, { query: q })
      pass(`GET /products/${productVariantId}/attributes`, { count: attrs.json?.data?.length })

      const allAttrs = await api('/products/attributes', { query: q })
      pass('GET /products/attributes (all)', { count: allAttrs.json?.data?.length })
    }

    // negative test: missing warehouseId should 500/400
    const neg = await api('/products/', { method: 'POST', query: q, body: { name: `Should Fail ${SUFFIX}`, quantity: 1 } })
    if (neg.status >= 400) pass('POST /products without warehouseId correctly fails', { status: neg.status })
    else fail('POST /products without warehouseId should fail', `got ${neg.status}`)
  } catch (e) {
    fail('Products', e)
  }

  // 5. Orders & ImportOrders
  log('5. Orders & Import-Orders')
  try {
    if (!productSimpleId) throw new Error('skip: no productSimpleId')
    // Sales order (no provider -> revenue voucher) - warehouseId required in query for GET, in body for create
    const saleOrder = await api('/orders/create', {
      method: 'POST',
      query: q,
      body: {
        warehouseId: warehouseId!,
        vendorId: vendorId!,
        VAT: 10,
        surcharge: 0,
        paid: 0, // will be recalculated server-side
        paymentType: 'cash',
        // providerId omitted -> sales
        orderDetails: [
          { productId: productSimpleId, quantity: 2, price: 35000, buyPrice: 28000, warehouseId: warehouseId!, note: 'e2e sale' },
        ],
      },
    })
    if (saleOrder.status === 200 || saleOrder.status === 201) {
      orderId = saleOrder.json?.data?.id ?? saleOrder.json?.id ?? null
      pass('POST /orders/create (sale)', { id: orderId, code: saleOrder.json?.data?.code })
    } else fail('POST /orders/create (sale)', `${saleOrder.status} ${JSON.stringify(saleOrder.json).slice(0, 600)}`)

    // Import order (with provider -> expense voucher) via /orders and /import-order
    if (providerId) {
      const imp = await api('/orders/create', {
        method: 'POST',
        query: q,
        body: {
          warehouseId: warehouseId!,
          vendorId: vendorId!,
          providerId: providerId!,
          VAT: 5,
          surcharge: 10000,
          paid: 0,
          paymentType: 'transfer',
          orderDetails: [
            { productId: productSimpleId, quantity: 50, price: 30000, buyPrice: 25000, warehouseId: warehouseId!, note: 'e2e import' },
          ],
        },
      })
      if (imp.status === 200 || imp.status === 201) {
        importOrderId = imp.json?.data?.id ?? null
        pass('POST /orders/create (import)', { id: importOrderId })
      } else fail('POST /orders/create (import)', `${imp.status} ${JSON.stringify(imp.json).slice(0, 600)}`)

      // also via dedicated /import-order route (type=0 auto)
      const imp2 = await api('/import-order/', {
        method: 'POST',
        query: q,
        body: {
          warehouseId: warehouseId!,
          vendorId: vendorId!,
          providerId: providerId!,
          VAT: 5,
          surcharge: 5000,
          paid: 0,
          paymentType: 'transfer',
          orderDetails: [
            { productId: productSimpleId, quantity: 20, price: 30000, buyPrice: 25000, warehouseId: warehouseId!, note: 'e2e import via /import-order' },
          ],
        },
      })
      if (imp2.status === 200 || imp2.status === 201) {
        pass('POST /import-order/ (import)', { id: imp2.json?.data?.id })
        if (!importOrderId) importOrderId = imp2.json?.data?.id ?? null
      } else fail('POST /import-order/', `${imp2.status} ${JSON.stringify(imp2.json).slice(0, 600)}`)
    } else {
      fail('POST /orders/create (import) skipped', `providerId is null (masters failed)`)
    }

    // GET orders requires warehouseId
    const ordersList = await api('/orders/', { query: { vendorId: vendorId!, warehouseId: warehouseId! } })
    pass('GET /orders', { total: ordersList.json?.total ?? ordersList.json?.count })

    if (orderId) {
      const one = await api(`/orders/${orderId}`, { query: { vendorId: vendorId!, warehouseId: warehouseId! } })
      pass(`GET /orders/${orderId}`, { id: one.json?.data?.id })

      // update order (delta stock check)
      const upd = await api(`/orders/${orderId}`, {
        method: 'PUT',
        query: q,
        body: {
          VAT: 10,
          surcharge: 0,
          paymentType: 'cash',
          orderDetails: [
            { productId: productSimpleId, quantity: 3, price: 35000, buyPrice: 28000, warehouseId: warehouseId!, note: 'updated' },
          ],
        },
      })
      if (upd.status === 200) pass(`PUT /orders/${orderId} (qty 2->3)`, upd.json?.data?.id)
      else fail(`PUT /orders/${orderId}`, `${upd.status} ${JSON.stringify(upd.json).slice(0, 400)}`)
    }

    // import-order router (separate)
    const impList = await api('/import-order/', { query: q })
    pass('GET /import-order', { total: impList.json?.total })
    if (importOrderId) {
      const impOne = await api(`/import-order/${importOrderId}`, { query: q })
      pass(`GET /import-order/${importOrderId}`, { id: impOne.json?.data?.id })
    }
  } catch (e) {
    fail('Orders', e)
  }

  // 6. Invoices (must be created from an order per service: orderId required)
  log('6. Invoices (from order)')
  try {
    if (!orderId) throw new Error('skip: no orderId for invoice')
    const inv = await api('/invoices/', {
      method: 'POST',
      query: q,
      body: {
        orderId: orderId!,
        customerId: customerId ?? undefined,
        warehouseId: warehouseId!,
        // items omitted -> derived from orderDetails server-side
        // but we test explicit items too
        status: 'draft',
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notes: `E2E invoice ${SUFFIX}`,
      },
    })
    if (inv.status === 200 || inv.status === 201) {
      invoiceId = inv.json?.data?.id ?? null
      pass('POST /invoices (from order)', { id: invoiceId, number: inv.json?.data?.invoiceNumber })
    } else fail('POST /invoices', `${inv.status} ${JSON.stringify(inv.json).slice(0, 600)}`)

    const list = await api('/invoices/', { query: q })
    pass('GET /invoices', { total: list.json?.count ?? list.json?.total })

    if (invoiceId) {
      const one = await api(`/invoices/${invoiceId}`, { query: q })
      pass(`GET /invoices/${invoiceId}`, { number: one.json?.data?.invoiceNumber })

      const upd = await api(`/invoices/${invoiceId}`, {
        method: 'PUT',
        query: q,
        body: { notes: `Updated ${SUFFIX}` },
      })
      if (upd.status === 200) pass(`PUT /invoices/${invoiceId}`, upd.json?.data?.id)

      const statusUpd = await api(`/invoices/${invoiceId}/status`, {
        method: 'PUT',
        query: q,
        body: { status: 'issued' },
      })
      if (statusUpd.status === 200) pass(`PUT /invoices/${invoiceId}/status -> issued`, statusUpd.json?.data?.status)
    }
  } catch (e) {
    fail('Invoices', e)
  }

  // 7. Staff / Roles / Permissions
  log('7. Staff / Roles / Permissions')
  try {
    const perms = await api('/permission/', { query: q })
    pass('GET /permission', { count: Array.isArray(perms.json?.data) ? perms.json.data.length : perms.json?.total })

    const roles = await api('/roles/', { query: q })
    pass('GET /roles', { total: roles.json?.total ?? roles.json?.data?.length })
    const firstRoleId = roles.json?.data?.[0]?.id ?? 1
    roleId = firstRoleId

    // create role
    const newRole = await api('/roles/create', {
      method: 'POST',
      query: q,
      body: { name: `E2E Role ${SUFFIX}`, description: 'temp role', vendorId: vendorId! },
    })
    if (newRole.status === 200 || newRole.status === 201) {
      roleId = newRole.json?.data?.id ?? roleId
      pass('POST /roles/create', { id: roleId })
    }

    const staffList = await api('/staff/', { query: q })
    pass('GET /staff', { total: staffList.json?.total })

    const newStaff = await api('/staff/', {
      method: 'POST',
      query: q,
      body: {
        fullName: `E2E Staff ${SUFFIX}`,
        email: `staff-${SUFFIX.toLowerCase()}@test.vn`,
        password: 'password123',
        roleId: roleId!,
        vendorId: vendorId!,
        phone: '0987654321',
        gender: 'other',
        status: 'active',
        hireDate: new Date().toISOString().slice(0, 10),
      },
    })
    if (newStaff.status === 200 || newStaff.status === 201) {
      staffId = newStaff.json?.data?.id ?? newStaff.json?.id ?? null
      pass('POST /staff', { id: staffId, code: newStaff.json?.data?.code })
      if (staffId) {
        const one = await api(`/staff/${staffId}`, { query: q })
        pass(`GET /staff/${staffId}`, one.json?.data ?? one.json)

        const upd = await api(`/staff/${staffId}`, {
          method: 'PUT',
          query: q,
          body: { phone: '0911111111', status: 'active' },
        })
        if (upd.status === 200) pass(`PUT /staff/${staffId}`, upd.json)
      }
    } else fail('POST /staff', `${newStaff.status} ${JSON.stringify(newStaff.json).slice(0, 600)}`)
  } catch (e) {
    fail('Staff/Roles', e)
  }

  // 8. Shift
  log('8. Shift (open -> current -> close)')
  try {
    const open = await api('/shift/open', {
      method: 'POST',
      query: q,
      body: { warehouseId: warehouseId!, staffId: staffId ?? undefined, openingCash: 1000000, note: `E2E open ${SUFFIX}` },
    })
    if (open.status === 200 || open.status === 201) {
      shiftId = open.json?.data?.id ?? null
      pass('POST /shift/open', { id: shiftId, code: open.json?.data?.code })
    } else fail('POST /shift/open', `${open.status} ${JSON.stringify(open.json).slice(0, 400)}`)

    const cur = await api('/shift/current', { query: q })
    pass('GET /shift/current', cur.json?.data?.id ?? cur.json)

    const list = await api('/shift/', { query: q })
    pass('GET /shift', { total: list.json?.total })

    if (shiftId) {
      const close = await api(`/shift/${shiftId}/close`, {
        method: 'POST',
        query: q,
        body: { closingCash: 1500000, note: `E2E close ${SUFFIX}` },
      })
      if (close.status === 200) pass(`POST /shift/${shiftId}/close`, { status: close.json?.data?.status, difference: close.json?.data?.difference })
      else fail(`POST /shift/${shiftId}/close`, `${close.status} ${JSON.stringify(close.json).slice(0, 400)}`)
    }
  } catch (e) {
    fail('Shift', e)
  }

  // 9. Financial, Stats, History, Settings
  log('9. Financial / Stats / History / Settings')
  try {
    const v1 = await api('/financial/', {
      method: 'POST',
      query: q,
      body: { type: 'expense', category: 'other', amount: 50000, note: `E2E expense ${SUFFIX}`, warehouseId: warehouseId!, staffId: staffId ?? undefined },
    })
    if (v1.status === 200 || v1.status === 201) pass('POST /financial expense', { code: v1.json?.data?.code })

    const v2 = await api('/financial/', {
      method: 'POST',
      query: q,
      body: { type: 'revenue', category: 'sale', amount: 200000, note: `E2E revenue ${SUFFIX}`, warehouseId: warehouseId! },
    })
    if (v2.status === 200 || v2.status === 201) pass('POST /financial revenue', { code: v2.json?.data?.code })

    const vouchers = await api('/financial/', { query: { vendorId: vendorId!, warehouseId: warehouseId! } })
    pass('GET /financial', { total: vouchers.json?.total })

    const report = await api('/financial/report', { query: { vendorId: vendorId!, warehouseId: warehouseId!, from: '2026-01-01', to: new Date().toISOString().slice(0, 10) } })
    pass('GET /financial/report', report.json?.data ?? report.json)

    const stats = await api('/stats/dashboard', { query: { vendorId: vendorId!, warehouseId: warehouseId!, days: 7 } })
    pass('GET /stats/dashboard', stats.json?.data ? Object.keys(stats.json.data) : stats.json)

    if (productSimpleId) {
      const hist = await api(`/history/${productSimpleId}`, { query: { vendorId: vendorId!, warehouseId: warehouseId! } })
      pass(`GET /history/${productSimpleId}`, { total: hist.json?.total })
    }

    const settings = await api('/settings/', { query: q })
    pass('GET /settings', settings.json?.data ? 'ok' : JSON.stringify(settings.json).slice(0, 200))

    const updSettings = await api('/settings/', {
      method: 'PUT',
      query: q,
      body: { language: 'vi', theme: 'system', moneyUnit: 'VND' },
    })
    if (updSettings.status === 200) pass('PUT /settings', updSettings.json?.data?.language ?? 'ok')
  } catch (e) {
    fail('Financial/Stats', e)
  }

  // 10. Cleanup check (optional)
  log('10. Optional cleanup')
  console.log('To clean E2E data: re-run with fresh DB or manually DELETE via API:')
  if (staffId) console.log(`  DELETE /staff/${staffId}?vendorId=${vendorId}`)
  if (invoiceId) console.log(`  DELETE /invoices/${invoiceId}?vendorId=${vendorId} (only draft)`)
  if (productVariantId && variantId) console.log(`  DELETE /products/${productVariantId}/variants/${variantId}?vendorId=${vendorId}`)

  printSummaryAndExit(0)
}

function printSummaryAndExit(code: number) {
  console.log('\n================ SUMMARY ================')
  const ok = results.filter((r) => r.ok).length
  const bad = results.filter((r) => !r.ok).length
  for (const r of results) {
    console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` -> ${r.detail}` : ''}`)
  }
  console.log(`\nTotal: ${results.length}  Passed: ${ok}  Failed: ${bad}`)
  if (bad > 0) {
    console.log('\nHint: ensure BE is running (npm run dev), DB migrated, and .env.example PORT matches BASE.')
    console.log('      Common fails: missing ?vendorId= (vendorGuard 401), missing warehouseId (product/order), insufficient stock (order qty > inventory).')
  }
  process.exit(bad > 0 ? 1 : code)
}

main().catch((e) => {
  console.error('Fatal', e)
  process.exit(1)
})
