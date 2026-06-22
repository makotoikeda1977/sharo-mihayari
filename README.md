# 社労士 改変見破り（仮）

社労士試験の**誤り肢**は、正しい条文を「少しだけ改変」して作られている。
その**改変ポイントをタップで見抜く**演習アプリ。○×の一歩先（×ならどこをどう直すか・なぜか）を鍛える。

横断宮殿（sharo-master）の姉妹アプリ。宮殿＝整理・暗記（インプット）、本アプリ＝実戦・見破り（アウトプット）。

## 特徴
- 誤り肢の中から改変された語句をタップ → 正誤判定 → 正文との差分・改変タイプ・解説・根拠条文
- 改変タイプ別（数値すり替え／論理条件 AND↔OR／可否反転／範囲限定／手続き主体 など）の**弱点を可視化**
- 静的PWA（オフライン可・ホーム追加可）

## 構成
- `index.html` … 画面の器（描画は app.js）
- `styles.css`
- `js/cards.js` … 改変カードのデータ
- `js/app.js` … 出題・判定・統計ロジック
- `manifest.webmanifest` / `sw.js` … PWA
- `icons/` … アイコン（暫定で横断宮殿から流用）
- `.github/workflows/pages.yml` … GitHub Pages へ自動デプロイ

## ローカルで開く
```
cd sharo-mihayari
python3 -m http.server 8000
# → http://localhost:8000/
```

## デプロイ
`main` に push すると GitHub Actions（pages.yml）でルート全体が GitHub Pages に公開される。
初回のみ Settings → Pages → Source を「GitHub Actions」に設定。

## データの注意（重要）
- 収録は**試作v1**。労基・安衛の鉄板論点を中心に12問。
- 改変肢・正文・解説は社労士知識ベースで作成。**現行法照合（法令txt照合）は別途レビュー前提**。
- 量産時は「過去問の×肢 → 正文との差分抽出」を主ルートにし、現行法照合ゲートを必ず通す。

## カードの形式（cards.js）
```js
{
  id, subject, source,
  sentence,                       // 改変済みの誤り肢
  targets:[{t:"語句", c:true/false}],  // c:true が改変箇所（正解）
  type,                           // 改変タイプ
  wrong, right,                   // 誤）→ 正）の差分
  explain, law                    // 解説・根拠条文
}
```
