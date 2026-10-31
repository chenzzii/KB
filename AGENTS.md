# Codex 工作規範（本專案強制）

1. **不要只交規格書，交可跑的程式。** 先完成 6×5 戰鬥沙盒，能選兵種、換位、攻擊、遠射、反擊、結束回合、勝負判定、匯出回放。
2. **數據分層**：`data/reference/*` 是研究基線，禁止改寫；`data/content/*` 是原創名稱/敘事/外觀；`data/generated/*` 是依來源映射的生成物。正式平衡覆寫另置 `data/balance/*`，且初始全部空白。
3. **不得杜撰原版規則。** 規則須註記 `dos-experiment-verified` / `open-source-implementation` / `source-extracted` / `unverified` / `proposed-new-game`，在 UI 的開發模式可顯示。
4. **禁止隱性修復資料異常。** `troop14.spoils_raw = '10s0'` 必須保留並報 warning/error；法術 6 同時有價格 250、2000，未驗證前不可自行指定權威值。與 MVP 無關的欄位可不使用，但要保留診斷。
5. 所有 25 新兵種以 `sourceTroopId` 一對一繼承 HP、技能、移動、近戰/遠程、彈藥、招募價、特殊能力、原 A-E 組別。名字可換，但 ID 與數字不可因重命名漂移。
6. 兵團至多 5 隊；交換隊位、合併同型、拆分部隊要避免數量負數、溢位、消失及覆蓋。**招募與隊伍交換是兩件不同功能**，兩者都要規劃。
7. **確定性**：亂數使用明確 seed，`seed + rulesetVersion + dataHash + commandList` 應能再現同樣的每一步結果。不要用 `Math.random()` 直接決定戰鬥。
8. **純規則引擎**：不依賴 React/Pixi/DOM。UI、音效和劇情不得改寫計算核心。
9. 未經授權不得複製散布原遊戲地圖、圖片、音樂、文字或原始程式碼。不得把原始 Windows ZIP 加進 repo 或 bundle。UI 只用原創繪圖或程式生成的替代圖形。
10. 不把 `data/reference/openbounty_research_parameters.json` 的統率、薪水、傷害公式自動標成 DOS 已驗證，先依 open-source implementation 規格實作研究模式。
11. 操作 Windows 11 桌面與 Chrome 為主要場景，使用 `npm run dev` 本機測試；`npm run build` 後可部署至 GitHub Pages，留意 Vite `base` 設定與路由。
12. 每階段回覆：已完成功能、檔案位置、執行與測試方式、測試結果、已知問題及尚待來源驗證項目。**不可聲稱完成而實際沒有產物。**
