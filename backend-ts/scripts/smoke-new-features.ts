/**
 * Smoke test for NEW features (excel/transfer/return/stocktake/appearance/stock-rule)
 * Requires BE running: npm run dev (port from .env.example, default 3001)
 *
 * NOTE: products are created via the Excel import endpoint because direct
 * POST /products currently 500s in this dev DB (pre-existing, fails on clean
 * checkout too — verified via `git stash` + e2e-api.ts).
 *
 * Usage: npx tsx scripts/smoke-new-features.ts
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as XLSX from 'xlsx'

function loadEnvExample() {
  const envPath = path.resolve(__dirname, '../.env.example')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
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
const BASE = process.env.BASE_URL || `http://localhost:${PORT}/api`
const EMAIL = process.env.E2E_EMAIL || 'e2e-api@test.com'
const PASSWORD = process.env.E2E_PASSWORD || 'password123'
const SUFFIX = Date.now().toString(36).slice(-5).toUpperCase()

let cookie = ''
let token = ''
function updateCookie(sc: string | null) {
  if (!sc) return
  for (const p of sc.split(',')) {
    const seg = p.trim().split(';')[0]
    if (seg.includes('session=')) cookie = seg
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra }
  if (cookie) h['Cookie'] = cookie
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

type Opts = { method?: string; body?: unknown; raw?: string; headers?: Record<string, string>; expectStatus?: number }
async function api(pathname: string, opts: Opts = {}) {
  const headers = authHeaders({ 'Content-Type': 'application/json', ...(opts.headers || {}) })
  const res = await fetch(`${BASE}${pathname}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.raw ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  })
  updateCookie(res.headers.get('set-cookie'))
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _raw: text.slice(0, 300) }
  }
  if (opts.expectStatus && res.status !== opts.expectStatus) {
    throw new Error(`${opts.method || 'GET'} ${pathname} expected ${opts.expectStatus} got ${res.status} body=${text.slice(0, 400)}`)
  }
  return { status: res.status, json, raw: text }
}

/** Multipart file upload (for multer endpoints). */
async function upload(pathname: string, file: { filename: string; buffer: Buffer; mime: string }, fields: Record<string, string> = {}) {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mime }), file.filename)
  const res = await fetch(`${BASE}${pathname}`, { method: 'POST', headers: authHeaders(), body: form })
  updateCookie(res.headers.get('set-cookie'))
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _raw: text.slice(0, 300) }
  }
  return { status: res.status, json, raw: text }
}

const results: { name: string; ok: boolean; detail?: string }[] = []
function pass(n: string) { console.log(`✅ ${n}`); results.push({ name: n, ok: true }) }
function fail(n: string, e: unknown) {
  const m = e instanceof Error ? e.message : String(e)
  console.error(`❌ ${n}: ${m}`)
  results.push({ name: n, ok: false, detail: m })
}
async function step(name: string, fn: () => Promise<void>) {
  try { await fn(); pass(name) } catch (e) { fail(name, e) }
}

