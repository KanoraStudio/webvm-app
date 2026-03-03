#!/usr/bin/env node
/**
 * download-v86.js
 * v86・BIOS・coi-serviceworker を自動ダウンロード。
 * npm install 後に自動実行（postinstall）。
 * npm run setup でも手動実行可能。
 */
const https = require('https')
const http  = require('http')
const fs    = require('fs')
const path  = require('path')

const FILES = [
  {
    dest: 'public/v86/libv86.js',
    desc: 'v86 JS バインディング',
    urls: [
      'https://cdn.jsdelivr.net/gh/copy/v86@master/build/libv86.js',
      'https://rawcdn.githack.com/copy/v86/master/build/libv86.js',
      'https://raw.githubusercontent.com/copy/v86/master/build/libv86.js',
    ],
  },
  {
    dest: 'public/v86/v86.wasm',
    desc: 'v86 WASM 本体',
    urls: [
      'https://cdn.jsdelivr.net/gh/copy/v86@master/build/v86.wasm',
      'https://rawcdn.githack.com/copy/v86/master/build/v86.wasm',
    ],
  },
  {
    dest: 'public/bios/seabios.bin',
    desc: 'SeaBIOS',
    urls: [
      'https://raw.githubusercontent.com/copy/v86/master/bios/seabios.bin',
      'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/seabios.bin',
    ],
  },
  {
    dest: 'public/bios/vgabios.bin',
    desc: 'VGA BIOS',
    urls: [
      'https://raw.githubusercontent.com/copy/v86/master/bios/vgabios.bin',
      'https://cdn.jsdelivr.net/gh/copy/v86@master/bios/vgabios.bin',
    ],
  },
  {
    dest: 'public/coi-serviceworker.js',
    desc: 'coi-serviceworker',
    urls: [
      'https://cdn.jsdelivr.net/gh/gzuidhof/coi-serviceworker@master/coi-serviceworker.js',
      'https://raw.githubusercontent.com/gzuidhof/coi-serviceworker/master/coi-serviceworker.js',
    ],
  },
]

// ディレクトリ作成
;['public/v86', 'public/bios'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

// リダイレクト対応DL
function downloadUrl(targetUrl, dest, hop) {
  return new Promise((resolve, reject) => {
    if ((hop||0) > 10) return reject(new Error('リダイレクト多すぎ'))
    let parsed
    try { parsed = new URL(targetUrl) } catch(e) { return reject(e) }
    const lib = parsed.protocol === 'https:' ? https : http
    const req = lib.get(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'webvm-setup/2.0' } },
      res => {
        if ([301,302,303,307,308].includes(res.statusCode)) {
          res.resume()
          return downloadUrl(res.headers.location, dest, (hop||0)+1).then(resolve).catch(reject)
        }
        if (res.statusCode !== 200) {
          res.resume(); return reject(new Error('HTTP ' + res.statusCode))
        }
        const f = fs.createWriteStream(dest)
        res.pipe(f)
        f.on('finish', () => { f.close(); resolve((fs.statSync(dest).size/1024).toFixed(0)) })
        f.on('error', e => { try{fs.unlinkSync(dest)}catch{} ; reject(e) })
      }
    )
    req.on('error', e => { try{if(fs.existsSync(dest))fs.unlinkSync(dest)}catch{} ; reject(e) })
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('タイムアウト')) })
  })
}

// 複数URLをフォールバックしながら試す
async function dlWithFallback(file) {
  const urls = [...file.urls]
  let lastErr
  for (let i = 0; i < urls.length; i++) {
    const u = urls[i]
    const tag = i === 0 ? '' : ` [フォールバック${i}]`
    process.stdout.write(`  ⬇   ${file.desc}${tag} ... `)
    try {
      const kb = await downloadUrl(u, file.dest)
      console.log(`✅  ${kb} KB`)
      return true
    } catch(e) {
      console.log(`❌  ${e.message}`)
      lastErr = e
      if (fs.existsSync(file.dest)) fs.unlinkSync(file.dest)
    }
  }
  console.log(`  ⛔  ${file.desc}: 全URLで失敗`)
  return false
}

async function main() {
  console.log('\n📦  v86 セットアップを開始します...\n')

  // 既存ファイルの確認
  const todo = FILES.filter(f => {
    if (fs.existsSync(f.dest) && fs.statSync(f.dest).size > 1000) {
      console.log(`  ⏭   スキップ（同梱済み）  ${f.dest}  (${(fs.statSync(f.dest).size/1024).toFixed(0)} KB)`)
      return false
    }
    return true
  })

  if (todo.length === 0) {
    console.log('\n✅  すべてのファイルが同梱済みです！\n')
    console.log('  npm run dev         ← ローカル確認')
    console.log('  npm run deploy:github ← GitHub Pages公開\n')
    return
  }

  console.log('\n【STEP 1】 URLダウンロードを試みます...\n')
  const results = await Promise.all(todo.map(dlWithFallback))
  const failed = results.filter(r => !r).length

  console.log()
  if (failed === 0) {
    console.log('✅  セットアップ完了！\n')
    console.log('  ローカル確認:       npm run dev')
    console.log('  GitHub Pages 公開: npm run deploy:github\n')
  } else {
    console.error(`⚠️  ${failed}件のダウンロードが失敗しました。`)
    console.error('   インターネット接続を確認して npm run setup を再実行してください。\n')
    // 失敗してもexit 0にする（npm installが止まらないように）
  }
}

main().catch(e => { console.error(e); /* 失敗してもinstallは続行 */ })
