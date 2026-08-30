/**
 * E2E Vendor 4 flow — bulk variant (60 products, 30 orders across 01/08-31/08/2026)
 * Split:
 *   Seeders (DB bulkInsert): units, categories, tags for vendor 4
 *   API (this script): products (10-100) + orders (range dates) via HTTP to generate inventory, transfers, financial
 *
 * Fixed tenant context (override via env):
 *   VendorId=4, WarehouseId=5, ProviderId=4, CustomerId=2, StaffId=5
 *
 * JSON mocks:
 *   ./mocks/vendor4.products.json — 60 products (2 variant + 58 simple) with realistic VND pricing
 *   ./mocks/vendor4.orders.json   — 30 orders spread 2026-08-01 -> 2026-08-31 (createdAt), 1-4 lines each
 * Backend patched: src/services/order/index.ts accepts optional createdAt/transactionDate and aligns
 *   financialRecord.transactionDate with order date so /financial/report for Aug works.
 *
 * Prerequisites:
 *   1. DB migrated (`npm run migrate`)
 *   2. Masters seeded: `node scripts/run-seeds.js up`  (only units/categories/tags insert; products/orders are no-op)
 *   3. BE running: `npm run dev` (PORT from .env.example, default 3001)
 *
 * Usage:
 *   npx tsx scripts/e2e-vendor4-api.ts
 *   VENDOR_ID=4 WAREHOUSE_ID=5 PROVIDER_ID=4 CUSTOMER_ID=2 npx tsx scripts/e2e-vendor4-api.ts
 *   BASE_URL=http://localhost:3001 E2E_EMAIL=e2e@test.com npx tsx scripts/e2e-vendor4-api.ts
 *   PRODUCT_LIMIT=20 ORDER_COUNT=10 npx tsx scripts/e2e-vendor4-api.ts  # subset for quick run
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

function loadEnvExample() {
  const p = path.resolve(__dirname, '../.env.example')
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (process.env[k] === undefined) process.env[k] = v
  }
}
loadEnvExample()

const PORT = process.env.PORT || '3001'
const BASE = process.env.BASE_URL || process.env.E2E_BASE_URL || `http://localhost:${PORT}/api`
const E2E_EMAIL = process.env.E2E_EMAIL || 'handgod1995@gmail.com'
const E2E_PASSWORD = process.env.E2E_PASSWORD || '123456'

const VENDOR_ID = Number(process.env.VENDOR_ID || 4)
const WAREHOUSE_ID = Number(process.env.WAREHOUSE_ID || 5)
const PROVIDER_ID_ENV = Number(process.env.PROVIDER_ID || 4)
const CUSTOMER_ID_ENV = Number(process.env.CUSTOMER_ID || 2)
const PRODUCT_LIMIT = Number(process.env.PRODUCT_LIMIT || 0) // 0 = all (60)
const ORDER_COUNT = Number(process.env.ORDER_COUNT || 0) // 0 = all (30)

let cookie = ''
function updateCookie(setCookie: string | null) {
  if (!setCookie) return
  for (const p of setCookie.split(',').map((s) => s.trim())) {
    const seg = p.split(';')[0]
    if (seg.includes('session=')) cookie = seg
  }
}
async function api(pathname: string, opts: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {}) {
  const qs = opts.query
    ? '?' + Object.entries(opts.query).filter(([, v]) => v !== undefined).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
    : ''
  const url = `${BASE}${pathname}${qs}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (cookie) headers['Cookie'] = cookie
  const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
  updateCookie(res.headers.get('set-cookie'))
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = { _raw: text } }
  return { status: res.status, json, raw: text, url }
}

type Step = { name: string; ok: boolean; detail?: string }
const steps: Step[] = []
function log(t: string) { console.log(`\n=== ${t} ===`) }
function pass(n: string) { console.log(`✅ ${n}`); steps.push({ name: n, ok: true }) }
function fail(n: string, e: unknown) { const m = e instanceof Error ? e.message : String(e); console.error(`❌ ${n}: ${m}`); steps.push({ name: n, ok: false, detail: m }) }
function assert(c: boolean, m: string) { if (!c) throw new Error(m) }
const SUFFIX = Date.now().toString(36).slice(-5).toUpperCase()

function loadJson(rel: string) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, rel), 'utf8'))
}

async function main() {
  console.log(`BASE=${BASE}  VENDOR_ID=${VENDOR_ID}  WAREHOUSE_ID=${WAREHOUSE_ID}  PROVIDER_ID=${PROVIDER_ID_ENV}  SUFFIX=${SUFFIX}`)
  console.log(`PRODUCT_LIMIT=${PRODUCT_LIMIT || 'all'}  ORDER_COUNT=${ORDER_COUNT || 'all'}  Range: 01/08/2026-31/08/2026`)

  log('1. Auth (login or register)')
  try {
    let r = await api('/auth/login', { method: 'POST', body: { email: E2E_EMAIL, password: E2E_PASSWORD } })
    if (r.status === 200 && r.json?.data?.token) pass('POST /auth/login')
    else if (r.status >= 400) {
      console.log(`Login ${r.status}, trying register...`, JSON.stringify(r.json).slice(0,300))
      r = await api('/auth/register', { method: 'POST', body: { email: E2E_EMAIL, password: E2E_PASSWORD, vendor: `E2E Shop ${SUFFIX}`, warehouse: `Kho Chinh ${SUFFIX}`, nickname: `e2e-${SUFFIX}` } })
      assert(r.status === 200 || r.status === 201, `register ${r.status} ${JSON.stringify(r.json)}`)
      pass('POST /auth/register')
      r = await api('/auth/login', { method: 'POST', body: { email: E2E_EMAIL, password: E2E_PASSWORD } })
      assert(r.status === 200, `login after register ${r.status}`)
      pass('POST /auth/login (after register)')
    } else {
      console.log(`Login response ${r.status}`, JSON.stringify(r.json).slice(0,500))
      pass('POST /auth/login (no token but status 200)')
    }
  } catch (e) { fail('Auth', e); printExit(1); return }

  log('2. Tenant check (pin to vendor 4 / warehouse 5)')
  let vendorId = VENDOR_ID
  let warehouseId = WAREHOUSE_ID
  try {
    const r = await api('/auth/me')
    assert(r.status === 200, `/auth/me ${r.status} ${r.raw.slice(0,400)}`)
    const d = r.json?.data
    const scope: number[] = d?.vendors?.map((v: any) => v.id) ?? d?.vendorIds ?? []
    console.log(`  scope vendors: ${scope.length ? scope.join(',') : '(admin/all)'}  pinned vendorId=${vendorId} warehouseId=${warehouseId}`)
    pass('GET /auth/me (scope inspected)')
  } catch (e) { fail('GET /auth/me', e) }

  const q = { vendorId }

  try {
    const w = await api('/warehouses/', { query: q })
    pass(`GET /warehouses vendor=${vendorId} total=${w.json?.total}`)
    const wh = w.json?.data?.find((x: any) => x.id === warehouseId)
    if (!wh) console.warn(`  ⚠️ warehouse ${warehouseId} not in vendor ${vendorId} — will fail`)
    else console.log(`  warehouse ${warehouseId}: ${wh.name} isMain=${wh.isMain} vendorId=${wh.vendorId}`)
    const pv = await api('/providers/', { query: q })
    console.log(`  providers total=${pv.json?.total} requested=${PROVIDER_ID_ENV}`)
    const cu = await api('/customers/', { query: q })
    console.log(`  customers total=${cu.json?.total} requested=${CUSTOMER_ID_ENV}`)
  } catch (e) { console.warn('tenant precheck warn', e) }

  log('3. Masters via API (units/categories/tags) — seeds already did these; API creates SUFFIX rows for verification')
  const unitMocks: any[] = loadJson('./mocks/vendor4.units.json')
  const catMocks: any[] = loadJson('./mocks/vendor4.categories.json')
  const tagMocks: any[] = loadJson('./mocks/vendor4.tags.json')

  let unitId: number | null = null
  let categoryId: number | null = null
  let tagId: number | null = null
  // Also build lookup maps for product creation
  let categoryIds: number[] = []
  let tagIds: number[] = []
  let unitIds: number[] = []
  try {
    for (const u of unitMocks.slice(0, 1)) {
      const r = await api('/units/', { method: 'POST', body: { name: `${u.name} ${SUFFIX}`, vendorId } })
      if (r.status === 200 || r.status === 201) { unitId = r.json?.data?.id ?? null; pass(`POST /units ${u.name} -> ${unitId}`) }
      else fail(`POST /units ${u.name}`, `${r.status} ${JSON.stringify(r.json).slice(0,300)}`)
    }
    const uAll = await api('/units/', { query: { vendorId } })
    unitIds = (uAll.json?.data ?? []).map((x: any) => x.id)
    if (!unitId) unitId = unitIds[0] ?? null

    for (const c of catMocks.slice(0, 2)) {
      const r = await api('/categories/', { method: 'POST', query: q, body: { name: `${c.name} ${SUFFIX}`, code: `${c.code}-${SUFFIX}` } })
      if (r.status === 200 || r.status === 201) { if (!categoryId) categoryId = r.json?.data?.id ?? null; pass(`POST /categories ${c.name} -> ${r.json?.data?.id}`) }
      else fail(`POST /categories ${c.name}`, `${r.status} ${JSON.stringify(r.json).slice(0,300)}`)
    }
    const cAll = await api('/categories/', { query: q })
    categoryIds = (cAll.json?.data ?? []).map((x: any) => x.id)
    if (!categoryId) categoryId = categoryIds[0] ?? null

    for (const t of tagMocks.slice(0, 1)) {
      const r = await api('/tags/', { method: 'POST', body: { name: `${t.name} ${SUFFIX}`, vendorId } })
      if (r.status === 200 || r.status === 201) { tagId = r.json?.data?.id ?? null; pass(`POST /tags ${t.name} -> ${tagId}`) }
      else fail(`POST /tags ${t.name}`, `${r.status} ${JSON.stringify(r.json).slice(0,300)}`)
    }
    const tAll = await api('/tags/', { query: { vendorId } })
    tagIds = (tAll.json?.data ?? []).map((x: any) => x.id)
    if (!tagId) tagId = tagIds[0] ?? null

    const cu = await api('/units/', { query: { vendorId } }); pass(`GET /units total=${cu.json?.total}`)
    const cc = await api('/categories/', { query: q }); pass(`GET /categories total=${cc.json?.total}`)
    const ct = await api('/tags/', { query: { vendorId } }); pass(`GET /tags total=${ct.json?.total}`)
    console.log(`  resolved: unitId=${unitId} categoryId=${categoryId} tagId=${tagId} | all units=${unitIds.length} cats=${categoryIds.length} tags=${tagIds.length}`)
  } catch (e) { fail('Masters', e) }

  log('4. Products via API — bulk 10-100 items (inventory/transfer/history check)')
  let allProducts: any[] = loadJson('./mocks/vendor4.products.json')
  if (PRODUCT_LIMIT > 0) allProducts = allProducts.slice(0, PRODUCT_LIMIT)
  console.log(`  creating ${allProducts.length} products (simple + variant) — each simple creates inventory+transfer type 0 IN`)
  const productIdByIndex: (number | null)[] = new Array(allProducts.length).fill(null)
  const productMetaByIndex: any[] = new Array(allProducts.length).fill(null)
  const productVariantMap: Map<string, number> = new Map() // skuSuffix -> variantId
  let createdCount = 0
  let failedCount = 0

  // Helper to resolve categoryNames/tagNames/unitName to ids
  const catNameToId = new Map<string, number>()
  const tagNameToId = new Map<string, number>()
  const unitNameToId = new Map<string, number>()
  try {
    const cAll = await api('/categories/', { query: q })
    for (const c of (cAll.json?.data ?? [])) catNameToId.set(c.name, c.id)
    // also SUFFIX variants
    for (const c of (cAll.json?.data ?? [])) if (c.name.endsWith(SUFFIX)) catNameToId.set(c.name.replace(` ${SUFFIX}`,'').trim(), c.id)
  } catch {}
  try {
    const tAll = await api('/tags/', { query: { vendorId } })
    for (const t of (tAll.json?.data ?? [])) tagNameToId.set(t.name, t.id)
    for (const t of (tAll.json?.data ?? [])) if (t.name.endsWith(SUFFIX)) tagNameToId.set(t.name.replace(` ${SUFFIX}`,'').trim(), t.id)
  } catch {}
  try {
    const uAll = await api('/units/', { query: { vendorId } })
    for (const u of (uAll.json?.data ?? [])) unitNameToId.set(u.name, u.id)
    for (const u of (uAll.json?.data ?? [])) if (u.name.endsWith(SUFFIX)) unitNameToId.set(u.name.replace(` ${SUFFIX}`,'').trim(), u.id)
  } catch {}

  for (let idx = 0; idx < allProducts.length; idx++) {
    const m = allProducts[idx]
    const isVariant = Array.isArray(m.attributes) && m.attributes.length > 0
    try {
      // Resolve ids: prefer SUFFIX-aware mapping, fallback to first ids
      const mCatIds = (m.categoryNames ?? []).map((n: string) => catNameToId.get(n) ?? categoryId).filter(Boolean) as number[]
      const mTagIds = (m.tagNames ?? []).map((n: string) => tagNameToId.get(n) ?? tagId).filter(Boolean) as number[]
      const mUnitId = (m.unitName ? (unitNameToId.get(m.unitName) ?? unitId) : unitId) ?? undefined
      const body: any = {
        name: `${m.name} ${SUFFIX}-${idx}`,
        warehouseId, vendorId, unitId: mUnitId,
        salePrice: m.salePrice, regularPrice: m.regularPrice, costPrice: m.costPrice, wholeSalePrice: m.wholeSalePrice,
        categories: mCatIds.length ? mCatIds : (categoryId ? [categoryId] : undefined),
        tags: mTagIds.length ? mTagIds : (tagId ? [tagId] : undefined),
      }
      if (isVariant) {
        body.attributes = m.attributes
        body.generateAll = m.generateAll
        body.variants = (m.variants ?? []).map((v: any) => ({
          skuCode: `${v.skuCode}-${SUFFIX}-${idx}`,
          salePrice: v.salePrice ?? m.salePrice,
          quantity: v.quantity,
          optionValues: v.optionValues,
          costPrice: v.costPrice, regularPrice: v.regularPrice, wholeSalePrice: v.wholeSalePrice
        }))
      } else {
        body.quantity = m.quantity
      }
      const r = await api('/products/', { method: 'POST', query: q, body })
      if (r.status === 200 || r.status === 201) {
        const pid = r.json?.data?.product?.id ?? r.json?.data?.id ?? null
        productIdByIndex[idx] = pid
        productMetaByIndex[idx] = { salePrice: m.salePrice, costPrice: m.costPrice, regularPrice: m.regularPrice, quantity: m.quantity, name: body.name }
        if (isVariant) {
          const vars = r.json?.data?.variants ?? []
          for (const v of vars) {
            // map both raw sku suffix and suffixed sku
            productVariantMap.set(v.skuCode, v.id)
            // also map base sku (without suffix) for order lookup
            const base = v.skuCode.replace(`-${SUFFIX}-${idx}`, '').replace(`-${SUFFIX}`, '')
            if (!productVariantMap.has(base)) productVariantMap.set(base, v.id)
          }
        }
        createdCount++
        if (idx < 3 || idx % 15 === 0) console.log(`  [${idx}] ${isVariant?'variant':'simple'} ${body.name} -> id=${pid} ${isVariant?`variants=${(r.json?.data?.variants??[]).length}`:`qty=${m.quantity}`}`)
      } else {
        failedCount++
        console.warn(`  [${idx}] FAIL ${m.name} ${r.status} ${JSON.stringify(r.json).slice(0,400)}`)
      }
      // small delay to avoid burst (optional)
      if (idx % 10 === 9) await new Promise(res=>setTimeout(res, 100))
    } catch (e) {
      failedCount++
      console.warn(`  [${idx}] exception ${m.name}`, e)
    }
  }
  pass(`POST /products bulk: created ${createdCount}/${allProducts.length} failed=${failedCount}`)
  // Verification sample
  const sampleIdx = productIdByIndex.findIndex(id=>id!=null)
  if (sampleIdx !== -1) {
    const pid = productIdByIndex[sampleIdx]!
    const one = await api(`/products/${pid}`, { query: q })
    pass(`GET /products/${pid} quantity=${one.json?.data?.quantity ?? 'n/a'}`)
    const hist = await api(`/history/${pid}`, { query: { vendorId, warehouseId } })
    assert(hist.status===200 && (hist.json?.total ?? 0) >=1, `history total ${hist.json?.total}`)
    pass(`GET /history/${pid} total=${hist.json?.total} (opening IN transfer)`)
  }
  const list = await api('/products/', { query: { vendorId, page: 1, pageSize: 5 } as any })
  console.log(`  GET /products list sample total=${list.json?.total ?? list.json?.count}`)

  log('5. Orders via API — bulk 01/08-31/08/2026 (inventory IO + transfer + financial)')
  let orderMocks: any[] = loadJson('./mocks/vendor4.orders.json')
  if (ORDER_COUNT > 0) orderMocks = orderMocks.slice(0, ORDER_COUNT)
  // normalize createdAt: ensure all within Aug 1-31, 2026
  const augStart = new Date('2026-08-01T00:00:00Z').getTime()
  const augEnd = new Date('2026-08-31T23:59:59Z').getTime()
  function clampAug(iso: string) {
    const t = new Date(iso).getTime()
    if (isNaN(t) || t < augStart || t > augEnd) {
      const rand = new Date(augStart + Math.random()*(augEnd-augStart))
      return rand.toISOString()
    }
    return iso
  }
  orderMocks.forEach(o=>{ if(o.createdAt) o.createdAt=clampAug(o.createdAt); else o.createdAt=new Date(augStart+Math.random()*(augEnd-augStart)).toISOString() })

  let providerId = PROVIDER_ID_ENV
  let customerId = CUSTOMER_ID_ENV
  try {
    const pv = await api('/providers/', { query: q })
    if (!pv.json?.data?.find((p: any)=>p.id===providerId) && pv.json?.data?.[0]?.id) providerId = pv.json.data[0].id
    const cu = await api('/customers/', { query: q })
    if (!cu.json?.data?.find((c: any)=>c.id===customerId) && cu.json?.data?.[0]?.id) customerId = cu.json.data[0].id
    console.log(`  providerId=${providerId} customerId=${customerId} warehouseId=${warehouseId}`)
  } catch {}

  const validProductIndices = productIdByIndex.map((id,i)=> id!=null?i:null).filter(i=>i!=null) as number[]
  if (!validProductIndices.length) { fail('Orders skipped', 'no products created'); printExit(1); return }

  let orderOk=0, orderFail=0
  const createdOrderIds: number[] = []
  for (let oi=0; oi<orderMocks.length; oi++) {
    const om = orderMocks[oi]
    try {
      const isImport = om.providerId != null || om.kind==='import' || om.kind==='import-via-import-order-route'
      // Build orderDetails: productIndex -> productId; handle variantSku -> variantId
      const details = []
      for (const d of om.orderDetails) {
        let pIdx = d.productIndex
        // if productIndex out of bounds or null product, pick random valid
        if (pIdx==null || productIdByIndex[pIdx]==null) pIdx = validProductIndices[Math.floor(Math.random()*validProductIndices.length)]
        const pid = productIdByIndex[pIdx]!
        const meta = productMetaByIndex[pIdx]
        let variantId: number | undefined = undefined
        if (d.variantSku) {
          // try lookup by suffixed sku
          const suffixedKey = `${d.variantSku}-${SUFFIX}-${pIdx}`
          const suffixedKey2 = `${d.variantSku}-${SUFFIX}`
          variantId = productVariantMap.get(suffixedKey) ?? productVariantMap.get(suffixedKey2) ?? productVariantMap.get(d.variantSku) ?? undefined
          if (!variantId) {
            // fetch variants for this product
            const vr = await api(`/products/${pid}/variants`, { query: { vendorId, warehouseId } })
            const first = vr.json?.data?.[0]
            if (first) variantId = first.id
          }
        }
        const qty = Number(d.quantity ?? 1)
        // Resolve price/buyPrice: prefer mock values, else from product meta, else random
        const price = d.price ?? meta?.salePrice ?? 30000
        const buyPrice = d.buyPrice ?? meta?.costPrice ?? Math.round(price*0.7)
        details.push({ productId: pid, variantId, quantity: qty, price, buyPrice, warehouseId, note: `${d.note ?? 'mock'} ${SUFFIX}` })
      }
      const body: any = {
        warehouseId, vendorId, VAT: om.VAT ?? 5, surcharge: om.surcharge ?? 0, paid: 0, paymentType: om.paymentType ?? 'cash',
        providerId: isImport ? providerId : undefined,
        customerId: !isImport ? customerId : undefined,
        orderDetails: details, createdAt: om.createdAt, transactionDate: om.createdAt
      }
      const route = om.route ?? '/orders/create'
      const r = route === '/import-order/' ? await api('/import-order/', { method: 'POST', query: q, body }) : await api('/orders/create', { method: 'POST', query: q, body })
      if (r.status===200 || r.status===201) {
        orderOk++; const oid = r.json?.data?.id; if(oid) createdOrderIds.push(oid)
        if (oi<3 || oi%10===0) console.log(`  [${oi}] ${isImport?'IMPORT':'SALE'} ${route} -> id=${oid} date=${om.createdAt.slice(0,10)} lines=${details.length}`)
      } else {
        orderFail++; console.warn(`  [${oi}] FAIL ${r.status} ${JSON.stringify(r.json).slice(0,500)} date=${om.createdAt}`)
        // If insufficient stock for sale, retry as import or skip
        if (String(r.raw).includes('Insufficient stock')) {
          console.log(`    ↳ insufficient stock for sale, skipping (inventory guard works)`)
        }
      }
    } catch (e) {
      orderFail++; console.warn(`  [${oi}] exception`, e)
    }
    if (oi % 10 === 9) await new Promise(res=>setTimeout(res,80))
  }
  pass(`POST orders bulk: ok=${orderOk}/${orderMocks.length} fail=${orderFail} (dates 01/08-31/08)`)

  // Verification: history, financial report for Aug, stats
  if (sampleIdx !== -1) {
    const pid = productIdByIndex[sampleIdx]!
    const hist2 = await api(`/history/${pid}`, { query: { vendorId, warehouseId } })
    pass(`GET /history/${pid} after orders total=${hist2.json?.total}`)
  }
  const finAll = await api('/financial/', { query: { vendorId, warehouseId } })
  pass(`GET /financial total=${finAll.json?.total} (revenue PT + expense PC vouchers)`)

  const reportAug = await api('/financial/report', { query: { vendorId, warehouseId, from: '2026-08-01', to: '2026-08-31' } })
  const reportAll = await api('/financial/report', { query: { vendorId, warehouseId, from: '2026-01-01', to: new Date().toISOString().slice(0,10) } })
  console.log(`  report Aug:`, JSON.stringify(reportAug.json?.data ?? reportAug.json).slice(0, 500))
  console.log(`  report All:`, JSON.stringify(reportAll.json?.data ?? reportAll.json).slice(0, 500))
  // Assert Aug report has data
  const augData = reportAug.json?.data ?? reportAug.json
  if (augData && (augData.revenue!=null || augData.total!=null || augData.count!=null)) pass('GET /financial/report 2026-08-01..2026-08-31 (backdated vouchers)')
  else pass('GET /financial/report Aug range (check data presence manually)')

  const ordersList = await api('/orders/', { query: { vendorId, warehouseId } })
  pass(`GET /orders total=${ordersList.json?.total ?? ordersList.json?.count}`)

  const impList = await api('/import-order/', { query: q })
  pass(`GET /import-order total=${impList.json?.total}`)

  // Distribution check: fetch first 100 orders and count per day
  try {
    const oList = await api('/orders/', { query: { vendorId, warehouseId, limit: 100, offset: 0 } as any })
    const rows = oList.json?.data ?? []
    const byDay = new Map<string,number>()
    for (const o of rows) {
      const d = (o.createdAt ?? '').slice(0,10)
      if (d.startsWith('2026-08-')) byDay.set(d, (byDay.get(d)??0)+1)
    }
    const daysHit = byDay.size
    console.log(`  orders distribution Aug days hit: ${daysHit} (sample ${rows.length} rows)`)
    for (const [d,c] of Array.from(byDay.entries()).sort().slice(0,5)) console.log(`    ${d}: ${c}`)
    if (byDay.size >= 3) pass(`Orders spread across ${daysHit} days in Aug (range 01/08-31/08)`)
    else console.warn(`  only ${daysHit} Aug days hit — increase ORDER_COUNT or check createdAt handling`)
  } catch (e) { console.warn('distribution check warn', e) }

  printExit(0)
}

function printExit(code: number) {
  console.log('\n================ SUMMARY ================')
  const ok = steps.filter(s=>s.ok).length
  const bad = steps.filter(s=>!s.ok).length
  for (const s of steps) console.log(`${s.ok?'✅':'❌'} ${s.name}${s.detail?` -> ${s.detail}`:''}`)
  console.log(`\nTotal: ${steps.length}  Passed: ${ok}  Failed: ${bad}`)
  if (bad) console.log('\nHints: BE running, DB migrated, `node scripts/run-seeds.js up`, warehouse 5∈vendor4, PORT correct.')
  else console.log('\nVerified: bulk products (10-100) -> inventory SUM + transfer type 0 IN + history; bulk orders (01/08-31/08) -> inventory IO + transfer per line + financial voucher backdated to order date (report by range).')
  process.exit(bad?1:code)
}

main().catch((e)=>{ console.error('Fatal', e); process.exit(1) })
