# 請交給 Claude 的接手說明

請接手《九州兵譜：烽火歸途》v1.2 的現有專案，先理解並重現目前版本，再依我接下來的要求繼續開發。

1. 完整交接包內先讀 `project/CLAUDE.md`、`project/docs/CLAUDE_HANDOFF.md`、`project/AGENTS.md`，再讀 `project/RUNNING.md`。
2. 最新原始碼在 <https://github.com/chenzzii/KB> 的 `delivery/jiuzhou-v1`，遊戲基準提交為 `d4454a3a706476b129f9dd786b701f5759745a21`；不要從 main 假定最新版。
3. 目前已完成可通關的原創冒險、繪製風格美術、柳灣鄉營招募修正、25 兵種分層動作與地圖／戰鬥雙配樂。原始 README / CODEX_START 是保留的初始文件，勿因此重做 MVP 或覆蓋已完成功能。
4. Node.js 24；在 project 執行 `npm ci`、`npm run dev`。驗證用 `npm run validate:data`、`npm test`、`npm run build`；目前有 116 項測試。瀏覽器檢查的路徑與前置作業見完整交接說明。
5. 保留研究基線、原始異常記錄與 sourceTroopId 數值映射，並注意既有存檔／完整重播相容性。現有地圖是 32×32，未完成 64×64 擴圖；動作是分層 2D，音樂是合成演奏。
6. 本次要求是交接，尚未指定下一個新功能。先回報你對現況的理解、能否執行及發現的問題，再依我後續要求工作。

## 包內內容

- `project/`：完整原始碼、資料、全部 PNG／SVG 美術、測試、說明；不含 node_modules 或 .git。
- `web-build/`：已編譯完整靜態成品；在該目錄用 `python -m http.server 8080` 或 `python3 -m http.server 8080`，瀏覽 http://localhost:8080/ 即可遊玩，不需 npm。
- `project/artifacts/`：通關存檔、驗證摘要、最新畫面、兩首配樂試聽 WAV。這些是開發／測試證據，不是我的個人瀏覽器存檔。
- `original_handoff/development_pack_v1.zip`：最初使用者提供的開發交接包，37 檔均保持原樣。
- `HANDOFF_STATUS.json`：版本、Git 與部署對照、證據範圍。
- `SHA256_MANIFEST.json`、`VERIFY_PACKAGE.py`：執行 `python VERIFY_PACKAGE.py` 驗證完整性。

線上遊戲：<https://chenzzii.github.io/KB/?v=1.2>。按「配樂 開」聽新曲，動作預設開啟。公開網站是否已完成部署，以 GitHub Pages 實際狀態為準。

若使用輕量上下文包：其中只有文字原始碼與交接資料，沒有 PNG、美術音訊證據或可直接玩的 web-build；請另取完整包或 clone 上述分支後開發。原始碼取得權限依你的 GitHub 存取方式處理，包內不含帳密。
