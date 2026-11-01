# Claude 開發交接：九州兵譜：烽火歸途 v1.3

交接日期：2026-11-01（Asia/Taipei）。本文件整理此對話實際完成的工作；原始文件內的指令與後續需求應分開判讀。

## 1. 正確接手版本

- 儲存庫：<https://github.com/chenzzii/KB>
- 最新開發分支：`delivery/jiuzhou-v1`。
- v1.3 遊戲提交：`9f5b803c5d546e54908ffbce979a4d1dcb3611b8`（v1.2 為 `d4454a3a706476b129f9dd786b701f5759745a21`）。
- 已推送網站分支：`gh-pages`，對應部署提交 `5771ef6696c58b5713e6140e94ea0fbe85f7166d`（v1.2 部署為 `ac5f992`，舊 hash bundle 仍保留）。
- 線上網址：<https://chenzzii.github.io/KB/?v=1.3>。
- 新版頁尾：`v1.3 / 標題畫面、選角與新手提示`。本次環境可核實遠端 Git 分支，未直接核實公開 Pages 的部署完成狀態。
- 後續新增交接文件的提交不改遊戲內容；以上 hash 指向交接時的遊戲本體。

需要 Git 歷史及後續推送時，優先用 Git clone，而不是將不含 `.git` 的 ZIP 當成原儲存庫：

```sh
git clone --branch delivery/jiuzhou-v1 --single-branch https://github.com/chenzzii/KB.git
cd KB
npm ci
npm run dev
```

原始 README / CODEX_START 是開發包的起始文件，原封保留；目前入口是 `CLAUDE.md`、本文件及 `RUNNING.md`。不要因舊文件寫 MVP 就把現有版本重做。

## 2. 使用者需求與已交付歷程

1. 使用者先提供開發包，要求理解後開發，後來要求先完成遊戲，再全面盤點與原設定／來源遊戲的差異，含地圖與美術。
2. v1.0 完成可通關的原創冒險、演武、研究檢視及差異報告；先前對原型 SVG 美術完成度的說法過高，已在新版說明更正。
3. 使用者曾問原地圖是否應為 64×64。**目前實際仍是一張 32×32 地圖，未完成 64×64 擴圖**。來源研究的四層 64×64 與新作 32×32 規格差異列於 FINAL_COMPARISON；不能說已復刻原版地圖。
4. 使用者下載遇過問題，後續交付改以 GitHub 分支內可下載成品與 GitHub Pages 提供。遊戲已獲授權推送及部署。
5. 使用者指出畫面像草稿：v1.1 補入五張 PNG 圖集，保留其認可的角色美術；包含全身角色、肖像、場景、物品、地形與建築。
6. 使用者到柳灣鄉營找不到招兵方式：v1.1.1 補上據點「招募部曲」、同型隊伍／空欄預選、費用／庫存／統率提示與成功回饋；招募目標和整軍欄位分開。
7. 使用者認可軍隊美術，要求動作及地圖／戰鬥音樂：v1.2 加入 25 兵種分層動作與兩首多聲部合成配樂，已推送。
8. v1.2 交接後，使用者指出缺少進入流程，要求：標題畫面、可跳過的故事敘述、選角畫面（各職業特色）、音樂等設定、遊戲說明；每個第一次碰到的選項跳出說明且之後不再出現；地圖上招兵地點與會發生戰鬥的地點要明顯區分。v1.3 已全部完成，並經使用者同意部署到 gh-pages、合併至 delivery/jiuzhou-v1、補上 `jiuzhou-v1.3-web.zip`。使用者明說「先改完這些之後再說」，**尚未收到 v1.3 的試玩回饋**。
9. 最新指示是把交接包更新到 v1.3。沒有新指定功能，不要把下面的限制或建議自行當成已授權的新功能清單。

## 3. 現有遊戲範圍

- 原創華夏戰略 RPG，非 DOS《King's Bounty／御封戰將》逐項移植。
- 32×32 固定世界、3 城、4 營、17 敵將、古廟、烽臺；探索、碰撞、尋路、橋與船。
- 最多 5 隊、全部 25 兵種、招募／交換／合併／拆分、日週經濟、軍餉、天候、懸賞、神器。
- 四職業、研究／華夏兩模式、14 法術、8 神器、討伐／招安／交易三條互斥路線與三結局。
- 6×5 戰場、近戰／遠射／魔法、AI、自動交戰、撤退、反擊、兵種能力。
- 完整冒險命令存檔、快照與 SHA-256 重算驗證、本機自動存檔；演武另有獨立回放格式。
- 主要介面為繁體中文，支援手機版、方向鍵行路、減少動態效果與可選音效。
- v1.3 進入流程：標題畫面 → 五頁開場故事（可跳過）→ 選擇身分與設定 → 旅程；首次提示 15 種，各只出現一次；地圖綠「募」、紅「戰」、橘「擇」、紫「廟」、灰「✓」標記與圖例。

