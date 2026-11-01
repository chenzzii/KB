# 九州兵譜 v1.2 · 獨立美術交接包

這份 ZIP 專門交接美術及其動作呈現，不必從完整遊戲包中尋找素材。

**解壓後直接開啟 `preview.html`，即可看見所有新版圖格與兵種動作。** 預覽使用本機檔案，不必安裝 npm。也可在解壓目錄執行 `python -m http.server 8080`，再開啟 `http://localhost:8080/preview.html`。可按「動作 開／關」，亦遵循系統減少動態效果設定。

## 素材位置

- `assets/painted/units-v1.png`：25 種兵種，5×5 圖集。
- `assets/painted/portraits-v1.png`：4 英雄、17 敵將、4 場景，5×5 圖集。
- `assets/painted/world-items-v1.png`：8 地形、6 建築、14 符籙、8 神器，6×6 圖集。
- `assets/painted/props-v1.png`：苔岩、古柱遺跡、竹叢、石獅，2×2 圖集。
- `assets/painted/courtyard-v1.png`：竹林古庭戰場背景。
- `ATLAS_INDEX.json` / `ATLAS_INDEX.csv`：91 項圖格／背景的名稱、ID、格位、CSS 選取方式及兵種動作設定。
- `integration/src/art/`：遊戲現用圖集與分層動作程式。
- `screenshots/`：實際戰場、手機版、行旅與 32×32 世界地圖設計圖。
- `assets/original/`：86 張早期原型 SVG，保留作對照。
- `CLAUDE_ART_BRIEF.md`：給 Claude 的完整美術接手說明。
- `verification/`：實際預覽驗證摘要與 25 兵種預覽截圖。
- `PROVENANCE.json`、各圖集 manifest、`SHA256_MANIFEST.json`：來源、尺寸與 SHA-256。可執行 `python VERIFY_PACKAGE.py` 驗證。

這 5 張 PNG 就是遊戲使用的完整原始圖集，沒有為本次匯出重新生成或改寫。個別人物以圖集格位呈現，不是遺漏了 25 個獨立 PNG。沒有 PSD、手繪逐格序列或額外分層工程檔；v1.2 動作是程式分層變形。

整合回遊戲：將 `assets/painted/` 放入 `public/assets/painted/`，保留檔名與 ID 對應。請先讀 Claude 接手說明，再修改既有程式。

先前完整程式交接 ZIP 已含這些原圖，位置在 `project/public/assets/painted/`；輕量上下文包刻意未包含 PNG。本包可搭配輕量包使用，也可搭配完整包核對。
