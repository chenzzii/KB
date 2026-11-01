import './style.css';
import {unitFigure} from './art/painted';
import {gallery} from './art/gallery';
import {showAdventure,pauseAdventure,openTitle} from './adventure';
import {settings,automationSkipsTitle} from './settings';
import {units,unit,warnings,catalogs,dataHash} from './content/load';
import {alive,control,reachable,rulesetVersion} from './core/engine';
import {abilityRules,abilityLabel,hasAbility,magicProfile} from './core/abilities';
import {spellRules,spellName,spellLabel} from './core/spells';
import {Session} from './core/replay';
import {nextAICommand} from './core/ai';
import type {Command,Stack,ScenarioId} from './core/types';
const app=document.querySelector<HTMLDivElement>('#app')!;
const esc=(x:unknown)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
let session=new Session();let selected='p0';let sourceNames=false;let tab='journey';let shot=false;
let chosenSpell=2,casting=false;let teleportTarget:string|null=null;
let timer:ReturnType<typeof setTimeout>|undefined;let automatic=false;let aiSteps=0;
let a=0,b=3,recruitUnit=units[2].id,recruitCount=5,splitCount=5;
const name=(s:Stack)=>sourceNames?unit(s.unitId).sourceName:unit(s.unitId).name;
app.innerHTML=`<header><div class="brand"><span class="seal">九州</span><div><p class="eyebrow">JIUZHOU · TACTICAL STUDIES</p><h1>九州兵譜 <small>烽火歸途</small></h1></div></div><div class="tools"><label>演武局（重設套用）<select id="scenario"><option value="skirmish">平地遭遇戰</option><option value="abilities">異能試煉場</option></select></label><label>亂數種子 <input id="seed" value="demo-2026" maxlength="200"></label><button id="reset">重設演武</button></div></header><div class="notice">原創華夏戰略 RPG　<span>數值來源不等於 DOS 規則已驗證；本版採明示的沙盒暫行規則。</span></div><nav aria-label="主要頁籤"><button data-tab="journey">00　烽火歸途</button><button data-tab="battle" class="active">01　演武場</button><button data-tab="roster">02　兵種圖鑑</button><button data-tab="research">03　研究與警告</button><button data-tab="artworks">04　青嵐繪卷</button><label class="name-switch"><input id="names" type="checkbox"> 顯示來源研究名稱</label></nav><div id="message" role="status" aria-live="polite"></div><main id="main"></main><footer>獨立規則引擎 · 固定種子 · 本機重播　<span>v1.3.2 / 斷雁寨委託提示與錯誤提醒</span></footer>`;
const main=document.querySelector<HTMLDivElement>('#main')!;
let toastTimer:ReturnType<typeof setTimeout>|undefined;
function message(text:string,error=false){const el=document.querySelector('#message')!;el.textContent=text;el.className=text?(error?'error':'success'):'';
 // The status line sits at the top of the page; errors also float at the bottom so they are seen while scrolled down.
 let toast=document.querySelector<HTMLElement>('#toast');
 if(!toast){toast=document.createElement('div');toast.id='toast';toast.setAttribute('role','alert');document.body.append(toast);}
 if(toastTimer)clearTimeout(toastTimer);
 if(text&&error){toast.textContent=text;toast.className='show';toastTimer=setTimeout(()=>{toast!.className='';},5000);}else toast.className='';
}
function stop(){if(timer)clearTimeout(timer);timer=undefined;automatic=false;aiSteps=0;}
function dispatch(c:Command){try{session.dispatch(c);message('');render();return true;}catch(e){message((e as Error).message,true);return false;}}
function pump(){
 if(timer)clearTimeout(timer);
 if(session.state.phase!=='battle'||(!automatic&&session.state.turn!=='enemy'))return;
 timer=setTimeout(()=>{
  if(++aiSteps>5000){stop();message('自動模擬超過 5000 步，已停止',true);render();return;}
  if(!dispatch(nextAICommand(session.state))){stop();render();return;}
  pump();
 },automatic?60:220);
}
function abilityText(key:string){const rule=abilityRules[key as keyof typeof abilityRules];return `<span title="${esc(rule?.description??'待實作')}">${esc(abilityLabel(key))}</span>`;}
function spellPanel(){const s=session.state;return `<section class="panel spell-panel"><div class="panel-title"><h3>英雄符籙</h3><span>每方每次行動限一道 · ${s.spellUsed.player?'本次已施法':'本次尚可施法'}</span></div><div class="spell-controls"><label>法術<select id="spell-select">${spellRules.map((r,i)=>`<option value="${i}" ${chosenSpell===i?'selected':''}>${spellName(i)} · 餘 ${s.spellbook.player[i]} 張</option>`).join('')}</select></label><button id="cast-mode" ${s.phase!=='battle'||s.turn!=='player'||automatic||s.spellUsed.player||s.spellbook.player[chosenSpell]<=0?'disabled':''}>${casting?'取消施法':'準備施法'}</button></div><p class="hint">${esc(spellRules[chosenSpell].description)}${casting?`　${teleportTarget?'已選友軍，請點棋盤空格。':spellRules[chosenSpell].target==='ally'?'請點友軍棋子或左側部曲卡。':'請點敵軍棋子。'}`:''}</p><small>演武預配每術 2 張、法力 1；研究適配，非 DOS 已驗證。法術不耗兵團行動。</small></section>`;}
function stackCard(s:Stack|null,i:number){
 if(!s)return `<div class="army-card empty"><span class="slot">0${i+1}</span><span>空缺部曲</span></div>`;
 const u=unit(s.unitId),c=control(s,session.state.leadership);
 return `<button class="army-card ${selected===s.id?'selected':''}" data-select="${s.id}"><span class="slot">0${i+1}</span><div><strong>${esc(name(s))}</strong><small>${s.count} 人 · ${s.hp} HP · 彈 ${s.ammo}${s.magicCharges?` · 術 ${s.magicCharges}`:''}${s.status.frozen?' · 定身':''}</small><small class="${c.over?'warn':''}">統率 ${c.required}/${session.state.leadership}${c.over?' · 超額，行為待驗證':''}</small></div><span class="badge">${esc(u.group)}</span></button>`;
}
function render(){
 const journey=tab==='journey';(document.querySelector('.tools') as HTMLElement).hidden=journey;(document.getElementById('names')!.parentElement as HTMLElement).hidden=journey;
 document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.getAttribute('data-tab')===tab));
 if(journey){stop();showAdventure(main,message);return;}pauseAdventure();
 if(tab==='artworks'){main.innerHTML=gallery();return;}
 const state=session.state;const selectedStack=[...state.armies.player,...state.armies.enemy].find(s=>s?.id===selected&&s.hp>0);
 document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.getAttribute('data-tab')===tab));
 if(tab==='roster'){
  main.innerHTML=`<section class="section-heading"><p class="eyebrow">THE FIELD MANUAL</p><h2>二十五部曲，各有其長</h2><p>名稱切換只改顯示。基準數值與 sourceTroopId 維持一對一；八種特殊能力已接入演武規則；滑鼠停在標籤可查看效果與證據。</p></section><div class="roster-grid">${units.map(u=>`<article class="roster-card"><div class="card-top"><span class="badge">${esc(u.group)}</span><span>#${String(u.sourceTroopId).padStart(2,'0')} · ${esc(u.faction)}</span></div>${unitFigure(u.sourceTroopId,u.name,'roster-art')}<h3>${esc(sourceNames?u.sourceName:u.name)}</h3><p>${esc(u.role)}</p><dl><div><dt>生命</dt><dd>${u.hp}</dd></div><div><dt>技等</dt><dd>${u.skill}</dd></div><div><dt>步數</dt><dd>${u.moves}</dd></div><div><dt>近戰</dt><dd>${u.melee_min}–${u.melee_max}</dd></div><div><dt>遠射</dt><dd>${u.ammo?`${u.ranged_min}–${u.ranged_max} ×${u.ammo}`:'—'}</dd></div><div><dt>招募價</dt><dd>${u.gold}</dd></div></dl><div class="ability-label">${u.abilities.length?u.abilities.map(abilityText).join(' · '):'無特殊能力'}</div></article>`).join('')}</div>`;return;
 }
 if(tab==='research'){
  main.innerHTML=`<section class="section-heading"><p class="eyebrow">PROVENANCE & LIMITATIONS</p><h2>有據可循，存疑有記</h2><p>本版沒有宣稱任何規則已經 DOS 實測驗證。研究資料保持原樣；冒險職業使用獨立綁定處理原包對照衝突。</p></section><div class="research-grid"><section class="panel"><h3>規則證據與暫行決策</h3><ul class="rule-list"><li><b>source-extracted</b>25 兵種 HP、技能、移動、攻擊、彈藥、價格、能力與 A–E 組別。</li><li><b>open-source-implementation</b>已核對 OpenBounty aace551 的 engine/combat.c。近戰保留本作下限 1 與當前兵數適配；沒有 DOS 實測。</li><li><b>proposed-new-game</b>6 欄×5 列、步行正交 BFS，飛行可跨兵團落空格，每隊每輪一次攻擊、可移動後攻擊、攻擊後不能移動。</li><li><b>proposed-new-game</b>遠射全場有效；相鄰敵軍牽制時禁止遠射；沿用暫行傷害公式、下限 1。</li><li><b>proposed-new-game</b>存活防守隊每輪至多反擊一次，遠射不觸發反擊；重新輪到我方時重置。</li><li><b>unverified</b>演武保留 v0.2 規則。冒險已啟用士氣、神器與十四術；過統率失控細節仍未核實。研究／華夏模式可在開新旅程時切換。</li></ul></section><section class="panel"><h3>保留的資料警告</h3>${warnings.map(w=>`<p class="warning-block">${esc(w.replace('職業機制尚未啟用','冒險使用獨立職業綁定，原檔未改'))}</p>`).join('')}<h3>內容索引（逐項狀態見下方）</h3>${Object.entries(catalogs).map(([key,list])=>`<p><strong>${({spell:'法術',artifact:'神器',hero:'職業',villain:'敵將'} as Record<string,string>)[key]} ${list.length}</strong>　${list.map((x,i)=>`${esc(x.name)}${key==='spell'?`（${i<7?'演武／冒險已實作':'冒險已實作'}）`:key==='hero'||key==='artifact'?'（冒險已啟用）':'（冒險懸賞已啟用）'}`).join('、')}</p>`).join('')}</section></div><section class="panel technical"><h3>八種能力</h3>${Object.entries(abilityRules).map(([key,r])=>`<p><b>${esc(r.name)} · ${r.evidence}</b>　${esc(r.description)}</p>`).join('')}<h3>七種戰鬥法術</h3>${spellRules.map((r,i)=>`<p>${spellName(i)}：${esc(r.description)}</p>`).join('')}<p>規則版本：${rulesetVersion} · 回放 schema 2（舊版 0.1 回放不相容）</p><p>資料 SHA-256：${dataHash}</p><p>編組為演武營：兵源不限、招募耗銀，未包含世界招募點與週薪。換位保留全部狀態；合併／拆分限戰前滿血無狀態部隊，彈藥不補充。</p></section>`;return;
 }
 const friendly=selectedStack&&state.armies.player.some(s=>s?.id===selectedStack.id);
 const cells=friendly&&state.turn==='player'&&state.phase==='battle'?reachable(state,selectedStack!):[];
 const activeCount=alive(state,'player').filter(s=>!s.acted&&!s.status.frozen).length;
 main.innerHTML=`<div class="battle-heading"><div><p class="eyebrow">THE PROVING GROUND</p><h2>${state.phase==='setup'?'整軍待發':state.phase==='finished'?(state.winner==='player'?'此役告捷':'此役失利'):`第 ${String(state.round).padStart(2,'0')} 回合`}</h2><p>${state.phase==='setup'?'調整五隊部曲，準備一場可完整重播的演武。':state.phase==='finished'?'可匯出此役重播，或重設演武再次出陣。':state.turn==='player'?`我方行動 · ${activeCount} 隊尚可攻擊`:'敵方正在行動…'}</p></div><div class="battle-actions">${state.phase==='setup'?'<button class="primary" id="start">鳴鼓出陣 →</button>':''}${state.phase==='battle'?`<button id="autoplay">${automatic?'暫停模擬':'自動模擬雙方'}</button><button class="primary" id="end" ${state.turn!=='player'||automatic?'disabled':''}>結束我方行動 →</button>`:''}</div></div><div class="battle-layout"><aside class="panel army-panel"><div class="panel-title"><h3>我方部曲</h3><span>五隊上限</span></div><div class="economy"><span>統率 <b>${state.leadership}</b></span><span>銀兩 <b>${state.gold.toLocaleString()}</b></span></div>${state.armies.player.map(stackCard).join('')}${state.phase==='setup'?`<div class="formation-controls"><h4>戰前整軍</h4><div class="form-row"><label>來源欄<select id="slot-a">${Array.from({length:5},(_,i)=>`<option value="${i}" ${a===i?'selected':''}>第 ${i+1} 欄</option>`).join('')}</select></label><label>目標欄<select id="slot-b">${Array.from({length:5},(_,i)=>`<option value="${i}" ${b===i?'selected':''}>第 ${i+1} 欄</option>`).join('')}</select></label></div><div class="form-row"><button id="swap">交換隊位</button><button id="merge">合併同型</button></div><div class="form-row"><input aria-label="拆出兵數" id="split-count" type="number" min="1" max="1000000" value="${splitCount}"><button id="split">拆出至目標欄</button></div><h4>演武營招募</h4><label>兵種<select id="recruit-unit">${units.map(u=>`<option value="${u.id}" ${recruitUnit===u.id?'selected':''}>${esc(sourceNames?u.sourceName:u.name)} · ${u.gold} 兩</option>`).join('')}</select></label><div class="form-row"><input aria-label="招募兵數" id="recruit-count" type="number" min="1" max="1000000" value="${recruitCount}"><button id="recruit">招募至目標欄</button></div><small>演武營不限兵源；招募扣銀。合併／拆分限滿血。</small></div>`:'<p class="hint">戰鬥開始後鎖定編組。統率逐隊核算，超額暫不套用未核實懲罰。</p>'}</aside><section class="field-column"><div class="field-frame"><div class="field-top"><span>演武場 · 平地</span><span>我方 ◈　／　敵方 ◆</span></div><div class="column-labels">${[1,2,3,4,5,6].map(i=>`<span>${i}</span>`).join('')}</div><div class="board" role="group" aria-label="6 欄 5 列戰棋棋盤">${Array.from({length:30},(_,i)=>{
 const x=i%6,y=Math.floor(i/6);const s=[...alive(state,'player'),...alive(state,'enemy')].find(s=>s.cell?.x===x&&s.cell.y===y);
 const enemy=s&&state.armies.enemy.some(e=>e?.id===s.id);const canMove=cells.some(c=>c.x===x&&c.y===y);
 return `<button class="cell ${s?(enemy?'enemy':'friendly'):''} ${s?.id===selected?'chosen':''} ${canMove?'reachable':''}" data-cell="${x},${y}" aria-label="${x+1},${y+1}${s?` ${esc(name(s))} ${s.count} 人`:canMove?' 可移動':' 空地'}"><span class="coordinate">${y+1}·${x+1}</span>${s?`<span class="unit-symbol">${unitFigure(unit(s.unitId).sourceTroopId,name(s))}</span><strong>${esc(name(s))}</strong><span class="unit-count">${s.count}<small>人</small></span><div class="hp-track"><span style="width:${Math.max(0,s.hp/(s.count*unit(s.unitId).hp)*100)}%"></span></div><small>${s.hp} HP${s.status.frozen?' · 定身':s.acted?' · 已行動':''}</small>`:canMove?'<span class="move-dot">·</span>':''}</button>`;
 }).join('')}</div><div class="field-bottom"><span>正交相鄰近戰 · 藍綠格可移動</span><span>6 × 5</span></div></div><div class="panel unit-detail">${selectedStack?`<div><p class="eyebrow">SELECTED COMPANY</p><h3>${esc(name(selectedStack))} <small>${selectedStack.count} 人</small></h3><p>HP ${selectedStack.hp}　近戰 ${unit(selectedStack.unitId).melee_min}–${unit(selectedStack.unitId).melee_max}　移動 ${selectedStack.moved}/${unit(selectedStack.unitId).moves}　彈藥 ${selectedStack.ammo}　術 ${selectedStack.magicCharges}${hasAbility(selectedStack,'fly')?`　飛行 ${selectedStack.flights}/2`: ''}${selectedStack.status.frozen?'　定身中':''}</p><p class="warn">${unit(selectedStack.unitId).abilities.length?unit(selectedStack.unitId).abilities.map(abilityText).join(' · '):'無特殊能力'}</p></div><button id="mode" ${!friendly||(!unit(selectedStack.unitId).ammo&&!magicProfile(selectedStack))?'disabled':''}>${shot?(magicProfile(selectedStack)?'魔法攻擊 ✓':'遠射模式 ✓'):'近戰模式'} ↔</button>`:'<p>點選我方部曲，再點藍綠空格移動或敵軍攻擊。可用 Tab／Enter 操作。</p>'}</div>${spellPanel()}<div class="panel replay-controls"><div><h3>戰局留痕</h3><small>種子 ${esc(state.seed)} · ${session.commands.length} 道指令</small></div><button id="export">匯出回放 JSON</button><label class="file-button">匯入驗證回放<input id="import" type="file" accept="application/json,.json"></label></div><p class="hint">點選我方 → 空格移動 → 敵軍近戰；射手切換遠射模式後點選敵軍。每隊攻擊一次後結束行動；按「結束我方行動」交由敵方 AI。</p></section><aside class="panel event-panel"><div class="panel-title"><h3>軍情簿</h3><span>${session.events.length} 筆</span></div><p class="evidence-tag">研究模式 · 規則待核對</p><ol class="event-list">${session.events.slice(-80).reverse().map(e=>`<li class="event-${esc(e.type)}"><span>${esc(e.type)}</span>${esc(e.text)}</li>`).join('')||'<li class="empty-log">鼓聲未響，靜待出陣。</li>'}</ol></aside></div>`;
 bindBattle();
}
function bindBattle(){
 const on=(id:string,fn:()=>void)=>document.getElementById(id)?.addEventListener('click',fn);
 document.getElementById('spell-select')?.addEventListener('change',e=>{chosenSpell=Number((e.target as HTMLSelectElement).value);casting=false;teleportTarget=null;render();});
 on('cast-mode',()=>{casting=!casting;teleportTarget=null;render();});
 on('start',()=>{stop();dispatch({type:'start'});});
 on('end',()=>{casting=false;teleportTarget=null;if(dispatch({type:'end-turn'}))pump();});
 on('autoplay',()=>{if(automatic){stop();render();if(session.state.turn==='enemy')pump();}else{casting=false;teleportTarget=null;automatic=true;aiSteps=0;render();pump();}});
 on('mode',()=>{shot=!shot;render();});
 on('swap',()=>dispatch({type:'swap',a,b}));on('merge',()=>dispatch({type:'merge',a,b}));
 on('split',()=>dispatch({type:'split',slot:a,target:b,count:splitCount}));
 on('recruit',()=>dispatch({type:'recruit',slot:b,unitId:recruitUnit,count:recruitCount}));
 for(const [id,setter] of Object.entries({'slot-a':(v:string)=>a=Number(v),'slot-b':(v:string)=>b=Number(v),'split-count':(v:string)=>splitCount=Number(v),'recruit-count':(v:string)=>recruitCount=Number(v),'recruit-unit':(v:string)=>recruitUnit=v}))document.getElementById(id)?.addEventListener('change',e=>setter((e.target as HTMLInputElement).value));
 document.querySelectorAll<HTMLElement>('[data-select]').forEach(el=>el.addEventListener('click',()=>{if(casting){pickSpellTarget(el.dataset.select!);return;}selected=el.dataset.select!;render();}));
 document.querySelectorAll<HTMLElement>('[data-cell]').forEach(el=>el.addEventListener('click',()=>{
  if(session.state.phase!=='battle'||session.state.turn!=='player'||automatic)return;
  const [x,y]=el.dataset.cell!.split(',').map(Number);
  if(casting){const target=[...session.state.armies.player,...session.state.armies.enemy].find(s=>s?.cell?.x===x&&s.cell.y===y&&s.hp>0);if(target)pickSpellTarget(target.id);else if(chosenSpell===1&&teleportTarget)finishSpell(teleportTarget,{x,y});else message('請選擇合法的法術目標',true);return;}
  const friend=alive(session.state,'player').find(s=>s.cell?.x===x&&s.cell.y===y);
  if(friend){selected=friend.id;shot=false;render();return;}
  if(!selectedStackExists())return;
  const enemy=alive(session.state,'enemy').find(s=>s.cell?.x===x&&s.cell.y===y);
  if(enemy)dispatch({type:shot?(magicProfile(alive(session.state,'player').find(s=>s.id===selected)!)?'magic-attack':'ranged-attack'):'attack',actorId:selected,targetId:enemy.id});
  else dispatch({type:'move',actorId:selected,cell:{x,y}});
 }));
 on('export',()=>{void (async()=>{try{const replay=await session.export();const url=URL.createObjectURL(new Blob([JSON.stringify(replay,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='jiuzhou-replay.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('回放已匯出，包含初始狀態、指令、事件與 SHA-256。');}catch(e){message((e as Error).message,true);}})();});
 document.getElementById('import')?.addEventListener('change',e=>{void (async()=>{
  const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
  stop();try{if(file.size>10_000_000)throw Error('回放檔案不可超過 10 MB');const restored=await Session.import(JSON.parse(await file.text()));session=restored;casting=false;teleportTarget=null;(document.getElementById('seed') as HTMLInputElement).value=session.state.seed;(document.getElementById('scenario') as HTMLSelectElement).value=session.state.scenarioId;selected=alive(session.state,'player')[0]?.id??'';shot=false;render();message('重播驗證通過：全部事件與最終狀態 SHA-256 相符。');}catch(err){render();message((err as Error).message,true);}
 })();});
}
function finishSpell(targetId:string,cell?:{x:number;y:number}){if(dispatch({type:'cast',spellId:chosenSpell,targetId,...(cell?{cell}:{})})){casting=false;teleportTarget=null;render();}}
function pickSpellTarget(id:string){if(session.state.phase!=='battle'||session.state.turn!=='player'||automatic)return;if(chosenSpell===1){if(!alive(session.state,'player').some(s=>s.id===id)){message('傳送須先選擇存活友軍',true);return;}teleportTarget=id;render();}else finishSpell(id);}
function selectedStackExists(){if(!alive(session.state,'player').some(s=>s.id===selected)){message('請先選擇我方部曲',true);return false;}return true;}
document.getElementById('names')!.addEventListener('change',e=>{sourceNames=(e.target as HTMLInputElement).checked;render();});
document.querySelectorAll<HTMLElement>('[data-tab]').forEach(el=>el.addEventListener('click',()=>{tab=el.dataset.tab!;render();}));
document.getElementById('reset')!.addEventListener('click',()=>{try{const fresh=new Session((document.getElementById('seed') as HTMLInputElement).value,(document.getElementById('scenario') as HTMLSelectElement).value as ScenarioId);stop();session=fresh;casting=false;teleportTarget=null;selected='p0';shot=false;tab='battle';render();message('已依種子重設演武。');}catch(e){message((e as Error).message,true);}});
document.body.classList.toggle('motion-paused',!settings.motion);
if(!automationSkipsTitle())openTitle();
render();
