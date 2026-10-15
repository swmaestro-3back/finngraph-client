// 종목 로고를 토스증권 CDN 에서 받아 public/logos/{ticker}.png 로 저장한다.
// 브라우저는 레포 폴더에 쓸 수 없으니 이 스크립트를 개발 머신에서 돌리고 결과를 커밋한다.
// 이미 있는 파일은 건너뛰고, CDN 에 없는 종목(403·404)은 비워 둔다 — 런타임이 CDN → 이니셜로 떨어진다.
// 원본은 192~480px 인데 화면에는 최대 40px(레티나 80px)로만 그리므로 96px 로 줄여 저장한다.
//
//   node scripts/fetch-logos.mjs [--api http://localhost:8080/api] [--limit 20] [--force]
//   node scripts/fetch-logos.mjs --shrink-existing   # 이미 받아둔 파일만 96px 로 줄인다. API 를 부르지 않는다
//
// 티커 목록은 백엔드 GET /v1/stocks 에서 받는다. --api 가 없으면 VITE_API_BASE_URL, 그것도 없으면 localhost.
// 개발 서버(vite)가 떠 있는 동안 받았다면 서버를 재시작해야 새 파일을 서빙한다. 그 전까지는 index.html 로 떨어져 CDN 폴백이 뜬다.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const OUT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/logos')
const CONCURRENCY = 8
const LOGO_PX = 96

function parseArgs(argv) {
  const args = { api: process.env.VITE_API_BASE_URL || 'http://localhost:8080/api', limit: Infinity, force: false, shrinkExisting: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--api') args.api = argv[++i]
    else if (a === '--limit') {
      args.limit = Number(argv[++i])
      if (!Number.isInteger(args.limit) || args.limit <= 0) throw new Error('--limit 은 양의 정수여야 한다')
    }
    else if (a === '--force') args.force = true
    else if (a === '--shrink-existing') args.shrinkExisting = true
    else throw new Error(`모르는 옵션: ${a}`)
  }
  if (!args.api) throw new Error('--api 또는 VITE_API_BASE_URL 이 필요하다')
  return args
}

/** 토스증권 CDN 경로 — src/lib/stockLogo.ts 의 stockLogoUrl 과 같아야 한다 */
function cdnUrl(ticker) {
  return `https://static.toss.im/png-icons/securities/icn-sec-fill-${encodeURIComponent(ticker)}.png`
}

async function fetchTickers(api) {
  const res = await fetch(`${api.replace(/\/$/, '')}/v1/stocks`, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`종목 목록 실패: ${res.status} ${res.statusText}`)
  const body = await res.json()
  const rows = Array.isArray(body) ? body : body.data
  if (!Array.isArray(rows)) throw new Error('종목 목록 응답에 data 배열이 없다')
  return rows.map((r) => r.ticker).filter((t) => typeof t === 'string' && t.length > 0)
}

async function download(ticker) {
  const res = await fetch(cdnUrl(ticker))
  // 토스 CDN 은 없는 파일에 404 대신 403 을 준다
  if (res.status === 403 || res.status === 404) return 'missing'
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  await writeFile(path.join(OUT_DIR, `${ticker}.png`), await shrink(Buffer.from(await res.arrayBuffer())))
  return 'saved'
}

/** 투명 배경을 지키면서 LOGO_PX 정사각형으로 줄인다. 이미 그보다 작으면 키우지 않는다 */
async function shrink(png) {
  return sharp(png).resize(LOGO_PX, LOGO_PX, { fit: 'cover', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
}

async function shrinkExisting() {
  const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith('.png'))
  let before = 0
  let after = 0
  let next = 0
  async function worker() {
    while (next < files.length) {
      const file = path.join(OUT_DIR, files[next++])
      const png = await readFile(file)
      const small = await shrink(png)
      before += png.length
      after += small.length
      await writeFile(file, small)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  console.log(`${files.length}개 · ${mb(before)}MB → ${mb(after)}MB`)
}

async function main() {
  const { api, limit, force, shrinkExisting: onlyShrink } = parseArgs(process.argv.slice(2))
  await mkdir(OUT_DIR, { recursive: true })
  if (onlyShrink) return shrinkExisting()
  const have = new Set((await readdir(OUT_DIR)).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4)))

  const all = await fetchTickers(api)
  const todo = (force ? all : all.filter((t) => !have.has(t))).slice(0, limit)
  console.log(`종목 ${all.length}개 · 이미 있음 ${have.size}개 · 받을 것 ${todo.length}개`)

  const tally = { saved: 0, missing: 0, failed: 0 }
  const failed = []
  let next = 0
  async function worker() {
    while (next < todo.length) {
      const ticker = todo[next++]
      try {
        tally[await download(ticker)]++
      } catch (e) {
        tally.failed++
        failed.push(`${ticker}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  console.log(`저장 ${tally.saved}개 · CDN 에 없음 ${tally.missing}개 · 실패 ${tally.failed}개`)
  if (failed.length) {
    console.error(failed.join('\n'))
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
