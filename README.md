# 九州兵譜（暫名）—— Codex 開發交接包 v1

這是**可投入 Codex 的開發規格與資料包**，不是已完成的遊戲，也不是直接可執行的 TypeScript 專案。

**用途**：以 1990 年《御封戰將》（King's Bounty）的遊戲機制為研究基準，參考使用者提供的 Windows 繁中 openKB 整合包，製作原創中國奇幻戰略 RPG。目標是保留統率、薪資、士氣、兵種特殊能力及自由探索的深度，避免變成只是換圖的簡化版。

## 交給 Codex 的最短路徑

1. 解壓整包到一個**新專案資料夾**（不要混入原始 ZIP 的 EXE、素材、ROM）。
2. 在該專案的 Codex 工作區，請它先閱讀 `AGENTS.md`，再閱讀 `CODEX_START.md`。
3. 把 `CODEX_START.md` 的指示貼給 Codex，要求它依 `docs/05_開發里程碑與驗收.md` **直接完成第一個可玩版本**，而不是只產生計畫。
4. 需要查驗來源時，原始使用者 ZIP `KingsBounty-CHT-full-windows-x64.zip` 應只在本地私有研究區供靜態分析，不應進 Git 版控。
5. 可先執行 `python scripts/validate_pack.py` 檢查 25:25 的兵種繼承一致性（僅依 Python 標準函式庫）。

## 重要檔案

- `CODEX_START.md`：Codex 的可直接執行任務。
- `AGENTS.md`：Codex 必遵守的專案邊界、驗證與回報方式。
- `docs/01_專案願景與遊戲設計.md`：新遊戲應有什麼深度。
- `docs/02_遊戲規則與不確定性.md`：原作 vs openKB vs OpenBounty 的證據層級。
- `docs/03_兵種與內容互換規格.md`：一對一兵種轉換、隊伍換位、法術與神器替代。
- `docs/04_技術架構與資料模型.md`：推薦的 TypeScript + PixiJS、重播與存檔設計。
- `docs/05_開發里程碑與驗收.md`：分階段工作、測試與完成定義。
- `docs/06_授權與風險.md`：原始資產、原始程式碼及授權隔離。
- `data/reference/*`：已擷取的原始研究參數（不可當成已驗證的 DOS 運算）。
- `data/content/*`：原創華夏兵種／法術／神器／職業／懸賞目標的**差異映射**。
- `data/generated/*`：合併後的新兵種清單及 CSV 對照表（請由 generator 產生，不要手改）。
- `data/evidence_registry.json`：規則證據狀態表。
- `scripts/validate_pack.py`：資料檢查。
- `examples/replay_example.json`：建議的可重播戰鬥記錄結構（示意、非原作輸出）。

## 研究來源與結論

- 已擷取：25 兵、14 術、8 神器、17 通緝目標、26 城堡、26 城鎮及 4×64×64 世界資料層。
- 這些資料來自 openKB 繁中整合包的 **free 模組**；不是已完整解析原始 DOS 程式。
- 已辨識 4 項資料異常，詳見 `data/reference/audit_issues.csv`。
- `KB.EXE` 是 DOS MZ 候選程式，但尚未證實與特定 1990 原發行版雜湊完全相同。
- 不包含原遊戲 EXE、ROM、原畫、音效、音樂或地圖 tile 資料。

## 公開參考資料

- https://github.com/wicanr2/open-king-bounty-cht
- https://sourceforge.net/p/openkb/code/ci/master/tree/
- https://github.com/dannyheskett/openbounty
- https://sourceforge.net/p/openkb/wiki/History/