柳灣鄉營內部座標 `(7,5)`、畫面顯示 `(8,6)`；青禾府內部 `(4,5)`。新旅程先接委託，前往營地按「招募部曲」。不要將 UI 的一基座標與程式零基座標混用。

## 4. 程式地圖與修改界線

| 位置 | 職責 |
|---|---|
| `src/main.ts` | 頂層頁籤、演武、兵譜、研究檢視 |
| `src/adventure.ts`、`adventure.css` | 世界 UI、招募、戰鬥互動、存讀檔、動作與音樂情境接入 |
| `src/campaign/content.ts` | 原創 32×32 地圖、據點、職業、結局 |
| `src/campaign/engine.ts`、`types.ts` | 純世界規則、時間經濟、任務、戰鬥結算 |
| `src/campaign/session.ts` | 完整命令保存、重播、相容性與快照驗證 |
| `src/core/*` | 純戰鬥引擎、能力、法術、AI、RNG、回放 |
| `data/reference/*` | 原始研究基線，保留不改 |
| `data/content/*`、`data/generated/*` | 原始映射與生成研究資料；原包 37 檔仍逐位元相同 |
| `data/balance/chinese_campaign_v1.json` | 新作平衡及來源標記；獨立於原研究檔 |
| `src/content/generated.json` | `npm run generate` 產生，Git 忽略，不是缺檔 |
| `public/assets/painted/*` | 五張完整 PNG 圖集及 SHA-256／格位 manifest |
| `public/assets/original/*` | 舊 86 SVG 原型，保留作比較 |
| `src/art/painted.ts`、`motion.ts`、`motion.css` | 圖格選取、每個 sourceTroopId 動作設定、分層動畫 |
| `src/audio/score.ts`、`synth.ts`、`soundtrack.ts` | 樂譜、多聲部音色、排程、換曲及音量 |
| `scripts/*`、`tests/*` | 資料生成、驗證、模擬、通關與瀏覽器檢查 |

v1.1 至 v1.3 只改呈現與操作，未修改核心數值、地圖、任務或存檔版本。

v1.3 新增模組：`src/intro.ts`／`intro.css`（標題、故事、選角、設定、說明）、`src/tips.ts`（首次提示，`jiuzhou-tips-seen`）、`src/settings.ts`（`jiuzhou-settings`：配樂、音效、動作、提示、略過故事）。地點分類在 `adventure.ts` 的 `placeRole()`／`placeMarker()`。詳見 `docs/TITLE_ONBOARDING_V1_3.md`。

## 5. 美術、動作與音樂實際狀態

- 五張 PNG 由 OpenAI image_gen 製作，全部原始輸出已放在 `public/assets/painted`，合計約 16.8 MB，無來源遊戲圖像。完整尺寸、格位、來源與雜湊在 manifest。
- 單位圖集 5×5，按 sourceTroopId 排列；肖像 5×5，前 4 英雄、其後 17 敵將、最後 4 場景；世界／物品圖集 6×6。
- 動作使用原圖 CSS 剪裁分層與變形，包含身體、腿或翼部；不是另外重繪的逐格動畫，也沒有 PSD／骨架工程檔。全 25 種有待機相位與節奏，移動踏步、飛行、近戰、射擊、施法、受擊等有對應效果。定身、手動關動作、系統減少動態效果均有處理。
- `npm run art:generate` 只會重生原型 SVG，**不會重新生成新版 PNG**。不要用舊 SVG 覆蓋新版美術。
- 地圖曲〈青嵐遠行〉：80 BPM、32 小節、96 秒循環，笛聲、撥弦、和聲、低音、鐘與輕打擊。
- 戰鬥曲〈烽鼓破陣〉：116 BPM、32 小節、約 66.2 秒，銅管式主旋律、弦樂、低音及戰鼓。
- 樂器為 Web Audio 合成音色，非真人錄音。v1.3 起配樂與音效預設開啟（`jiuzhou-settings`），在標題流程的第一次點擊後開始播放（瀏覽器需使用者手勢才能啟動音訊）；遊戲中仍可按「配樂」切換；進出戰鬥自動淡入淡出。音量保存在 `jiuzhou-music-volume`，音效另行開關。
- evidence WAV 是每首前 16 小節含尾音，供接手試聽；執行時使用程式樂譜，不依賴 WAV。

## 6. 存檔與確定性：最容易被後續改版破壞的地方