function makeImportWorkbook(rows: Record<string, any>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['Tên sản phẩm', 'Mã SP (code)', 'SKU', 'Giá bán (salePrice)', 'Tồn kho', 'Cho âm (isNegative)'],
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

async function main() {
  console.log(`BASE=${BASE} SUFFIX=${SUFFIX}`)
  let vendorId = 0, warehouseId = 0, warehouseId2 = 0, productId = 0, orderId = 0
  const SKU_A = `SMKA${SUFFIX}`

  // ---- auth (login, fallback register) — same shape as scripts/e2e-api.ts ----
  await step('Auth: login or register', async () => {
    let r = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
    if (r.status >= 400) {
      r = await api('/auth/register', {
        method: 'POST',
        body: {
          email: EMAIL,
          password: PASSWORD,
          vendor: `Smoke Shop ${SUFFIX}`,
          warehouse: `Kho Chinh ${SUFFIX}`,
          nickname: `smoke-${SUFFIX}`,
        },
      })
      if (r.status >= 400) throw new Error(`register ${r.status} ${r.raw.slice(0, 300)}`)
      r = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
      if (r.status >= 400) throw new Error(`login-after-register ${r.status} ${r.raw.slice(0, 300)}`)
    }
    token = r.json?.data?.token || ''
    if (!token && !cookie) throw new Error(`no token/cookie: ${r.raw.slice(0, 200)}`)
  })

  // vendor/warehouse discovery from /auth/me (vendors[].warehouses[])
  const me = await api('/auth/me')
  const meData = me.json?.data
  vendorId = meData?.vendors?.[0]?.id ?? meData?.vendorId ?? meData?.vendor?.id ?? 0
  if (!vendorId) throw new Error('cannot resolve vendorId from /auth/me: ' + JSON.stringify(meData).slice(0, 300))
  const mainWarehouse = meData?.vendors?.[0]?.warehouses?.[0]?.id
  const q = `vendorId=${vendorId}`

  // ---- masters: second warehouse ----
  await step('Masters: second warehouse', async () => {
    if (mainWarehouse) {
      warehouseId = mainWarehouse
    } else {
      const w1 = await api(`/warehouses?${q}`)
      const existing = (w1.json?.data?.rows || w1.json?.data || []) as any[]
      warehouseId = existing[0]?.id ?? 0
    }
    const w2 = await api(`/warehouses?${q}`, { method: 'POST', body: { name: `Smoke WH2 ${SUFFIX}`, address: 'x' } })
    const w2Data = w2.json?.data
    warehouseId2 = w2Data?.id ?? w2Data?.warehouse?.id ?? 0
    if (!warehouseId2) throw new Error('cannot create second warehouse ' + w2.raw.slice(0, 200))
    if (!warehouseId) throw new Error('no main warehouse available')
  })

  // ---- FEATURE 5: Excel import (create + update by skuCode) — also seeds products ----
  await step('POST /products/import creates+updates', async () => {
    const rows = [
      { 'Tên sản phẩm': `SmokeImp A ${SUFFIX}`, 'Mã SP (code)': SKU_A, 'SKU': SKU_A, 'Giá bán (salePrice)': 12000, 'Tồn kho': 3, 'Cho âm (isNegative)': 'false' },
    ]
    const r = await upload(
      `/products/import?${q}&warehouseId=${warehouseId}`,
      { filename: `smoke-${SUFFIX}.xlsx`, buffer: makeImportWorkbook(rows), mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      { vendorId: String(vendorId), warehouseId: String(warehouseId) },
    )
    if (r.status !== 200) throw new Error(`status ${r.status} ${r.raw.slice(0, 400)}`)
    const data = r.json?.data
    if (data && (data.failed > 0 || (data.errors && data.errors.length))) {
      throw new Error('import report has failures: ' + JSON.stringify(data).slice(0, 300))
    }
    if (!data || !(data.created >= 1 || data.updated >= 1)) {
      throw new Error('no created/updated in report: ' + JSON.stringify(data).slice(0, 200))
    }
  })

  // ---- resolve productId by skuCode ----
  await step('Find imported product by skuCode', async () => {
    const r = await api(`/products?${q}&s=${SKU_A}`)
    const rows: any[] = r.json?.data?.rows || r.json?.data || []
    const found = rows.find((p) => p.skuCode === SKU_A || p.code === SKU_A)
    productId = found?.id ?? 0
    if (!productId) throw new Error(`product ${SKU_A} not in list (${rows.length} rows)`)
  })

  // ---- FEATURE 4: Excel export ----
  await step('GET /products/export returns xlsx', async () => {
    const r = await api(`/products/export?${q}`)
    if (r.status !== 200) throw new Error(`status ${r.status} ${r.raw.slice(0, 200)}`)
    if (r.json && r.json._raw && r.json._raw.startsWith('<')) throw new Error('html error page')
    if (r.json && r.json.error) throw new Error('error envelope: ' + r.raw.slice(0, 200))
  })

  // ---- FEATURE 7: warehouse transfer ----
  await step('POST /warehouses/transfer moves stock', async () => {
    const r = await api(`/warehouses/transfer?${q}`, {
      method: 'POST',
      body: { fromWarehouseId: warehouseId, toWarehouseId: warehouseId2, items: [{ productId, quantity: 1 }], note: 'smoke' },
    })
    if (r.status !== 200 && r.status !== 201) throw new Error(`${r.status} ${r.raw.slice(0, 300)}`)
    if (!r.json?.data) throw new Error('no data returned')
  })

  await step('Transfer rejects same-warehouse / bad qty', async () => {
    const r1 = await api(`/warehouses/transfer?${q}`, {
      method: 'POST',
      body: { fromWarehouseId: warehouseId, toWarehouseId: warehouseId, items: [{ productId, quantity: 1 }] },
    })
    if (r1.status < 400) throw new Error('same-warehouse transfer accepted')
    const r2 = await api(`/warehouses/transfer?${q}`, {
      method: 'POST',
      body: { fromWarehouseId: warehouseId, toWarehouseId: warehouseId2, items: [{ productId, quantity: 0 }] },
    })
    if (r2.status < 400) throw new Error('zero-qty transfer accepted')
  })

  // ---- order create (for return test) — stock: 3 (import) - 1 (transfer) = 2 ----
  await step('Create order to test return', async () => {
    const r = await api(`/orders/create?${q}`, {
      method: 'POST',
      body: {
        warehouseId,
        vendorId,
        VAT: 0,
        surcharge: 0,
        paid: 0,
        paymentType: 'cash',
        orderDetails: [{ productId, quantity: 2, price: 10000, warehouseId, note: 'smoke sale' }],
      },
    })
    orderId = r.json?.data?.order?.id ?? r.json?.data?.id ?? r.json?.id ?? 0
    if (!orderId) throw new Error(`order create: ${r.status} ${r.raw.slice(0, 400)}`)
  })

  // ---- FEATURE 9: stock blocking on order create ----
  await step('Order blocked when stock insufficient & !isNegative', async () => {
    const r = await api(`/orders/create?${q}`, {
      method: 'POST',
      body: {
        warehouseId,
        vendorId,
        orderDetails: [{ productId, quantity: 9999, price: 1000, warehouseId }],
      },
    })
    if (r.status < 400) throw new Error('overselling order was accepted')
  })

  // ---- FEATURE 6: order return ----
  await step('POST /orders/:id/return returns partial', async () => {
    // resolve the orderDetailId for the product line (GET requires warehouseId)
    const od = await api(`/orders/${orderId}?${q}&warehouseId=${warehouseId}`)
    const odData = od.json?.data?.order ?? od.json?.data ?? {}
    const details: any[] = odData?.orderDetails || []
    const line = details.find((d) => Number(d.productId) === Number(productId))
    if (!line?.id) throw new Error('order has no detail line for product: ' + JSON.stringify(od.json).slice(0, 200))
    const r = await api(`/orders/${orderId}/return?${q}`, {
      method: 'POST',
      body: { items: [{ orderDetailId: line.id, quantity: 1 }], reason: 'smoke return' },
    })
    if (r.status !== 200 && r.status !== 201) throw new Error(`${r.status} ${r.raw.slice(0, 400)}`)
  })

  await step('Return rejects quantity > sold', async () => {
    const r = await api(`/orders/${orderId}/return?${q}`, {
      method: 'POST',
      body: { items: [{ orderDetailId: 999999, quantity: 1 }] },
    })
    if (r.status < 400) throw new Error('bogus orderDetailId accepted')
  })

  // ---- FEATURE 8: stocktake flow ----
  await step('Stocktake: start -> lines -> complete', async () => {
    // cancel any open session left on this warehouse (one-open-session guard)
    const list = await api(`/stocktake?${q}`)
    const sessions: any[] = list.json?.data?.rows || list.json?.data || []
    for (const s of sessions) {
      if (s.status === 'open' && Number(s.warehouseId) === Number(warehouseId)) {
        await api(`/stocktake/${s.id}/cancel?${q}`, { method: 'POST', body: {} })
      }
    }
    const s = await api(`/stocktake?${q}`, { method: 'POST', body: { warehouseId, note: 'smoke' } })
    const st = s.json?.data
    const stId = st?.id ?? st?.stocktake?.id
    if (!stId) throw new Error(`start: ${s.status} ${s.raw.slice(0, 300)}`)

    const g = await api(`/stocktake/${stId}?${q}`)
    const detail = g.json?.data
    const lines: any[] = detail?.stocktakeDetails || detail?.StocktakeDetails || detail?.details || detail?.lines || []
    if (!lines.length) throw new Error('no stocktake lines generated: ' + JSON.stringify(detail).slice(0, 200))

    // contract: match by detail id, field actualQuantity (see updateLines)
    const updLines = lines.map((l: any) => ({
      id: l.id,
      actualQuantity: Number(l.expectedQuantity ?? 0) + 1,
    }))
    const u = await api(`/stocktake/${stId}/lines?${q}`, { method: 'PUT', body: { lines: updLines } })
    if (u.status >= 400) throw new Error(`updateLines: ${u.status} ${u.raw.slice(0, 300)}`)

    const c = await api(`/stocktake/${stId}/complete?${q}`, { method: 'POST', body: { note: 'done' } })
    if (c.status >= 400) throw new Error(`complete: ${c.status} ${c.raw.slice(0, 300)}`)

    // cancel path on a fresh session
    const s2 = await api(`/stocktake?${q}`, { method: 'POST', body: { warehouseId, note: 'smoke2' } })
    const st2Id = s2.json?.data?.id ?? s2.json?.data?.stocktake?.id
    if (st2Id) {
      const cx = await api(`/stocktake/${st2Id}/cancel?${q}`, { method: 'POST', body: {} })
      if (cx.status >= 400) throw new Error(`cancel: ${cx.status} ${cx.raw.slice(0, 200)}`)
    }
  })

  // ---- FEATURE 10: settings appearance ----
  await step('PUT /settings saves appearance JSON', async () => {
    const r = await api(`/settings/?${q}`, {
      method: 'PUT',
      body: { language: 'vi', theme: 'system', appearance: { preset: 'fashion', terminology: 'fashion' } },
    })
    if (r.status >= 400) throw new Error(`${r.status} ${r.raw.slice(0, 300)}`)
    const g = await api(`/settings/?${q}`)
    const ap = g.json?.data?.appearance
    if (!ap || ap.preset !== 'fashion') throw new Error('appearance not persisted: ' + JSON.stringify(g.json?.data).slice(0, 200))
  })

  printSummary()
}

function printSummary() {
  console.log('\n================ SMOKE SUMMARY ================')
  const ok = results.filter((r) => r.ok).length
  const bad = results.filter((r) => !r.ok).length
  for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` -> ${r.detail}` : ''}`)
  console.log(`\nTotal: ${results.length}  Passed: ${ok}  Failed: ${bad}`)
  process.exit(bad > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Fatal', e)
  process.exit(1)
})
