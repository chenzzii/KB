# 獨立美術交接下載

`jiuzhou-art-handoff-v1.2.zip`：五張原始 PNG 圖集、91 項圖格／背景索引、86 原型 SVG、分層動作整合碼、實際畫面與完整地圖、Claude 美術接手說明，以及可獨立開啟的 preview.html。解壓後先讀 START_HERE.md；逐檔 SHA-256 與預覽驗證均已附上。

原始完整程式交接包已有 PNG，位於 project/public/assets/painted/；輕量上下文包沒有 PNG。這份獨立美術包可以搭配兩者使用。

# Claude 交接下載：v1.3

- `jiuzhou-claude-handoff-v1.3.zip`：完整原始碼、全部美術、完整靜態成品、原始開發包、測試存檔、畫面與音樂證據（含 v1.3 標題流程驗證與截圖），約 43.4 MB。
- `jiuzhou-claude-context-v1.3.zip`：純文字上下文與程式資料，約 0.4 MB；供 Claude 先閱讀，遊玩／完整開發需另取完整包或 clone 專案。
- `CLAUDE_START_HERE.md`：可直接交給 Claude 的接手說明。
- 同名 `.zip.sha256`：ZIP 的 SHA-256；包內另有逐檔清單與 VERIFY_PACKAGE.py。

遊戲基準為 v1.3 提交 `9f5b803`，與網站及 `jiuzhou-v1.3-web.zip` 同版。已完成全新解壓、重新 npm ci、資料檢查、116 項測試與 build；96 個重建靜態檔與附上的 web-build 逐檔一致。v1.2 交接包已由 v1.3 取代，仍可從 Git 歷史取回。

# 最新靜態成品：v1.3

`jiuzhou-v1.3-web.zip`：新增標題畫面、五頁開場故事（可跳過）、選擇身分頁（四職業特色、起始部曲、配樂／音效／動作／提示設定）、遊戲說明、首次提示，以及地圖上招兵地點（綠「募」）與交戰地點（紅「戰」）的明顯區分。v1.2 的動作、配樂、美術與招募功能全部保留。

解壓後閱讀 START_HERE.md。線上版本：https://chenzzii.github.io/KB/?v=1.3 。核心規則與存檔格式未變，舊存檔可匯入。已從全新解壓的 ZIP 以 HTTP 開啟，通過標題流程 27 項與完整冒險瀏覽器檢查。

# 前一版靜態成品：v1.2

`jiuzhou-v1.2-web.zip`：包含 25 種軍隊動作、地圖／戰鬥兩首新配樂、自動換曲及音量控制。原有繪製風格美術及據點直接招募修正均保留。

解壓後閱讀 START_HERE.md。線上版本：https://chenzzii.github.io/KB/?v=1.2 。舊存檔可匯入。

以下為歷史版本：

# 九州兵譜下載交付

`jiuzhou-v1.1-web.zip`：內容已更新至 v1.1.1，修正據點招募入口與操作回饋。繪製風格美術改版，含全身角色、人物頭像、場景、物品、地形建築及戰鬥呈現。

`jiuzhou-v1-web.zip`：保留的 v1.0 原型美術版本，不會自動更新。

解壓後閱讀 `START_HERE.md`，以 HTTP 靜態服務開啟遊戲。完整原始碼在此分支根目錄，`npm ci`、`npm run dev` 啟動。

兩版地圖均為 32×32，v1.1 不改動遊戲規則，舊冒險存檔可繼續使用。