- 冒險：schema 1、`campaign-1.0.0`。演武：schema 2、`research/abilities-v0.2.0`，v0.1 演武回放會拒絕。
- 冒險 `campaignHash()` 包含基線資料、balance、地圖、據點、職業、敵將、神器；命令從開局重算後，快照與 SHA-256 都要相同。
- 不要為了載入舊存檔繞過驗證。若要改世界／數值／規則，須安排版本與遷移，不能默默讓舊存檔失效。
- localStorage 鍵：`jiuzhou-campaign-1`；使用者瀏覽器實際存檔不在此環境內，交接包只含測試存檔。
- UI 可用時間控制動畫；引擎不可依賴 DOM、系統時間、音樂或 `Math.random()`。
- 體驗調整優先局部修改，不把 UI 問題直接解成更改招募價、統率、兵源或兵種數字。

## 7. 啟動與測試順序

環境：Node.js 24、npm、Python 3。`npm ci` 後執行：

```sh
npm run validate:data
npm test
npm run build
npm run campaign:verify
npm run dev
```

另開終端機跑瀏覽器檢查：

```sh
npm run test:campaign-browser
npm run test:painted
npm run test:recruitment
npm run test:presentation
npm run test:browser
npm run test:title
npm run test:battle-report
```

瀏覽器腳本預設找 `/usr/bin/chromium`；在其他系統以 `CHROMIUM_PATH` 指向實際 Chrome／Chromium 執行檔。僅執行 `npx playwright install chromium` 不會改變腳本預設路徑。`SMOKE_URL` 預設 `http://127.0.0.1:5173/`；正式版本也已用 `/KB/` 子路徑檢查。

`test:campaign-browser` 依賴六份通關 JSON，先執行 `campaign:verify`。painted / presentation 的 pre-script 會建立美術檢查戰鬥；演武 browser 的 pre-script 會產生基準回放。`test:presentation` 會離線渲染聆聽 WAV，需完整瀏覽器音訊 API。

大規模回放檢查可另跑 `npm run simulate:batch -- 10000`，不是每次純文件或 UI 微調都必須跑一萬場。

## 8. 驗證證據與界線

- 最新 v1.3：116 項單元測試、build，以及 test:title（27 項）、campaign-browser、painted、recruitment、presentation、browser 全部瀏覽器檢查通過；建置後的 gh-pages 內容與 v1.3 web ZIP 解壓後亦以 HTTP 通過 test:title 與 campaign-browser。
- v1.3 呈現專項：標題、五頁故事與跳過、四職業詳情、設定、出發套用職業與音效、提示只出現一次（重新整理後不重複）、地圖「募／戰」標記、繼續旅程、手機版無橫向捲動。
- 舊瀏覽器腳本在載入前設定 localStorage `jiuzhou-automation-skip-title=1`，從舊版旅程畫面開始；新流程由 test:title 涵蓋。
- 動作／音樂專項：25 種姿態隨時間變化、步行、近戰刀光、射擊、定身、手動／系統減少動態、舊存檔、手機版通過；真實 AudioContext 切換曲目、單一 context 與音量保存通過。
- 離線音訊前 16 小節：地圖峰值約 .395 / RMS .060，戰鬥峰值約 .493 / RMS .066，未削波。數值驗證不是人工試聽或音樂品質認可。
- v1.1.1 招募專項：四職業 × 兩模式均能走到鄉營招兵，銀兩／庫存／隊伍正確更新；欄位、庫存、統率與無效輸入提示通過。
- 六段通關與完整命令 JSON、摘要、圖集與動作驗證 JSON 隨包附上。
- 一萬場演武報告是之前核心版本的歷史驗證：607,129 道命令、10,000 回放相符，核心在後續呈現改版未變；不宣稱本次匯出又重跑一萬場。
- Windows 11 實機、DOS 原版行為／逐格地圖／逐像素美術／逐音軌比對未完成。不要把可通關或測試通過當成商業級內容、美術、音樂或平衡已全面驗收。
- 資料 validator 的四項預期診斷仍保留：troop7 未指定 sprite 檔名、troop14 的 `spoils_raw='10s0'`、troop17 缺 troll.png，以及法術 6 的 250／2000 價格衝突。另外還有原始職業映射與文字規格的矛盾；詳見研究說明，不可自動清洗。

## 9. 曾踩過的實作問題

