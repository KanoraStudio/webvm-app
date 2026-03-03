# 🖥️ WebVM — GitHub Pages 公開マニュアル

> ブラウザ上で動くPC仮想マシン  
> カメラ・マイク・トラックパッド・USB対応  
> **完全無料で GitHub Pages に公開できます**

---

## 📋 目次

1. [事前準備](#1-事前準備)
2. [GitHubリポジトリの作成](#2-githubリポジトリの作成)
3. [プロジェクトのセットアップ](#3-プロジェクトのセットアップ)
4. [リポジトリ名の設定（重要）](#4-リポジトリ名の設定重要)
5. [GitHubにアップロード](#5-githubにアップロード)
6. [GitHub Pages を有効にする](#6-github-pages-を有効にする)
7. [デプロイ（公開）](#7-デプロイ公開)
8. [動作確認](#8-動作確認)
9. [2回目以降の更新方法](#9-2回目以降の更新方法)
10. [トラブルシューティング](#10-トラブルシューティング)
11. [使い方ガイド](#11-使い方ガイド)
12. [推奨OSとダウンロード先](#12-推奨osとダウンロード先)

---

## 1. 事前準備

### 必要なもの（すべて無料）

| ソフト | 確認方法 | ダウンロード先 |
|--------|----------|----------------|
| Node.js 20以上 | `node --version` | https://nodejs.org/ |
| Git | `git --version` | https://git-scm.com/ |
| GitHubアカウント | — | https://github.com/ |
| Chrome または Edge | — | https://www.google.com/chrome/ |

### インストール確認

ターミナル（WindowsはコマンドプロンプトまたはpowerShell）を開いて確認します：

```bash
node --version
# v20.x.x 以上であればOK

git --version
# git version 2.x.x 以上であればOK
```

---

## 2. GitHubリポジトリの作成

### ① GitHub にログイン

https://github.com を開いてログインします（アカウントがない場合は無料で作成）。

### ② 新しいリポジトリを作成

1. 右上の **「＋」** → **「New repository」** をクリック
2. 以下のように設定します：

   | 項目 | 設定値 |
   |------|--------|
   | Repository name | `webvm-app` |
   | Description | WebVM - Browser PC Emulator |
   | Public / Private | **Public**（GitHub Pagesは無料プランでPublicのみ） |
   | Initialize this repository | **チェックしない** |

3. **「Create repository」** をクリック

### ③ リポジトリURLをメモ

作成後に表示されるURLをメモします：
```
https://github.com/あなたのユーザー名/webvm-app
```

---

## 3. プロジェクトのセットアップ

ZIPファイルを解凍したフォルダに移動してターミナルを開きます。

### ① パッケージをインストール

```bash
npm install
```

> ⚠️ `v86` 関連のエラーが出ても無視してOKです  
> v86 は npm に登録されていないため、次のコマンドで別途ダウンロードします

### ② v86・coi-serviceworker を自動ダウンロード

```bash
npm run setup
```

以下のファイルが自動でダウンロードされます：

```
public/
├── v86/
│   ├── libv86.js          ← v86 JSバインディング
│   └── v86.wasm           ← v86 WASMエンジン本体
├── bios/
│   ├── seabios.bin        ← PC BIOS
│   └── vgabios.bin        ← VGA BIOS
└── coi-serviceworker.js   ← GitHub Pages用 SharedArrayBuffer対応
```

> 💡 `coi-serviceworker.js` は GitHub Pages で SharedArrayBuffer（v86の高速動作に必要）を  
> 有効にするためのファイルです。これがないと動作しません。

### ③ ローカルで動作確認（任意）

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてISOファイルを選択すると動作確認できます。

確認できたら `Ctrl + C` で停止します。

---

## 4. リポジトリ名の設定（重要）

`vite.config.ts` を開いて、リポジトリ名を設定します。

```typescript
// vite.config.ts の3行目あたり

// ★ ここをあなたのリポジトリ名に変更してください
// 例: https://yourname.github.io/webvm-app/ の場合
const GITHUB_REPO_NAME = '/webvm-app/'
```

> **リポジトリ名を変えた場合** は `'/リポジトリ名/'` に変更してください  
> 例: リポジトリ名が `my-webvm` なら `/my-webvm/` にします

> **カスタムドメインを使う場合**（例: `yourname.github.io`）は `'/'` にします

---

## 5. GitHubにアップロード

ターミナルで以下を順番に実行します。

### ① Gitの初期設定（初回のみ）

```bash
git config --global user.name "あなたの名前"
git config --global user.email "あなたのメールアドレス"
```

### ② Gitリポジトリを初期化

```bash
git init
git add .
git commit -m "first commit"
```

### ③ GitHubに接続してプッシュ

`あなたのユーザー名` の部分を実際のGitHubユーザー名に変えてください：

```bash
git remote add origin https://github.com/あなたのユーザー名/webvm-app.git
git branch -M main
git push -u origin main
```

> **認証を求められた場合**  
> GitHubのパスワードではなく **Personal Access Token** が必要です  
> GitHub → Settings → Developer settings → Personal access tokens → Generate new token  
> 権限: `repo` にチェック → トークンをパスワード欄に貼り付け

---

## 6. GitHub Pages を有効にする

### ① GitHubリポジトリの Settings を開く

1. https://github.com/あなたのユーザー名/webvm-app を開く
2. 上部タブの **「Settings」** をクリック
3. 左サイドバーの **「Pages」** をクリック

### ② Sourceを設定

| 項目 | 設定値 |
|------|--------|
| Source | **Deploy from a branch** |
| Branch | **gh-pages** |
| Folder | **/ (root)** |

> ⚠️ まだ `gh-pages` ブランチが存在しないので「gh-pages」が選べない場合は  
> 次のSTEP 7でデプロイ後に戻ってきて設定してください

---

## 7. デプロイ（公開）

### ビルド＆GitHub Pagesにアップロード

```bash
npm run deploy:github
```

このコマンドで：
1. TypeScriptをビルド（`dist/` フォルダに出力）
2. `dist/` の内容を `gh-pages` ブランチに自動プッシュ
3. GitHub Pages が自動でデプロイ開始

### 完了メッセージ確認

```
Published
```

と表示されればOKです。

### 公開URLを確認

デプロイ後 **2〜5分待ってから** 以下のURLにアクセスします：

```
https://あなたのユーザー名.github.io/webvm-app/
```

---

## 8. 動作確認

### ✅ 正常に動作する状態

1. URLにアクセスするとWebVMの画面が表示される
2. ISOファイルをドラッグ＆ドロップで選択できる
3. OSが数秒〜数十秒で起動する

### ⚠️ 初回アクセス時の注意

`coi-serviceworker.js` が初回読み込み時にService Workerを登録するため、  
**ページが一度自動リロードされます**。これは正常な動作です。

### Chrome/Edge で確認

- **カメラ・マイク**: アドレスバー左の 🔒 アイコン → カメラ/マイクを「許可」
- **USB**: デバイスバーの「💾 USBストレージ接続」クリック → デバイス選択ダイアログ
- **HID**: デバイスバーの「⌨️ HIDデバイス接続」クリック → デバイス選択ダイアログ

---

## 9. 2回目以降の更新方法

ファイルを変更したら以下を実行するだけです：

```bash
# ① ソースコードをGitHubのmainブランチに保存
git add .
git commit -m "更新内容のメモ"
git push

# ② GitHub Pagesに再デプロイ
npm run deploy:github
```

---

## 10. トラブルシューティング

### ❌ `npm install` でエラーが出る

```
npm error notarget No matching version found for v86
```

**→ 解決策**: このエラーは無視してOKです。`npm run setup` で別途ダウンロードします。

---

### ❌ ページが真っ白 / 画面が表示されない

**原因**: `vite.config.ts` のリポジトリ名が違う

**→ 解決策**:  
`vite.config.ts` の `GITHUB_REPO_NAME` を確認します。  
リポジトリ名が `webvm-app` 以外の場合は変更して再デプロイします。

```typescript
const GITHUB_REPO_NAME = '/あなたのリポジトリ名/'
```

---

### ❌ 「SharedArrayBuffer is not defined」エラー

**原因**: `coi-serviceworker.js` がない、または読み込まれていない

**→ 解決策**:  
```bash
npm run setup  # coi-serviceworker.js を再ダウンロード
npm run deploy:github
```

---

### ❌ ISOを選択しても起動しない / 黒い画面のまま

**原因1**: `v86.wasm` または `bios` ファイルがない  
**→ 解決策**: `npm run setup` を再実行

**原因2**: メモリ不足  
**→ 解決策**: `EmulatorManager.ts` の `memoryMB` を増やす

```typescript
await mgr.start({
  isoFile: file,
  memoryMB: 1024,  // 512 → 1024 に変更
```

---

### ❌ カメラ・マイクが動かない

**原因**: HTTPSでない / 許可していない

**→ 解決策**:  
GitHub Pages は自動でHTTPS対応なのでURLが `https://` になっているか確認します。  
アドレスバーの 🔒 をクリック → カメラ/マイクを「許可」に変更します。

---

### ❌ USB・HIDが動かない

**原因**: Firefox・Safari は WebUSB/WebHID に対応していません

**→ 解決策**: **Chrome または Edge の最新版** を使ってください。

---

### ❌ `git push` で認証エラー

**→ 解決策**:  
GitHubのPersonal Access Tokenを使います。

1. GitHub → 右上アイコン → Settings
2. 左下「Developer settings」
3. 「Personal access tokens」→「Tokens (classic)」
4. 「Generate new token (classic)」
5. `repo` にチェック → 「Generate token」
6. 表示されたトークン（`ghp_...`）をコピー
7. `git push` のパスワード欄に貼り付け

---

### ❌ デプロイ後もURLが404

**原因1**: gh-pages ブランチの反映待ち  
**→ 解決策**: 5〜10分待ってからアクセスします

**原因2**: Settings → Pages の Source が正しくない  
**→ 解決策**: Source を `gh-pages` ブランチ / `/ (root)` に設定します

---

## 11. 使い方ガイド

### ISOファイルの選択

1. ブラウザでURLにアクセス
2. 画面中央の **「📁 クリックまたはドラッグ＆ドロップ」** エリアにISOファイルを投げ込む
3. プログレスバーが表示され、数秒〜数十秒でOS起動

### デバイスバーの操作

| ボタン | 機能 | 対応ブラウザ |
|--------|------|-------------|
| 📷 カメラOFF/ON | Webカメラのオン/オフ | Chrome/Edge/Firefox |
| 🎤 マイクOFF/ON | マイクのオン/オフ | Chrome/Edge/Firefox |
| 🖱️ トラックパッド接続中 | マウス・キーボード（自動） | 全ブラウザ |
| 💾 USBストレージ接続 | USBメモリ等を接続 | Chrome/Edge のみ |
| ⌨️ HIDデバイス接続 | USBキーボード・マウス | Chrome/Edge のみ |
| 💾 状態を保存 | インストール状態をIndexedDBに保存 | 全ブラウザ |

### 状態の保存と復元

「💾 状態を保存」を押すと、現在のHDD状態がブラウザのIndexedDBに保存されます。  
次回同じISOファイルを選択すると、自動的に保存済み状態から起動します（インストール済みの状態が維持されます）。

---

## 12. 推奨OSとダウンロード先

| OS | ダウンロード先 | サイズ | 起動時間 | 評価 |
|----|--------------|--------|----------|------|
| **Alpine Linux** | https://alpinelinux.org/downloads/ | ~200MB | 10〜30秒 | ⭐⭐⭐⭐⭐ 最推奨 |
| **FreeDOS** | https://www.freedos.org/download/ | ~50MB | 5〜15秒 | ⭐⭐⭐⭐⭐ 最軽量 |
| **Ubuntu Server 22.04** | https://ubuntu.com/download/server | ~1.4GB | 1〜3分 | ⭐⭐⭐⭐ |
| **ReactOS** | https://reactos.org/download/ | ~200MB | 2〜5分 | ⭐⭐⭐ |
| **Windows XP** | （自身で入手） | ~600MB | 3〜10分 | ⭐⭐⭐⭐ |
| **FreeBSD 13** | https://www.freebsd.org/where/ | ~900MB | 1〜3分 | ⭐⭐⭐ |

> 💡 **Alpine Linux** の `Standard x86_64` が最もスムーズに動作します。  
> まず Alpine で動作確認してから他のOSを試すことをお勧めします。

---

## 📁 ファイル構成（参考）

```
webvm-app/
├── public/
│   ├── bios/
│   │   ├── seabios.bin       ← setup後に配置
│   │   └── vgabios.bin       ← setup後に配置
│   ├── v86/
│   │   ├── libv86.js         ← setup後に配置
│   │   └── v86.wasm          ← setup後に配置
│   └── coi-serviceworker.js  ← setup後に配置（GitHub Pages必須）
├── src/
│   ├── App.tsx               ← メインUI（ヘッダー・レイアウト）
│   ├── core/
│   │   ├── EmulatorManager.ts   ← v86起動・Blob URL高速読み込み
│   │   └── StorageManager.ts    ← IndexedDB永続化
│   ├── devices/
│   │   ├── CameraDevice.ts      ← カメラ → 仮想V4L2
│   │   ├── MicrophoneDevice.ts  ← マイク → 仮想AC97
│   │   ├── TrackpadDevice.ts    ← マウス/タッチ/キーボード
│   │   └── USBDevice.ts         ← WebUSB/WebHID/Gamepad
│   └── ui/
│       ├── ISOSelector.tsx      ← ISO選択画面
│       ├── VMScreen.tsx         ← Canvas描画
│       └── DeviceBar.tsx        ← デバイス操作バー
├── scripts/
│   └── download-v86.js       ← v86/coi-sw 自動ダウンロード
├── vite.config.ts            ← ★リポジトリ名を設定
├── package.json
├── tsconfig.json
└── .gitignore
```

---

## 🔧 コマンドまとめ

```bash
npm install              # パッケージインストール
npm run setup            # v86・coi-sw をGitHubからDL
npm run dev              # ローカル開発サーバー起動 (localhost:5173)
npm run build            # ビルド（distフォルダに出力）
npm run deploy:github    # GitHub Pagesにデプロイ ★メイン
npm run deploy:firebase  # Firebase Hostingにデプロイ（任意）
```

---

*WebVM — MIT License — 全ツール完全無料*
