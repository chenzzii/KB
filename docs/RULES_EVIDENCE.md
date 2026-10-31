# v0.2 規則來源與適配決策

本版所有效果都是研究沙盒規則，不是 DOS 原版驗證結果。原始 `data/reference`、`data/content`、`data/generated` 與 `data/evidence_registry.json` 保持不變；新的規則對照記在此處。

## 本次實際核對的公開來源

- OpenBounty：<https://github.com/dannyheskett/openbounty>
- 固定 commit：`aace551ca625e0c723adff0cb13b22ca2f806dee`
- [engine/combat.c](https://github.com/dannyheskett/openbounty/blob/aace551ca625e0c723adff0cb13b22ca2f806dee/engine/combat.c)：傷害約 490–605 行、飛行約 717–731 行、回合重置約 760–796 行、施法約 960–1150 行。
- [docs/OPENKB-SPEC.md](https://github.com/dannyheskett/openbounty/blob/aace551ca625e0c723adff0cb13b22ca2f806dee/docs/OPENKB-SPEC.md)：能力表及 §17 戰鬥；屬上游作者的規格敘述，不獨立提升為 DOS 證據。
- 上游為 MIT，但本作只閱讀行為與自行撰寫規則；未複製引擎碼、美術或原遊戲資料至本專案。

## 八種能力

| key | 本版效果 | 來源層級與適配 |
|---|---|---|
| fly | 每次己方行動重置兩次全場飛行，跨兵團、落空格；第二飛或攻擊後結束 | `open-source-implementation`：兩次飛行參考上游；步行仍為本版正交規則 |
| undead | 渡厄真言只選不死敵軍；不自動減免普通傷害 | `open-source-implementation`：上游目標過濾；士氣與週次不在此範圍 |
| absorb | 近戰與反擊依實際死亡數增加滿血兵，保留殘傷 | `open-source-implementation`：擊殺增兵；本版加上 1,000,000 人安全上限，並將新增兵加入戰中回復上限 |
| regen | 己方行動開始時回復存活兵員殘傷，不復活 | `proposed-new-game`：上游有清除 injury；本版選擇在各自開始行動時觸發 |
| magic | 祝由巫醫基值 10、3 發；御風方士基值 25、2 發；經當前兵數與技能公式 | `proposed-new-game`：基值／次數參考上游兵種，但本包來源 ammo=0、range=null，不可改動，因此新增獨立 magicCharges，而不是改寫來源數值 |
| leech | 近戰及反擊按實際扣血回復 HP，含復活，限制於本隊戰中生命上限 | `proposed-new-game`：上游按 damage / attackerHP 整兵取整；本版採連續 HP 回復，且使用實際扣血避免過量擊殺吸血 |
| scythe | 先骰 1–100，90–100 時加上 ceil(目標兵數/2) × 目標單兵 HP 的傷害 | `open-source-implementation`：程式 `>89` 是 11/100；部分註解及規格稱 10%，此處以實際條件為準。反擊也會觸發 |
| immune | 免疫兵種魔法與英雄傷害／定身法術 | `open-source-implementation`：兵種魔法被免疫仍耗一次技能與單位行動；英雄法術無效不耗符籙或施法機會 |

普通攻擊仍使用 v0.1 當前存活兵數、技能公式及下限 1，與上游的回合初始兵數快照及零傷害情境不同。所有傷害最後截斷至目標現有 HP；汲取／吸血在反擊前結算。

## 七種戰鬥法術

全屬研究適配（`proposed-new-game`），不是照抄完整上游引擎。每方每次行動限一術，各預配兩張，法力固定 1。施法不消耗兵團行動，也不觸發反擊。合法但被免疫的英雄法術只記錄無效事件，不扣資源。

| sourceSpellId | 本版名稱 | 效果與適配 |
|---:|---|---|
| 0 | 影分身符 | 增加 10 名滿血兵，保留殘傷與狀態，擴充回復上限，不補彈或還原行動；此為沙盒指定數量 |
| 1 | 縮地符 | 選友軍、再選空格，原行動／步數／定身保留；不可落在自己原格、其他兵團或場外 |
| 2 | 火龍符 | 單一敵軍固定 25 HP；數值參考來源 effect_value |
| 3 | 天雷訣 | 單一敵軍固定 10 HP；數值參考來源 effect_value |
| 4 | 定身咒 | 敵軍不能移動、攻擊、反擊，直到該方下次行動結束；不是永久冰凍 |
| 5 | 還魂籙 | 回復 100 HP、限制於戰中生命上限；全滅隊伍原格空置才可復活，復活後須等下一次己方行動才能動作。100 HP 為本版提案，不將來源 effect_value=1 視為 100 |
| 6 | 渡厄真言 | 不死敵軍固定 50 HP；價格仍保留 250／2000 的衝突，不使用於法術購買 |

7–13 號法術是架橋術、止息法、追跡羅盤、歸城令、歸鄉訣、符兵召來、帥印加持；介面逐項標示「未實作 · 冒險階段」，核心拒絕其 cast 命令。

## 狀態、回放與模式邊界

- 增加 `maxCount`（戰中回復上限）、`magicCharges`、`flights`、`status.frozen`、每方符籙／施法機會與 `scenarioId`；這些是執行時狀態，不覆寫來源兵表。
- 新增「異能試煉場」五對五預設編組，包含全部八種能力；高階部隊是免費演武預設，並非世界招募／經濟平衡。
- 規則版本 `research/abilities-v0.2.0`、回放 schema 2。v0.1 回放會清楚拒絕，沒有無聲遷移或假裝重現舊規則。
- 記錄全部施法、免疫、飛行、再生、斬魂、汲取、吸血及復活事件；同版本、資料與種子的命令可重播。
- 士氣、英雄職業效果、神器、週薪、失控、世界地圖及劇情仍未啟用。研究基準數值不變，沒有正式平衡覆寫。