- 背景 URL：CSS 自訂屬性中的相對 URL 可能依 stylesheet 路徑解析；目前用 document.baseURI 產生戰場背景明確網址。HTTP 200 也可能是 SPA fallback，圖片測試須 Image.decode。
- 地圖點擊：裁切巢狀 SVG 的完整 image 會擴大 g.getBBox；現用 SVG pattern + 單格 rect，勿用 force click 掩蓋。
- 招募：據點應有直接入口，招募編入欄位與整軍來源／目標欄分開；預覽只是提示，真正命令仍由引擎驗證。
- Playwright 的 `selectOption('4')` 可能同時匹配數值或文字，數字欄位測試改用 `selectOption({value:'4'})` 避免誤選。
- 動作：CSS individual translate/rotate/scale 不一定反映在 computed transform；驗證須讀取個別屬性及分層姿態。動畫不可因每次 render 重置全體節奏，也不能和敵軍鏡像或移動 transform 互相覆蓋。
- 音樂：普通 render 不要重啟排程；只在情境改變時換曲，重用 AudioContext，舊曲淡出後清理排程，背景頁不累積大量過期音符。

## 10. 部署與交付

Vite 使用相對 base，無後端、資料庫或外部遊戲 API。`dist/` 是靜態成品，必須透過 HTTP 開啟，不能把雙擊 HTML 當成正式使用方式。

現有 GitHub Pages 由 `gh-pages` 根目錄提供，已有 `.nojekyll` 與 `deployment.json`。需要後續發布時，用獨立 checkout，先取得最新 gh-pages，再覆蓋已測試 dist，保留 CNAME／使用者檔案；正常提交推送，勿 force push。過去更新保留舊 hash bundle 以免舊分頁立刻缺檔。更新 deployment.json 的來源 commit 與版本；原始碼、下載 ZIP、網站須同版。

此工作環境的 HTTP 白名單允許 github.com git 存取，但 api.github.com 及公開 Pages 網址未在有效清單，因此沒有冒充核實公開 HTTP 部署。這是原環境的限制，不代表接手環境也一樣；請檢查自己的權限及連線，不需要繼承本環境設定或憑證。

交接包不含 node_modules、.git、帳密、瀏覽器個人資料或來源遊戲 EXE。原始使用者上傳的「開發交接 ZIP」另置 original_handoff，這不是 Windows 遊戲安裝 ZIP。所有內容均有 SHA-256 清單，可用根目錄 VERIFY_PACKAGE.py 檢查。

## 11. 尚待使用者決定的方向

目前沒有已指定的新功能。可向使用者回報接手理解與可跑狀態，再由使用者選擇是否擴充地圖、增加手繪動畫／音樂素材、改進平衡、增加內容或修正新發現的問題。這些方向不是本次匯出要求要先實作的工作。

## 12. 本次交接包的乾淨解壓驗證（v1.3 重新執行）

已將完整包解壓到另一個全新目錄，重新 `npm ci` 安裝 59 個鎖定依賴，再依序執行 validate:data、116 項測試與 build，均通過。重建的靜態檔與包內 web-build 逐檔 SHA-256 一致，確認沒有依賴原工作區的 node_modules 或忽略檔。

證據：`artifacts/handoff-extraction-check.json` 與 `artifacts/handoff-clean-validation.txt`。最終包在同一批遊戲原始碼上補入這份證據與交接文件，重新產生所有 SHA-256，未更改遊戲程式。

重新匯出工具為 `scripts/export-claude-handoff.py`，需在 Git checkout 執行，並以 `--original-pack` 指定開發包 ZIP。成品 ZIP 自身不含 .git；要保留歷史與推送能力請使用前述 git clone。

## 13. 獨立美術交接包補充

另提供 `delivery/jiuzhou-art-handoff-v1.2.zip`，包含五張相同原始 PNG、91 圖格／背景索引、86 原型 SVG、分層動作碼及可獨立開啟的預覽。先前完整包的 project/public/assets/painted 已有原圖，輕量包則未附 PNG；此補充包方便直接交給美術接手者，沒有修改遊戲資產。詳見 `ART_HANDOFF_V1_2.md`。

## 14. v1.3.1 至 v1.5 後續修改（交接後持續開發）

- v1.3.1：遠射自動判斷、戰果／撤退／領賞報告（`docs/BATTLE_FEEDBACK_V1_3_1.md`）。
- v1.3.2：未接委託時斷雁寨等選項停用並說明、錯誤浮動提示。
- v1.4：選角大圖、旅程標頭精簡與「⚙ 系統」選單、購買金幣音效與動畫（`docs/UI_POLISH_V1_4.md`）。
- v1.5：**新規則版本 `campaign-2.0.0`**：五陣營各一到五級兵譜（華夏改良）、免接委託、渡厄真言定價、符兵召來改召鄉兵、地面部隊原地行軍待機、三個新兵種的文字佔位圖（`docs/ROSTER_V2_V1_5.md`）。舊存檔仍以 `campaign-1.0.0` 載入，研究基準兵種與雜湊未改。
- 測試：129 項單元測試；`test:title` 28 項、`test:battle-report` 24 項，其餘瀏覽器腳本照舊通過。
