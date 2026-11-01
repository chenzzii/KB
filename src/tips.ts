import {settings,saveSettings,automationSkipsTitle} from './settings';
/** First-encounter explanations. Each one is shown once per browser, then remembered. */
export const tipText={
 map:{title:'山河圖',body:['點擊地圖上任一格，部隊會自動尋路走過去；也可以點地圖後用方向鍵一步一步走。','每天可走 40 步，竹林、澤地或雨天走一格算 2 步。日程上限 180 日，超過旅程即失敗。','<b class="tip-recruit">綠框「募」</b>是可以招兵的城鎮與營地；<b class="tip-battle">紅框「戰」</b>是敵將據點，進入後可選擇交戰。灰色打勾表示已擊敗。']},
 home:{title:'青禾府：旅程起點',body:['先按「接受山河三印委託」，旅程目標才會開始。','城鎮可以招募部曲、領取討伐賞金、在客棧休整補員，也能在「符籙」頁購買法術。']},
 city:{title:'城鎮',body:['擊敗敵將後會得到討伐憑證，回到任何城鎮按「領取討伐賞金」才會拿到銀兩。','城鎮也能招兵與休整。走討伐路線時，可以花錢占領其他城關。']},
 camp:{title:'營地：招募部曲',body:['按「招募部曲」打開招兵面板：選兵種、要編入的欄位與人數。','每個營地只有特定兵種，庫存每週補充。人數受銀兩、庫存和統率限制：一隊的「人數 × 單兵生命」不能超過你的統率。','招來的部曲每週要付軍餉，招太多會入不敷出。']},
 bandit:{title:'斷雁寨：三選一',body:['寨主扣住第一枚山河印，你必須選擇：<b>討伐</b>（開戰奪印）、<b>招安</b>（付 500 兩結盟）或<b>交易</b>（付 1,000 兩贖印）。','這個選擇不可逆，而且會決定最後的結局。']},
 foe:{title:'敵將據點',body:['這裡是會發生戰鬥的地方。按「與守軍交戰」才會開戰，路過不會被強迫作戰。','先到「整軍」頁確認兵力。擊敗敵將後取得討伐憑證，記得回城鎮領賞；擊敗任一野外敵將也能取得山印。']},
 shrine:{title:'聽雨古廟',body:['花一天守夜，就能取得第二枚山河印，並修復與妖靈的關係。']},
 beacon:{title:'天衡烽臺：最終之地',body:['三印齊備後才能在此完成旅程。守印的龍主非常強大，出發前請把部曲補滿。']},
 artifact:{title:'神器',body:['某些地點藏有神器，按「取」即可收入行囊。神器效果會永久生效，可在「任務與行囊」頁查看。']},
 battle:{title:'戰鬥操作',body:['點自己的兵團選取，綠色格是可移動範圍：點空格移動，點敵軍攻擊。兵團攻擊後就結束本回合行動。','「兵團動作」可切換近戰、實體遠射或兵種魔法；遠射有彈藥限制。','「英雄符籙」每回合可施放一道，不消耗兵團行動。全部行動完按「結束行動」換敵軍。','打不過可以「撤退至青禾府」；「自動交戰」會讓電腦替你操作。']},
 army:{title:'整軍',body:['最多 5 隊部曲。可換位、合併同兵種隊伍或拆分隊伍；合併與拆分只能在滿血時進行。','每隊下方顯示統率需求（人數 × 單兵生命），不能超過你的統率。','混編不同陣營（官軍、江湖、鄉里、妖靈、幽冥）可能影響士氣。']},
 recruit:{title:'招募面板',body:['先選兵種，再選要編入的欄位：只能編入同兵種隊伍或空欄。','系統會顯示這一欄最多還能招幾人；不足時會說明原因（銀兩、庫存或統率）。']},
 spells:{title:'符籙',body:['法術分為戰鬥用與行旅用。在城鎮可以購買法術張數，戰鬥中每回合可施放一道。','職業的法力會影響法術威力；擊敗越多敵將，法力會逐步提升。']},
 journal:{title:'任務與行囊',body:['這裡列出委託進度、三枚山河印、已擊敗與尚未領賞的敵將，以及取得的神器。']},
 ending:{title:'旅程終章',body:['旅程已結束。可以匯出存檔保存紀錄，或回到標題畫面開始新旅程，試試其他職業與路線。']}
} as const;
export type TipKey=keyof typeof tipText;
const storeKey='jiuzhou-tips-seen';
let seen:Set<string>;
try{seen=new Set(JSON.parse(localStorage.getItem(storeKey)??'[]'));}catch{seen=new Set();}
const queue:TipKey[]=[];let open=false;
function persist(){try{localStorage.setItem(storeKey,JSON.stringify([...seen]));}catch{/* Optional browser storage. */}}
export function resetTips(){seen.clear();persist();}
export function tipsSeenCount(){return seen.size;}
export function tip(keyName:TipKey){
 if(!settings.tips||automationSkipsTitle()||seen.has(keyName)||queue.includes(keyName))return;
 queue.push(keyName);if(!open)showNext();
}
function showNext(){
 const next=queue.shift();if(!next){open=false;return;}
 open=true;seen.add(next);persist();
 const t=tipText[next],layer=document.createElement('div');
 layer.className='tip-layer';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','tip-title');layer.dataset.tip=next;
 layer.innerHTML=`<div class="tip-card"><p class="eyebrow">初次提示 · FIRST TIME</p><h3 id="tip-title">${t.title}</h3>${t.body.map(p=>`<p>${p}</p>`).join('')}<label class="tip-off"><input type="checkbox" id="tip-disable"> 之後不再顯示任何提示</label><button class="primary" id="tip-ok">知道了</button></div>`;
 document.body.append(layer);
 const ok=layer.querySelector<HTMLButtonElement>('#tip-ok')!;ok.focus();
 const close=()=>{if((layer.querySelector('#tip-disable') as HTMLInputElement).checked){saveSettings({tips:false});queue.length=0;}layer.remove();showNext();};
 ok.onclick=close;layer.addEventListener('keydown',ev=>{if(ev.key==='Escape'||ev.key==='Enter'){ev.preventDefault();close();}});
}
