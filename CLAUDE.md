# Claude 接手入口：九州兵譜 v1.3

這是一個已實作、可從開局到結局的 TypeScript / Vite 單機遊戲。先讀 `docs/CLAUDE_HANDOFF.md`，再讀 `AGENTS.md`、`RUNNING.md` 及最新版本說明，從現況繼續。

- 本次交接的遊戲基準提交：`9f5b803c5d546e54908ffbce979a4d1dcb3611b8`（v1.3）。v1.2 為 `d4454a3a706476b129f9dd786b701f5759745a21`。
- 最新原始碼分支：`delivery/jiuzhou-v1`，網站分支：`gh-pages`，不要假定 `main` 是最新版。
- `README.md`、`CODEX_START.md`、`PROJECT_MANIFEST.json` 及原包文件是保留的初始交接資料。裡面的 MVP 階段或未完成描述可能已過時，應和現有程式及最新交接說明一起理解，不要重建或覆蓋已完成的遊戲。
- 保留原始研究資料、異常記錄及 25 個 sourceTroopId 數值映射；新的平衡須獨立保存。未經實驗不要把規則稱為 DOS 已驗證。
- UI、動畫和音樂不應改寫純規則引擎。修改規則／世界資料前先考慮既有存檔與重播相容性。
- 此次使用者要求是匯出交接包。下一個開發目標尚未指定；先理解與驗證現況，再依使用者後續要求實作。

啟動：Node.js 24、`npm ci`、`npm run dev`。基本檢查：`npm run validate:data`、`npm test`、`npm run build`。目前有 116 項單元測試；v1.3 另有 `npm run test:title` 瀏覽器檢查（27 項）。
