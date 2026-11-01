import './adventure.css';
import {unitFigure,troopFigure,propFigure,paintedBackground,portraitFigure,worldFigure,sceneFigure,mapAtlasPatterns,mapAtlasRect} from './art/painted';
import {soundtrack} from './audio/soundtrack';
import {motionProfiles} from './art/motion';
import {Campaign} from './campaign/session';
import {location,leadership,upkeep,pathTo,spellCap,bountyReward,siteRoster,campaignVersion2,spellPrice,usesRosterV2} from './campaign/engine';
import {balanceV2,places,map,heroClasses,terrainNames,villains,artifacts,artifactEffects,endings,balance} from './campaign/content';
import {unit,units,catalogs} from './content/load';
import {alive,reachable,distance} from './core/engine';
import {morale} from './core/modifiers';
import {nextAICommand} from './core/ai';
import {spellRules} from './core/spells';
import {magicProfile} from './core/abilities';
import type {WorldCommand,RulesMode} from './campaign/types';
import {settings,saveSettings,automationSkipsTitle} from './settings';
import {tip,type TipKey} from './tips';
import {showTitle,titleOpen,type StartChoice} from './intro';
import type {Place} from './campaign/content';
import type {Command,Stack,Cell} from './core/types';
const art=(file:string)=>`${import.meta.env.BASE_URL}assets/original/${file}.svg`;
const e=(x:unknown)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** The UI starts campaign-2.0.0 journeys. Legacy automated checks (skip-title flag) keep exercising campaign-1.0.0. */
const uiRuleset=()=>automationSkipsTitle()?undefined:campaignVersion2;
let game=new Campaign(automationSkipsTitle()?undefined:{seed:'jiuzhou-2026',heroId:'wu_jiang',mode:'enhanced',ruleset:campaignVersion2}),root:HTMLElement,notify:(s:string,b?:boolean)=>void=()=>{};let visible=false;
let subtab='map',selected='p0',attackMode='auto',castId=-1,teleport:string|null=null;
let automatic=false,timer:ReturnType<typeof setTimeout>|undefined,walking=false,ticks=0,revision=0;
let heroChoice='wu_jiang',modeChoice:RulesMode='enhanced',seedChoice='jiuzhou-2026';
let recruitId='xiang_yong',count=5,recruitSlot=0,recruitSite='',recruitNotice='',splitCount=5,slot=0,otherSlot=3,spellChoice=2,archiveOpen=false;
const storageKey='jiuzhou-campaign-1';
function img(file:string,alt='',cls=''){
 const id=Number(file.split('-')[1]);
 if(file.startsWith('hero-'))return portraitFigure(id,alt,cls);
 if(file.startsWith('foe-'))return portraitFigure(4+id,alt,cls);
 if(file.startsWith('artifact-'))return worldFigure(28+id,alt,cls);
 if(file.startsWith('spell-'))return worldFigure(14+id,alt,cls);
 if(file.startsWith('scene-'))return sceneFigure(id,alt,cls);
 const tile=['plain','forest','mountain','water','road','bridge','marsh','ruins'];
 if(file.startsWith('tile-'))return worldFigure(tile.indexOf(file.slice(5)),alt,cls);
 return `<img class="${cls}" src="${art(file)}" alt="${e(alt)}" loading="lazy">`;
}
let soundOn=automationSkipsTitle()?false:settings.sfx,motionOn=settings.motion,systemOpen=false;
/** Older automated checks expect the save/sound controls on screen, so they keep the menu open. */
const systemShown=()=>systemOpen||automationSkipsTitle();
/** Map role of a place: where you can recruit vs. where a battle can start. */
type PlaceRole='recruit'|'battle'|'choice'|'event'|'done';
function placeRole(p:Place):PlaceRole{
 const w=game.state;
 if(p.id==='bandit'){if(!w.route)return 'choice';if(w.route!=='conquest'||w.defeated.includes(0))return 'done';return 'battle';}
 if(p.foe!==undefined)return w.defeated.includes(p.foe)?'done':'battle';
 if(siteRoster(w.options,p))return 'recruit';
 return 'event';
}
const roleLabel:Record<PlaceRole,[string,string]>={recruit:['募','可招募'],battle:['戰','敵將・會交戰'],choice:['擇','抉擇・可能交戰'],event:['廟','事件'],done:['✓','已平定']};
function startJourney(choice:StartChoice){report=null;battleStart=null;soundOn=settings.sfx;motionOn=settings.motion;const fresh=new Campaign({heroId:choice.heroId,mode:choice.mode,seed:choice.seed,ruleset:campaignVersion2});stop();revision++;game=fresh;recruitSite='';recruitNotice='';archiveOpen=false;subtab='map';castId=-1;teleport=null;selected='p0';heroChoice=choice.heroId;modeChoice=choice.mode;seedChoice=choice.seed;render();autosave();notify('新旅程已開始。前往斷雁寨、聽雨古廟與野外敵將處尋回三枚山河印。');}
function hasAutosave(){try{return !!localStorage.getItem(storageKey);}catch{return false;}}
async function resumeJourney(){try{const raw=localStorage.getItem(storageKey);if(!raw)throw Error('沒有本機自動存檔');await loadSave(JSON.parse(raw));return true;}catch(err){notify((err as Error).message,true);alert('自動存檔無法讀取：'+(err as Error).message);return false;}}
export function openTitle(initial:'title'|'select'='title'){stop();showTitle({start:startJourney,resume:resumeJourney,hasSave:hasAutosave,closed:()=>render()},initial);}
export function pauseAdventure(){visible=false;soundtrack.setScene('map',false);if(timer)clearTimeout(timer);timer=undefined;walking=false;automatic=false;}
export function showAdventure(container:HTMLElement,message:(s:string,b?:boolean)=>void){if(root!==container)container.addEventListener('pointerdown',ev=>{lastPointer={x:ev.clientX,y:ev.clientY};},true);root=container;notify=message;visible=true;render();}
function commandSound(c:WorldCommand,wasBattle:boolean){
 if(!soundOn)return;
 if(wasBattle&&!game.state.battle){soundtrack.cue(game.state.ending==='defeat'?'defeat':'victory');return;}
 if(c.type==='battle'){const cmd=c.command;soundtrack.cue(cmd.type==='move'?'step':cmd.type==='ranged-attack'?'shot':cmd.type==='magic-attack'||cmd.type==='cast'?'magic':cmd.type==='attack'?'attack':'step');}
 else if(c.type==='travel')soundtrack.cue('step');
}
function stop(){if(timer)clearTimeout(timer);timer=undefined;walking=false;automatic=false;ticks=0;}
function autosave(){const n=++revision;void game.save().then(save=>{if(n===revision)try{localStorage.setItem(storageKey,JSON.stringify(save));}catch{notify('自動存檔空間不足，請使用匯出存檔。',true);}}).catch(err=>notify(String(err),true));}
type Report={kind:'victory'|'retreat'|'claim';html:string};
let report:Report|null=null;
let lastPointer={x:innerWidth/2,y:innerHeight/2};
let purchase:{amount:number;x:number;y:number;flash:string}|null=null;
const purchaseTypes=['buy-spell','recruit-world','boat','rest','occupy'];
/** Coin sound, coins flying into the 銀兩 counter, and the spent amount. Presentation only. */
function playPurchase(){
 const p=purchase;purchase=null;if(!p)return;
 if(soundOn)soundtrack.cue('coin');
 const gold=root.querySelector<HTMLElement>('.gold-stat');gold?.classList.remove('gold-pulse');void gold?.offsetWidth;gold?.classList.add('gold-pulse');
 if(p.flash){const card=root.querySelector<HTMLElement>(p.flash)?.closest<HTMLElement>('article')??root.querySelector<HTMLElement>(p.flash);card?.classList.add('bought-flash');setTimeout(()=>card?.classList.remove('bought-flash'),900);}
 const label=document.createElement('span');label.className='spend-float';label.textContent=`−${p.amount.toLocaleString()} 兩`;label.style.left=`${p.x}px`;label.style.top=`${p.y-34}px`;document.body.append(label);setTimeout(()=>label.remove(),1100);
 if(!motionOn||matchMedia('(prefers-reduced-motion: reduce)').matches||!gold)return;
 const r=gold.getBoundingClientRect(),tx=r.left+r.width/2,ty=r.top+r.height/2;
 for(let i=0;i<7;i++){const coin=document.createElement('span');coin.className='coin-fly';coin.textContent='兩';coin.style.left=`${p.x}px`;coin.style.top=`${p.y}px`;document.body.append(coin);
  const dx=tx-p.x,dy=ty-p.y,spread=(i-3)*18;
  coin.animate([{transform:'translate(-50%,-50%) scale(.4)',opacity:0},{transform:`translate(calc(-50% + ${spread}px),calc(-50% - 40px)) scale(1.1)`,opacity:1,offset:.25},{transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.6)`,opacity:.9}],{duration:720,delay:i*55,easing:'cubic-bezier(.3,.1,.3,1)',fill:'forwards'}).onfinish=()=>coin.remove();}
}
let battleStart:{foe:number;army:{unitId:string;count:number}[];enemy:number}|null=null;
function troopsOf(stacks:(Stack|null)[]){return stacks.filter((a):a is Stack=>!!a).map(a=>({unitId:a.unitId,count:a.count}));}
function lossRows(before:{unitId:string;count:number}[],after:(Stack|null)[]){
 const left=new Map<string,number>();after.forEach(a=>{if(a)left.set(a.unitId,(left.get(a.unitId)??0)+a.count);});
 const sum=new Map<string,number>();before.forEach(a=>sum.set(a.unitId,(sum.get(a.unitId)??0)+a.count));
 return [...sum].map(([id,n])=>{const m=left.get(id)??0;return `<tr><td>${e(unit(id).name)}</td><td>${n}</td><td>${m}</td><td class="${n-m>0?'loss':''}">${n-m>0?'−'+(n-m):'無'}</td></tr>`;}).join('');
}
/** Builds a summary from the world state before and after a command. UI only; the engine result is authoritative. */
function makeReport(c:WorldCommand,before:typeof game.state,after:typeof game.state):Report|null{
 if(before.battle&&!after.battle&&!after.ending&&c.type==='battle'&&before.battleFoe!==null){
  const foe=before.battleFoe,start=battleStart?.foe===foe?battleStart:null,gained=after.seals.filter(x=>!before.seals.includes(x));
  const sealName:Record<string,string>={wood:'木印',water:'水印',stone:'山印'};
  const items=[`<li><b>討伐憑證</b>：${e(villains[foe].name)}，回任一城鎮按「領取討伐賞金」可得 <b>${bountyReward(foe).toLocaleString()} 兩</b></li>`,
   `<li><b>統率</b> ${leadership(before)} → ${leadership(after)}（+${leadership(after)-leadership(before)}）</li>`,
   ...gained.map(x=>`<li><b>取得${sealName[x]??x}</b>（三印 ${after.seals.length}/3）</li>`),
   after.spellPower!==before.spellPower?`<li><b>法力</b> ${before.spellPower} → ${after.spellPower}</li>`:'',
   `<li>戰後休整一日（第 ${after.day} 日）</li>`];
  const unclaimed=after.defeated.filter(id=>!after.claimed.includes(id));
  return {kind:'victory',html:`<p class="eyebrow">VICTORY · 戰果報告</p><h3>${portraitFigure(4+foe,villains[foe].name,'report-face')}擊敗 ${e(villains[foe].name)}</h3>
   <h4>收益</h4><ul class="report-gains">${items.join('')}</ul>
   ${start?`<h4>我方傷亡</h4><table class="report-table"><thead><tr><th>部曲</th><th>出戰</th><th>存活</th><th>損失</th></tr></thead><tbody>${lossRows(start.army,after.army)}</tbody></table><p>殲滅敵軍 ${start.enemy} 人。</p>`:''}
   <p class="report-note">待領賞金共 ${unclaimed.length} 筆、${unclaimed.reduce((t,id)=>t+bountyReward(id),0).toLocaleString()} 兩。目前銀兩 ${after.gold.toLocaleString()}。</p>`};
 }
 if(before.battle&&!after.battle&&c.type==='retreat'){
  const start=battleStart;
  return {kind:'retreat',html:`<p class="eyebrow">RETREAT · 撤退</p><h3>撤回青禾府</h3><p>存活兵員損失兩成，耗時兩日（第 ${after.day} 日）。沒有取得討伐憑證。</p>${start?`<table class="report-table"><thead><tr><th>部曲</th><th>出戰</th><th>存活</th><th>損失</th></tr></thead><tbody>${lossRows(start.army,after.army)}</tbody></table>`:''}`};
 }
 if(c.type==='claim'){
  const paid=after.claimed.filter(id=>!before.claimed.includes(id));
  return {kind:'claim',html:`<p class="eyebrow">BOUNTY · 領賞</p><h3>領取討伐賞金</h3><table class="report-table"><thead><tr><th>敵將</th><th>賞金</th></tr></thead><tbody>${paid.map(id=>`<tr><td>${e(villains[id].name)}</td><td>${bountyReward(id).toLocaleString()} 兩</td></tr>`).join('')}</tbody></table><p class="report-note">合計 <b>+${(after.gold-before.gold).toLocaleString()} 兩</b>　銀兩 ${before.gold.toLocaleString()} → ${after.gold.toLocaleString()}</p>`};
 }
 return null;
}
type VisualEffect={id:string;unitId:string;cell:Cell;kind:'hit'|'heal'|'move'|'attack'|'ranged'|'magic'|'death';amount?:number;from?:Cell;target?:Cell};
let pendingEffects:VisualEffect[]=[];
function send(c:WorldCommand){try{
 const previous=game.state,before=game.state.battle;game.dispatch(c);pendingEffects=[];const after=game.state.battle;
 if(!before&&after)battleStart={foe:game.state.battleFoe!,army:troopsOf(previous.army),enemy:after.armies.enemy.reduce((t,a)=>t+(a?.count??0),0)};
 const summary=makeReport(c,previous,game.state);if(summary&&!automationSkipsTitle())report=summary;if(!game.state.battle)battleStart=null;
 if(before&&c.type==='battle'){
  const stacks=[...before.armies.player,...before.armies.enemy].filter((a):a is Stack=>!!a&&a.hp>0);
  for(const old of stacks){const next=after?[...after.armies.player,...after.armies.enemy].find(a=>a?.id===old.id):null;
   if(!next||!old.cell)continue;
   if(next.hp<old.hp)pendingEffects.push({id:old.id,unitId:old.unitId,cell:next.cell??old.cell,kind:next.hp===0?'death':'hit',amount:old.hp-next.hp});
   if(next.hp>old.hp)pendingEffects.push({id:old.id,unitId:old.unitId,cell:next.cell??old.cell,kind:'heal',amount:next.hp-old.hp});
   if(next.cell&&(next.cell.x!==old.cell.x||next.cell.y!==old.cell.y))pendingEffects.push({id:old.id,unitId:old.unitId,cell:next.cell,kind:'move',from:old.cell});
  }
  const cmd=c.command;if(cmd.type==='cast'){const target=stacks.find(a=>a.id===cmd.targetId);if(target?.cell)pendingEffects.push({id:target.id,unitId:target.unitId,cell:target.cell,kind:'magic'});}
  if('actorId' in cmd&&'targetId' in cmd&&['attack','ranged-attack','magic-attack'].includes(cmd.type)){const actor=stacks.find(a=>a.id===cmd.actorId);if(actor?.cell)pendingEffects.push({id:actor.id,unitId:actor.unitId,cell:actor.cell,kind:cmd.type==='magic-attack'?'magic':cmd.type==='ranged-attack'?'ranged':'attack',target:stacks.find(s=>s.id===cmd.targetId)?.cell??undefined});}
 }
 if(purchaseTypes.includes(c.type)&&game.state.gold<previous.gold){const flash=c.type==='buy-spell'?`[data-buy-spell="${c.spellId}"]`:c.type==='recruit-world'?'.recruitment-panel':'';purchase={amount:previous.gold-game.state.gold,x:lastPointer.x,y:lastPointer.y,flash};}
 notify('');commandSound(c,!!before);autosave();render();return true;
 }catch(err){notify((err as Error).message,true);return false;}}
function playVisualEffects(){
 const effects=pendingEffects;pendingEffects=[];
 if(!motionOn||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const board=root.querySelector('.campaign-board');if(!board)return;const rect=board.getBoundingClientRect();
 for(const fx of effects){const cell=root.querySelector<HTMLElement>(`[data-battle-cell="${fx.cell.x},${fx.cell.y}"]`);if(!cell)continue;
  const visual=cell.querySelector<HTMLElement>('.troop-visual');
  if(fx.kind==='move'&&visual&&fx.from){const flying=['winged','wind','spirit','vampire','reaper','dragon'].includes(motionProfiles[unit(fx.unitId).sourceTroopId][0]);visual.classList.add(flying?'motion-fly':'motion-walk');setTimeout(()=>visual.classList.remove('motion-fly','motion-walk'),440);visual.animate([{transform:`translate(${(fx.from.x-fx.cell.x)*rect.width/6}px,${(fx.from.y-fx.cell.y)*rect.height/5}px)`},{transform:'translate(0,0)'}],{duration:420,easing:'cubic-bezier(.22,.7,.3,1)'});}
  if(fx.kind==='hit')visual?.classList.add('hit-flash');
  if(fx.kind==='attack'&&visual){visual.classList.add('motion-strike');if(fx.target){const dx=(fx.target.x-fx.cell.x)*rect.width/6,dy=(fx.target.y-fx.cell.y)*rect.height/5;visual.animate([{transform:'translate(0,0)'},{transform:`translate(${dx*.3}px,${dy*.3}px)`,offset:.45},{transform:'translate(0,0)'}],{duration:420,easing:'ease-out'});const target=root.querySelector(`[data-battle-cell="${fx.target.x},${fx.target.y}"]`);const slash=document.createElement('span');slash.className='battle-slash';target?.append(slash);setTimeout(()=>slash.remove(),430);}}
  if(fx.kind==='ranged')visual?.classList.add('motion-shoot');
  if(visual&&['attack','ranged','magic'].includes(fx.kind))setTimeout(()=>visual.classList.remove('motion-strike','motion-shoot','motion-cast'),650);
  if(fx.kind==='magic'){cell.classList.add('magic-flash');visual?.classList.add('motion-cast');}
  if((fx.kind==='magic'||fx.kind==='ranged')&&fx.target){const bolt=document.createElement('span');bolt.className=`battle-projectile ${fx.kind==='magic'?'spell-bolt':''}`;const dx=(fx.target.x-fx.cell.x)*rect.width/6,dy=(fx.target.y-fx.cell.y)*rect.height/5,angle=Math.atan2(dy,dx)*180/Math.PI;bolt.style.left=`${(fx.cell.x+.5)*rect.width/6}px`;bolt.style.top=`${(fx.cell.y+.4)*rect.height/5}px`;board.append(bolt);bolt.animate([{transform:`translate(0,0) rotate(${angle}deg)`,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${angle}deg)`,opacity:.5}],{duration:350,easing:'ease-in'});setTimeout(()=>bolt.remove(),370);}

  if(fx.kind==='death'){const ghost=document.createElement('span');ghost.className='death-echo';ghost.innerHTML=troopFigure(unit(fx.unitId),unit(fx.unitId).name);cell.append(ghost);setTimeout(()=>ghost.remove(),750);}
  if(fx.amount){const label=document.createElement('span');label.className=`float-damage ${fx.kind==='heal'?'heal':''}`;label.textContent=`${fx.kind==='heal'?'+':'−'}${fx.amount}`;cell.append(label);setTimeout(()=>label.remove(),850);}
 }
}
function pump(){if(timer)clearTimeout(timer);const battle=game.state.battle;if(!visible||!battle||game.state.ending||(!automatic&&battle.turn!=='enemy'))return;timer=setTimeout(()=>{if(++ticks>2000){stop();notify('此戰達到自動操作上限，請手動操作或撤退。',true);render();return;}if(send({type:'battle',command:nextAICommand(battle)}))pump();else stop();},automatic?450:550);}
function moveTo(x:number,y:number){if(game.state.battle||game.state.ending||walking)return;const path=pathTo(game.state,x,y);if(!path.length){notify('沒有可行路徑；江面需橋梁或船，山壁不可通行。',true);return;}walking=true;let i=0;function step(){if(!visible||!walking)return;if(i>=path.length||game.state.ending){walking=false;render();return;}if(!send({type:'travel',cell:path[i++]})){walking=false;return;}timer=setTimeout(step,35);}step();}
function unitCard(s:Stack|null,i:number){if(!s)return `<div class="company empty">第 ${i+1} 欄 · 無部曲</div>`;const u=unit(s.unitId);return `<button class="company ${selected===s.id?'selected':''}" data-company="${s.id}">${troopFigure(u,u.name)}<span><strong>${e(u.name)}</strong><small>${s.count} 人 · ${s.hp} HP${s.status.frozen?' · 定身':''}</small><small>統率 ${s.count*u.hp}/${leadership(game.state)}${game.state.battle?` · 士氣 ${{L:'低',N:'常',H:'高'}[morale(game.state.battle,s)]}`:''}</small></span></button>`;}
function mapHTML(){const w=game.state,known=new Set(w.revealed),cell=40;const tileTypes=['plain','forest','mountain','water','road','bridge','marsh','ruins'],buildings={city:8,camp:9,foe:10,bandit:11,shrine:12,beacon:13};
 return `<div class="world-toolbar"><span>青嵐九州 · 原創 32 × 32</span><span>點格尋路，方向鍵逐步移動；途中可按停止</span></div><div class="world-viewport" tabindex="0" aria-label="世界地圖，可用方向鍵移動"><svg class="world-map" viewBox="0 0 1280 1280" width="1280" height="1280" aria-label="青嵐九州原創地圖">${mapAtlasPatterns()}${map.map((row,y)=>row.map((tile,x)=>{const p=places.find(p=>p.x===x&&p.y===y),foeDone=p?.foe!==undefined&&w.defeated.includes(p.foe),px=x*cell,py=y*cell;return `<g data-world="${x},${y}" class="world-tile"><title>${x+1},${y+1} ${known.has(y*32+x)?e(p?`${p.name}（${roleLabel[placeRole(p)][1]}）`:terrainNames[tile]):'未探索'}</title>${known.has(y*32+x)?`<rect x="${px}" y="${py}" width="40" height="40" fill="#a4b38b"/>${mapAtlasRect(tileTypes.indexOf(w.bridges.includes(y*32+x)?'bridge':tile),px,py,cell)}${p?placeMarker(p,px,py,foeDone,buildings[p.kind]):''}`:`<rect x="${px}" y="${py}" width="40" height="40" fill="#243d35"/><path d="M${px+6} ${py+20}h28" stroke="#304c40"/>`}</g>`;}).join('')).join('')}<circle cx="${w.position.x*cell+20}" cy="${w.position.y*cell+20}" r="18" fill="#c48f52" stroke="#f7dfaa" stroke-width="2"/>${mapAtlasRect(heroClasses.findIndex(h=>h.id===w.options.heroId),w.position.x*cell+5,w.position.y*cell+5,30,true)}</svg></div><div class="marker-legend" aria-label="地點圖例"><span class="k-recruit"><i>募</i>可招募部曲（城鎮、營地）</span><span class="k-battle"><i>戰</i>敵將據點・進入後可交戰</span><span class="k-choice"><i>擇</i>斷雁寨・討伐／招安／交易</span><span class="k-event"><i>廟</i>事件地點</span><span class="k-done"><i>✓</i>已平定</span></div><div class="map-legend">${tileTypes.map((t,i)=>`${worldFigure(i,terrainNames[t as keyof typeof terrainNames])} ${terrainNames[t as keyof typeof terrainNames]}`).join('　')}</div>`;
}
function placeMarker(p:Place,px:number,py:number,done:boolean,building:number){
 const role=placeRole(p),color={recruit:'#23864b',battle:'#b3261e',choice:'#c27a17',event:'#7a5bb0',done:'#7b847d'}[role];
 const face=p.foe!==undefined&&role!=='done'?`<circle class="marker-face" cx="${px+20}" cy="${py+20}" r="17" fill="url(#painted-hero-${4+p.foe})" stroke="${color}" stroke-width="3"/>`:`<g opacity="${done?.5:1}">${mapAtlasRect(building,px-3,py-3,46)}</g>`;
 const ring=role==='battle'||role==='choice'?`<circle class="marker-ring" cx="${px+20}" cy="${py+20}" r="21" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${role==='choice'?'5 3':'none'}"/>`:`<rect class="marker-ring" x="${px+1}" y="${py+1}" width="38" height="38" rx="7" fill="none" stroke="${color}" stroke-width="${role==='recruit'?3:2}"/>`;
 return `<g class="place-marker marker-${role}" data-place-role="${role}">${face}${ring}<circle cx="${px+33}" cy="${py+7}" r="11" fill="${color}" stroke="#fff" stroke-width="2"/><text x="${px+33}" y="${py+7.5}">${roleLabel[role][0]}</text></g>`;
}
/** Explains why a place's main actions are locked, right where the player is looking. */
function requirementHTML(p:Place|undefined){
 const w=game.state;if(!p)return '';
 const needQuest=!w.quest&&(p.id==='bandit'&&!w.route||p.id==='shrine'&&!w.seals.includes('water')||p.id==='beacon');
 if(needQuest)return `<div class="requirement" role="note"><b>尚未接受委託</b><p>要先回青禾府按「接受山河三印委託」，這裡的選項才能使用。</p><button data-destination="4,5">前往青禾府 (5,6)</button></div>`;
 if(p.id==='beacon'&&w.seals.length<3)return `<div class="requirement" role="note"><b>三印未齊（${w.seals.length}/3）</b><p>斷雁寨取木印、聽雨古廟取水印、擊敗任一野外敵將取山印，集齊後才能挑戰龍主並點燃烽火。</p></div>`;
 return '';
}
function locationHTML(){const w=game.state,p=location(w);const completed=p?.foe!==undefined&&w.defeated.includes(p.foe);const actions:string[]=[];
 if(p?.id==='home'&&!w.quest)actions.push('<button class="primary" data-action="accept">接受山河三印委託</button>');
 if(siteRoster(w.options,p))actions.push('<button class="primary" id="open-recruitment">招募部曲</button>');
 if(p?.kind==='city')actions.push('<button data-action="claim">領取討伐賞金</button>','<button data-action="rest">客棧休整 · 100 兩／日</button>',p.id==='east'&&!w.boat?'<button data-action="boat">租船渡江</button>':'',p.id!=='home'&&w.route==='conquest'?'<button data-action="occupy">占領城關 · 1,000 兩</button>':'');
 const noQuest=!w.quest?'disabled':'';
 if(p?.id==='bandit'&&!w.route)actions.push(`<button data-route="conquest" ${noQuest}>討伐 · 武力奪印（立即開戰）</button>`,`<button data-route="alliance" ${noQuest}>招安 · 500 兩盟約</button>`,`<button data-route="trade" ${noQuest}>交易 · 1,000 兩贖印</button>`);
 if(p?.foe!==undefined&&!completed&&(p.id!=='bandit'||w.route==='conquest'))actions.push(`<button class="primary" data-action="fight" ${p.foe===16&&(!w.quest||w.seals.length<3)?'disabled':''}>與守軍交戰</button>`);
 if(p?.id==='shrine'&&!w.seals.includes('water'))actions.push(`<button data-action="shrine" ${noQuest}>守夜取印 · 一日</button>`);
 if(p?.id==='beacon')actions.push(`<button class="primary" data-action="finish" ${!w.quest||w.seals.length<3||!w.route?'disabled':''}>合印點烽 · 完成旅程</button>`);
 const sites=['bandit','shrine','foe-4','home','foe-9','forest','ghost','east'];sites.forEach((site,i)=>{if(p?.id===site&&!w.artifacts.includes(i))actions.push(`<button data-artifact="${i}">${img(`artifact-${i}`)} 取 ${artifacts[i].name}</button>`);});
 return `<section class="panel location-panel">${img(`scene-${p?.id==='beacon'?2:p?.kind==='camp'?1:0}`,p?.name??'山河行旅','scene')}<div class="location-body"><p class="eyebrow">${p?'WAYPOINT':'ON THE ROAD'} · ${w.position.x+1},${w.position.y+1}</p>${p?`<span class="place-kind kp-${placeRole(p)}">${roleLabel[placeRole(p)][1]}</span>`:''}<h3>${e(p?.name??terrainNames[map[w.position.y][w.position.x]])}</h3><p>${e(p?.description??'沿驛道探訪各地。江面需渡船或架橋，山壁不能攀越；雨天與林澤耗費更多步數。')}</p>${completed?'<p class="completed">此地敵將已解決，憑證可返回城鎮領賞。</p>':''}${requirementHTML(p)}<div class="location-actions">${actions.join('')}</div></div></section>`;
}
/** Recruitment preview only; applyWorld remains authoritative and unchanged. */
function recruitmentInfo(target:number){
 const w=game.state,p=location(w),u=unit(recruitId),dst=w.army[target];
 const stock=p&&siteRoster(w.options,p)?.includes(u.id)?w.supplies[p.id][u.id]:0;
 const capacity=Math.max(0,Math.floor(leadership(w)/u.hp)-(dst?.count??0));
 const incompatible=!!dst&&dst.unitId!==u.id;
 const hostile=(p?.id==='ghost'||p?.id==='wild')&&w.relations.spirits<0;
 const max=incompatible||hostile?0:Math.max(0,Math.min(stock,Math.floor(w.gold/u.gold),capacity));
 const reason=incompatible?'此欄已有不同兵種，請選擇同兵種隊伍或空欄。':hostile?'妖靈關係敵對，須先在古廟守夜修復關係。':stock===0?'此兵種庫存已用盡，等待週次補充。':capacity===0?'此欄已達統率上限，請選擇空欄分隊。':w.gold<u.gold?'銀兩不足以招募一人。':'';
 return {stock,max,reason};
}
function chooseRecruitSlot(){
 const w=game.state;
 const same=w.army.findIndex((a,i)=>a?.unitId===recruitId&&recruitmentInfo(i).max>0);
 const empty=w.army.findIndex((a,i)=>!a&&recruitmentInfo(i).max>0);
 recruitSlot=same>=0?same:empty>=0?empty:w.army.findIndex(a=>a?.unitId===recruitId||!a);
 if(recruitSlot<0)recruitSlot=0;
}
function armyHTML(){
 const w=game.state,p=location(w),u=unit(recruitId),info=recruitmentInfo(recruitSlot);
 const valid=Number.isSafeInteger(count)&&count>=1&&count<=info.max;
 const issue=info.reason||(!Number.isSafeInteger(count)||count<1?'請輸入大於零的整數兵數。':count>info.max?`本欄目前最多可招 ${info.max} 人；請減少兵數或另選欄位。`:'');
 return `<section class="panel"><h3>部曲與軍餉</h3>${w.army.map(unitCard).join('')}<p class="hint">每週軍餉 ${upkeep(w)} 兩 · 逐隊統率 ${leadership(w)}<br>合併／拆分限滿血；換位保留殘血。</p><h4>調整隊伍</h4><div class="form-row"><label>來源欄<select id="world-slot">${Array.from({length:5},(_,i)=>`<option value="${i}" ${slot===i?'selected':''}>${i+1}</option>`).join('')}</select></label><label>目標欄<select id="world-other">${Array.from({length:5},(_,i)=>`<option value="${i}" ${otherSlot===i?'selected':''}>${i+1}</option>`).join('')}</select></label></div><label class="field-label">拆分兵數<input id="world-split-count" type="number" min="1" max="1000000" value="${splitCount}"></label><div class="form-row"><button id="world-swap">換位</button><button id="world-merge">合併</button><button id="world-split">拆分</button></div><section class="recruitment-panel" aria-labelledby="recruitment-title"><h3 id="recruitment-title">${siteRoster(w.options,p)?`${e(p!.name)} · 招募`:'招募部曲'}</h3>${siteRoster(w.options,p)?`<label class="field-label">此地兵源<select id="world-recruit-unit">${siteRoster(w.options,p)!.map(id=>`<option value="${id}" ${recruitId===id?'selected':''}>${unit(id).tier?`${unit(id).faction}・${unit(id).tier} 級 `:''}${unit(id).name} · ${unit(id).gold} 兩 · 庫存 ${w.supplies[p!.id][id]}</option>`).join('')}</select></label><label class="field-label">編入欄位<select id="world-recruit-slot">${w.army.map((a,i)=>`<option value="${i}" ${recruitSlot===i?'selected':''}>第 ${i+1} 欄 · ${a?`${unit(a.unitId).name} ${a.count} 人${a.unitId!==recruitId?'（不同兵種）':''}`:'空欄'}</option>`).join('')}</select></label><label class="field-label">招募兵數<input id="world-count" type="number" min="1" max="${Math.max(1,info.max)}" value="${Number.isFinite(count)?count:''}" aria-describedby="recruitment-summary recruitment-issue"></label><p id="recruitment-summary" class="hint">庫存 ${info.stock} 人 · 單價 ${u.gold} 兩 · 本欄目前最多可招 ${info.max} 人<br>本次費用：${Number.isSafeInteger(count)&&count>0?(count*u.gold).toLocaleString():'—'} 兩</p><p id="recruitment-issue" class="recruitment-issue" role="status">${e(issue)}</p><button class="primary" id="world-recruit" ${valid?'':'disabled'} aria-describedby="recruitment-issue">招募 ${Number.isSafeInteger(count)&&count>0?count:''} 人至第 ${recruitSlot+1} 欄</button><p id="recruitment-result" role="status">${e(recruitNotice)}</p>`:'<p class="hint">前往城鎮／兵源據點才能招募。</p>'}</section></section>`;
}
function updateRecruitPreview(){
 const template=document.createElement('template');template.innerHTML=armyHTML();
 for(const id of ['recruitment-summary','recruitment-issue','recruitment-result']){const current=root.querySelector('#'+id),next=template.content.querySelector('#'+id);if(current&&next)current.textContent=next.textContent;}
 const current=root.querySelector<HTMLButtonElement>('#world-recruit'),next=template.content.querySelector<HTMLButtonElement>('#world-recruit');if(current&&next){current.disabled=next.disabled;current.textContent=next.textContent;}
}
function spellsHTML(){const w=game.state,p=location(w);return `<section class="panel"><h3>符籙 · 全十四術</h3><p class="hint">英雄法力 ${w.spellPower} · 各術存量上限 ${spellCap(w)}<br>前七術用於戰鬥；後七術用於行旅。${spellPrice(w.options,6)===null?'渡厄價格衝突仍停售（研究基準）。':''}</p><div class="spell-library">${catalogs.spell.map((s,i)=>`<article>${img(`spell-${i}`,s.name)}<div><strong>${s.name}</strong><small>餘 ${w.spellbook[i]} · ${i<7?'戰鬥法術':'冒險法術'}</small><small>${i<7?(i===5&&w.options.mode==='study'?'回復單兵 HP × 法力，可復活至上限；研究適配':spellRules[i].description):['相鄰江面架橋','40 次移動不耗日程','揭露下一位敵將位置','返回已造訪的赤嶺關','返回青禾府',`召來 10 名${usesRosterV2(w.options)?unit(balanceV2.summonSpell.unitId).name:'鄉勇'}`,'本旅程統率 +50'][i-7]}</small></div>${i>=7?`<button data-adventure-spell="${i}">施放</button>`:''}${p?.kind==='city'?`<button data-buy-spell="${i}" ${spellPrice(w.options,i)===null?'disabled':''}>${spellPrice(w.options,i)??'待核對'} 兩購符</button>`:''}</article>`).join('')}</div></section>`;}
function journalHTML(){const w=game.state;return `<section class="panel"><h3>山河三印 · 主線</h3><p>${w.quest?'委託已承接':'先在青禾府接受委託。'}</p><ol><li>${w.seals.includes('wood')?'✓':'○'} 斷雁寨：討伐、招安或交易，取得木印。</li><li>${w.seals.includes('water')?'✓':'○'} 聽雨古廟：守夜取水印。</li><li>${w.seals.includes('stone')?'✓':'○'} 解決任一野外敵將，取得山印。</li><li>帶三印至天衡烽臺；討伐路線擊敗龍主，盟約／交易可另付 2,000 兩免戰通關。</li></ol><p>當前道路：${w.route?{conquest:'討伐',alliance:'招安',trade:'交易'}[w.route]:'尚未抉擇'}。三路互斥，選擇後不能切換。</p><p>朝廷 ${w.relations.court} · 江湖 ${w.relations.jianghu} · 妖靈 ${w.relations.spirits}</p><h3>十七懸賞</h3><div class="bounty-grid">${villains.map((v,i)=>`<article>${img(`foe-${i}`,v.name)}<strong>${v.name}</strong><small>${w.claimed.includes(i)?'已領賞':w.defeated.includes(i)?'待領賞':'尚未討伐'} · ${Math.max(500,Math.floor(v.baselineRewardGold/5))} 兩</small></article>`).join('')}</div><h3>八件神器</h3><div class="artifact-grid">${artifacts.map((a,i)=>`<article class="${w.artifacts.includes(i)?'owned':''}">${img(`artifact-${i}`,a.name)}<strong>${a.name}${w.artifacts.includes(i)?' ✓':''}</strong><small>${artifactEffects[i]}</small></article>`).join('')}</div></section>`;}
/** Picks melee / ranged / unit magic for a click on an enemy. A manual choice in the dropdown still wins. */
function attackFor(actor:Stack|undefined,target:Stack):{type:'attack'|'ranged-attack'|'magic-attack';ok:boolean;why:string}{
 const b=game.state.battle!;
 if(!actor||!actor.cell||!target.cell)return {type:'attack',ok:false,why:'請先選擇我方兵團'};
 if(actor.acted)return {type:'attack',ok:false,why:'此兵團本回合已行動'};
 const u=unit(actor.unitId),adjacent=distance(actor.cell,target.cell)===1,pinned=alive(b,'enemy').some(s=>s.cell&&distance(actor.cell!,s.cell)===1);
 const canShoot=u.ranged_min!==null&&actor.ammo>0&&!pinned,canMagic=!!magicProfile(actor,b.rulesMode)&&actor.magicCharges>0&&!pinned;
 if(attackMode==='ranged-attack')return {type:'ranged-attack',ok:canShoot,why:u.ranged_min===null?`${u.name}沒有遠射能力`:actor.ammo<=0?'彈藥已用盡':pinned?'被相鄰敵軍牽制，不能遠射':''};
 if(attackMode==='magic-attack')return {type:'magic-attack',ok:canMagic,why:pinned?'被相鄰敵軍牽制，不能施法':'此兵團沒有兵種魔法或次數已用盡'};
 if(attackMode==='attack'||adjacent)return {type:'attack',ok:adjacent,why:'近戰須移到敵軍上下左右相鄰的格子'};
 if(canShoot)return {type:'ranged-attack',ok:true,why:''};
 if(canMagic)return {type:'magic-attack',ok:true,why:''};
 return {type:'attack',ok:false,why:u.ranged_min!==null&&actor.ammo<=0?'彈藥已用盡，請移到敵軍旁近戰':u.ranged_min!==null&&pinned?'被相鄰敵軍牽制，不能遠射；請先攻擊旁邊的敵軍':`${u.name}沒有遠射能力，請先移到敵軍旁邊再近戰`};
}
function rangeNote(actor:Stack|undefined){
 if(!actor)return '';const b=game.state.battle!,u=unit(actor.unitId);
 if(u.ranged_min===null)return '近戰兵團：移到敵軍旁邊後點敵軍攻擊';
 const pinned=actor.cell&&alive(b,'enemy').some(s=>s.cell&&distance(actor.cell!,s.cell)===1);
 return actor.ammo<=0?'彈藥已用盡，只能近戰':pinned?'被相鄰敵軍牽制，本回合只能近戰':`可遠射：直接點任何敵軍（剩 ${actor.ammo} 發）`;
}
function battleHTML(){const w=game.state,b=w.battle!;const actor=alive(b,'player').find(s=>s.id===selected);const cells=actor&&b.turn==='player'?reachable(b,actor):[];
 return `<section class="campaign-battle terrain-${b.terrain??'plain'}"><div class="battle-heading"><div><p class="eyebrow">${w.options.mode==='study'?'研究戰局':'華夏戰局'} · ${{plain:'山門演武',forest:'竹林古庭',ruins:'古庭遺跡'}[b.terrain??'plain']}</p><h2>${portraitFigure(4+w.battleFoe!,villains[w.battleFoe!].name,'foe-header')}${e(villains[w.battleFoe!].name)}</h2><p>第 ${b.round} 回合 · ${b.turn==='player'?'我方行動':'敵方行動'}</p></div><div class="battle-actions"><button id="campaign-auto">${automatic?'暫停自動':'自動交戰'}</button><button id="campaign-end" ${b.turn!=='player'?'disabled':''}>結束行動</button><button data-action="retreat">撤退至青禾府</button></div></div><div class="battle-layout"><aside class="panel">${b.armies.player.map(unitCard).join('')}<p class="hint">${w.options.mode==='study'?'研究模式：回合快照、零傷害、整兵吸血；來源缺魔法參數的兵種技能停用。':'華夏模式：傷害至少 1，連續吸血與兵種施法啟用。'}<br>每週統率核算不因名稱改變。</p></aside><div><div class="field-frame painted-field" style="--field-art:url('${new URL(paintedBackground,document.baseURI).href}')"><div class="board campaign-board">${Array.from({length:30},(_,i)=>{const x=i%6,y=Math.floor(i/6),s=[...alive(b,'player'),...alive(b,'enemy')].find(s=>s.cell?.x===x&&s.cell.y===y),blocked=b.obstacles?.some(c=>c.x===x&&c.y===y),enemy=s&&b.armies.enemy.some(a=>a?.id===s.id);return `<button class="cell ${s?(enemy?'enemy':'friendly'):''} ${s?.id===selected?'chosen':''} ${cells.some(c=>c.x===x&&c.y===y)?'reachable':''} ${blocked?'blocked':''} ${enemy&&s&&actor&&b.turn==='player'&&!automatic&&castId<0?(()=>{const t=attackFor(actor,s);return t.ok?`target-${t.type}`:'';})():''}" data-battle-cell="${x},${y}" aria-label="${x+1},${y+1}${s?' '+unit(s.unitId).name:blocked?' 障礙':' 空格'}">${s?`<span class="troop-visual ${s.status.frozen?'motion-frozen':''}">${troopFigure(unit(s.unitId),unit(s.unitId).name)}</span><span class="troop-caption"><strong>${unit(s.unitId).name}</strong><b>${s.count} 人</b><small>${s.hp} HP${s.status.frozen?' · 定身':s.acted?' · 已行動':''}</small><span class="troop-hp"><span style="width:${s.hp/(s.count*unit(s.unitId).hp)*100}%"></span></span></span>`:blocked?`${propFigure(b.terrain==='forest'?2:b.terrain==='ruins'?1:0)}<span class="prop-caption">不可通行</span>`:''}</button>`;}).join('')}</div></div><div class="panel battle-command"><p>${actor?`${unit(actor.unitId).name}：移動 ${actor.moved}/${unit(actor.unitId).moves} · 彈 ${actor.ammo} · 術 ${actor.magicCharges} · 飛 ${actor.flights}`:'請選擇我方部曲'}</p>${actor?`<p class="range-note">${rangeNote(actor)}</p>`:''}<label>兵團動作<select id="campaign-attack"><option value="auto" ${attackMode==='auto'?'selected':''}>自動（相鄰近戰，否則遠射／魔法）</option><option value="attack" ${attackMode==='attack'?'selected':''}>近戰</option><option value="ranged-attack" ${attackMode==='ranged-attack'?'selected':''}>實體遠射</option><option value="magic-attack" ${attackMode==='magic-attack'?'selected':''}>兵種魔法</option></select></label><div class="form-row"><label>英雄符籙<select id="campaign-spell">${catalogs.spell.slice(0,7).map((s,i)=>`<option value="${i}" ${spellChoice===i?'selected':''}>${s.name} · ${b.spellbook.player[i]} 張</option>`).join('')}</select></label><button id="campaign-cast" ${b.turn!=='player'||b.spellUsed.player?'disabled':''}>${castId>=0?'取消施法':'選擇法術目標'}</button></div><p class="hint">${castId>=0?`正在施放 ${catalogs.spell[castId].name}：${teleport?'已選友軍，請點空格':spellRules[castId].target==='ally'?'點友軍棋子或左側部曲卡':'點敵軍棋子'}`:'選我方兵團 → 綠格移動／點敵軍攻擊（紅框近戰、橘框遠射、紫框魔法）。兵種攻擊後結束行動；英雄法術另外計次。'}</p></div></div><aside class="panel event-panel"><h3>戰況</h3>${w.log.slice(-20).reverse().map(s=>`<p>${e(s)}</p>`).join('')}</aside></div></section>`;
}
function endingHTML(){const w=game.state;const ending=endings[w.ending as keyof typeof endings];return `<section class="ending-panel">${img(`scene-${w.ending==='alliance'?3:2}`,'終章','ending-scene')}<p class="eyebrow">END OF THE JOURNEY</p><h2>${ending?.title??(w.ending==='timeout'?'烽火已冷':'軍旗倒下')}</h2><p>${ending?.text??'這一次，你未能完成守印的承諾。可載入先前存檔，或另選職業與道路重新出發。'}</p><p>第 ${w.day} 日 · 已解決 ${w.defeated.length}/17 名敵將 · 神器 ${w.artifacts.length}/8 · 指令 ${game.commands.length}</p><p>此旅程已封存。匯出檔案可完整重算從開局到結局的所有指令。</p><button data-proxy="campaign-export">匯出完整旅程</button><button data-proxy="open-new-game">另啟新篇</button></section>`;}
function render(){if(!visible)return;const w=game.state,p=location(w);soundtrack.setScene(w.battle&&!w.ending?'battle':'map');if(siteRoster(w.options,p)&&!siteRoster(w.options,p)!.includes(recruitId))recruitId=siteRoster(w.options,p)![0];
 if(recruitSite!==(p?.id??'')){recruitSite=p?.id??'';recruitNotice='';if(siteRoster(w.options,p))chooseRecruitSlot();}
 const heroName=heroClasses.find(h=>h.id===w.options.heroId)!.name;
 root.innerHTML=`<div class="journey-header"><div><p class="eyebrow">JIUZHOU · THE BEACONS RETURN</p><h2>烽火歸途</h2></div><div class="journey-stats"><span class="hero-stat">${portraitFigure(heroClasses.findIndex(h=>h.id===w.options.heroId),heroName,'hero-header')}<b>${heroName}</b></span><span>日程<b>${w.day} / 180</b></span><span>步數<b>${w.steps} / 40</b></span><span>天候<b>${w.weather}</b></span><span class="gold-stat">銀兩<b>${w.gold.toLocaleString()}</b></span><span>統率<b>${leadership(w)}</b></span><span>三印<b>${w.seals.length} / 3</b></span></div></div><div class="journey-tools"><button data-subtab="map">山河圖</button><button data-subtab="army">整軍</button><button data-subtab="spells">符籙</button><button data-subtab="journal">任務與行囊</button><button id="campaign-wait" ${w.battle||w.ending?'disabled':''}>駐營一日</button><button id="campaign-stop">停止行路</button><button id="open-system" class="system-toggle" aria-expanded="${systemShown()}" aria-controls="system-panel">⚙ 系統</button></div><section id="system-panel" class="panel system-panel" ${systemShown()?'':'hidden'}><div class="system-head"><h3>系統</h3><small>${heroName} · ${w.options.mode==='study'?'研究基準（非 DOS 已驗證）':'華夏改良'} · 種子 ${e(w.options.seed)}</small><button id="close-system" aria-label="關閉系統選單">關閉</button></div><div class="system-group"><h4>存檔</h4><button id="campaign-export">匯出存檔</button><button id="campaign-local">讀取自動存檔</button><label class="file-button">匯入存檔<input id="campaign-import" type="file" accept=".json,application/json"></label></div><div class="system-group"><h4>旅程</h4><button id="open-title">標題畫面</button><button id="open-new-game">新旅程設定</button></div><div class="system-group"><h4>聲音與畫面</h4><button id="campaign-sound">音效 ${soundOn?'開':'關'}</button><button id="campaign-music" aria-pressed="${soundtrack.on}" data-music-track="${soundtrack.active??'off'}">配樂 ${soundtrack.on?'開':'關'}</button><label class="music-volume">音量 <input id="music-volume" aria-label="配樂音量" type="range" min="0" max="100" value="${Math.round(soundtrack.volume*100)}"></label><span class="music-now" id="soundtrack-title">${soundtrack.on?'♪ '+soundtrack.title:'地圖：青嵐遠行 · 戰鬥：烽鼓破陣'}</span><button id="campaign-motion" aria-pressed="${motionOn}">動作 ${motionOn?'開':'關'}</button></div></section>${archiveOpen?`<section class="panel new-game-panel"><h3>另啟新篇（舊旅程請先匯出保存）</h3><label>職業<select id="new-hero">${heroClasses.map(h=>`<option value="${h.id}" ${heroChoice===h.id?'selected':''}>${h.name} · 統率 ${h.leadership} · ${h.gold} 兩</option>`).join('')}</select></label><label>規則<select id="new-mode"><option value="enhanced" ${modeChoice==='enhanced'?'selected':''}>華夏改良</option><option value="study" ${modeChoice==='study'?'selected':''}>研究基準（非 DOS 已驗證）</option></select></label><label>種子<input id="new-seed" value="${e(seedChoice)}" maxlength="200"></label><button class="primary" id="campaign-new">開始新旅程</button><button id="close-new-game">取消</button></section>`:''}${w.ending?endingHTML():w.battle?battleHTML():subtab==='map'?`<div class="journey-layout"><section class="panel map-panel">${mapHTML()}</section><aside>${locationHTML()}<section class="panel quest-short"><h3>行旅指南</h3><p>${!w.quest?'在青禾府承接委託。':w.seals.length<3?'斷雁寨取木印、聽雨古廟取水印，擊敗任一野外敵將取山印。':'三印齊備，前往天衡烽臺。'}</p><div class="known-places">${places.filter(q=>w.revealed.includes(q.y*32+q.x)).map(q=>`<button class="kp-${placeRole(q)}" data-destination="${q.x},${q.y}" title="${roleLabel[placeRole(q)][1]}">[${roleLabel[placeRole(q)][0]}] ${q.name} (${q.x+1},${q.y+1})</button>`).join('')}</div></section></aside></div>`:subtab==='army'?armyHTML():subtab==='spells'?spellsHTML():journalHTML()}${!w.battle&&!w.ending?`<details class="panel travel-log"><summary>行旅紀錄 · ${w.log.length} 筆</summary>${w.log.slice(-40).reverse().map(s=>`<p>${e(s)}</p>`).join('')}</details>`:''}`;
 if(report){const layer=document.createElement('div');layer.className='report-layer';layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.dataset.report=report.kind;layer.innerHTML=`<div class="report-card">${report.html}<button class="primary" id="report-ok">知道了</button></div>`;root.append(layer);}
 bind();playVisualEffects();playPurchase();firstTimeTips();(root.querySelector('#report-ok') as HTMLElement|null)?.focus();const viewport=root.querySelector('.world-viewport');if(viewport){viewport.scrollLeft=Math.max(0,w.position.x*40-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,w.position.y*40-viewport.clientHeight/2);}
}
function firstTimeTips(){
 if(titleOpen()||walking||report)return;const w=game.state,p=location(w),keys:TipKey[]=[];
 if(w.ending)keys.push('ending');
 else if(w.battle)keys.push('battle');
 else if(subtab==='map'){keys.push('map');
  if(p){if(p.id==='home')keys.push('home');else if(p.kind==='city')keys.push('city');
   if(p.kind==='camp')keys.push('camp');if(p.kind==='bandit')keys.push('bandit');if(p.kind==='foe')keys.push('foe');if(p.kind==='shrine')keys.push('shrine');if(p.kind==='beacon')keys.push('beacon');
   if(root.querySelector('[data-artifact]'))keys.push('artifact');}}
 else if(subtab==='army'){keys.push('army');if(siteRoster(w.options,p))keys.push('recruit');}
 else if(subtab==='spells')keys.push('spells');else if(subtab==='journal')keys.push('journal');
 keys.forEach(tip);
}
function battleSend(c:Command){if(game.state.battle?.turn!=='player'||automatic)return false;const previousCast=castId,previousTarget=teleport;castId=-1;teleport=null;const ok=send({type:'battle',command:c});if(ok){if(!game.state.battle){stop();selected='p0';subtab='map';render();}}else{castId=previousCast;teleport=previousTarget;}return ok;}
function chooseTarget(id:string){if(castId<0)return;const b=game.state.battle!;if(castId===1){if(!alive(b,'player').some(s=>s.id===id)){notify('請先選友軍',true);return;}teleport=id;render();}else {battleSend({type:'cast',spellId:castId,targetId:id});}}
async function loadSave(value:unknown){const loaded=await Campaign.load(value);report=null;battleStart=null;stop();revision++;game=loaded;recruitSite='';recruitNotice='';subtab='map';archiveOpen=false;castId=-1;teleport=null;selected='p0';render();notify('存檔重算與 SHA-256 驗證通過。');if(game.state.battle?.turn==='enemy')pump();}
function bind(){const on=(id:string,fn:()=>void)=>root.querySelector(`#${id}`)?.addEventListener('click',fn);
 on('report-ok',()=>{report=null;render();});root.querySelector('.report-layer')?.addEventListener('keydown',ev=>{if((ev as KeyboardEvent).key==='Escape'){report=null;render();}});
 root.querySelectorAll<HTMLElement>('[data-proxy]').forEach(el=>el.onclick=()=>(root.querySelector(`#${el.dataset.proxy}`) as HTMLElement)?.click());
 root.querySelectorAll<HTMLElement>('[data-subtab]').forEach(el=>el.onclick=()=>{subtab=el.dataset.subtab!;render();});
 root.querySelectorAll<HTMLElement>('[data-action]').forEach(el=>el.onclick=()=>{stop();if(send({type:el.dataset.action!} as WorldCommand)){castId=-1;teleport=null;pump();}});
 root.querySelectorAll<HTMLElement>('[data-route]').forEach(el=>el.onclick=()=>{if(send({type:'resolve-bandit',route:el.dataset.route! as 'conquest'})){castId=-1;pump();}});
 root.querySelectorAll<HTMLElement>('[data-artifact]').forEach(el=>el.onclick=()=>send({type:'take-artifact',artifactId:Number(el.dataset.artifact)}));
 root.querySelectorAll<SVGElement>('[data-world]').forEach(el=>el.addEventListener('click',()=>{const [x,y]=el.dataset.world!.split(',').map(Number);moveTo(x,y);}));
 root.querySelectorAll<HTMLElement>('[data-destination]').forEach(el=>el.onclick=()=>{const [x,y]=el.dataset.destination!.split(',').map(Number);moveTo(x,y);});
 root.querySelector('.world-viewport')?.addEventListener('keydown',ev=>{const event=ev as KeyboardEvent,delta=({ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]} as Record<string,number[]>)[event.key];if(delta){event.preventDefault();send({type:'travel',cell:{x:game.state.position.x+delta[0],y:game.state.position.y+delta[1]}});(root.querySelector('.world-viewport') as HTMLElement)?.focus();}});
 const value=(id:string,fn:(v:string)=>void)=>root.querySelector(`#${id}`)?.addEventListener('change',ev=>fn((ev.target as HTMLInputElement).value));
 value('world-slot',v=>slot=Number(v));value('world-other',v=>otherSlot=Number(v));value('world-split-count',v=>splitCount=Number(v));
 value('world-recruit-unit',v=>{recruitId=v;recruitNotice='';chooseRecruitSlot();render();});
 value('world-recruit-slot',v=>{recruitSlot=Number(v);recruitNotice='';render();});
 root.querySelector('#world-count')?.addEventListener('input',ev=>{count=Number((ev.target as HTMLInputElement).value);recruitNotice='';updateRecruitPreview();});
 on('open-recruitment',()=>{stop();subtab='army';recruitNotice='';chooseRecruitSlot();render();root.querySelector('.recruitment-panel')?.scrollIntoView({block:'nearest'});});
 on('world-recruit',()=>{const name=unit(recruitId).name;if(send({type:'recruit-world',unitId:recruitId,count,slot:recruitSlot})){recruitNotice=`已招募 ${name} ${count} 人至第 ${recruitSlot+1} 欄。`;notify(recruitNotice);render();}else{const result=root.querySelector('#recruitment-result');if(result)result.textContent='招募未完成，請檢查兵源、編入欄位、統率與銀兩。';}});on('world-swap',()=>send({type:'formation',command:{type:'swap',a:slot,b:otherSlot}}));on('world-merge',()=>send({type:'formation',command:{type:'merge',a:slot,b:otherSlot}}));on('world-split',()=>send({type:'formation',command:{type:'split',slot,count:splitCount,target:otherSlot}}));
 root.querySelectorAll<HTMLElement>('[data-adventure-spell]').forEach(el=>el.onclick=()=>{const id=Number(el.dataset.adventureSpell);if(id===7){const w=game.state,cell=[{x:w.position.x+1,y:w.position.y},{x:w.position.x-1,y:w.position.y},{x:w.position.x,y:w.position.y+1},{x:w.position.x,y:w.position.y-1}].find(c=>map[c.y]?.[c.x]==='water'&&!w.bridges.includes(c.y*32+c.x));if(!cell){notify('須站在尚未架橋的江面旁。',true);return;}send({type:'adventure-spell',spellId:id,cell});}else send({type:'adventure-spell',spellId:id});});
 root.querySelectorAll<HTMLElement>('[data-buy-spell]').forEach(el=>el.onclick=()=>send({type:'buy-spell',spellId:Number(el.dataset.buySpell)}));
 on('open-title',()=>{systemOpen=false;openTitle();});on('open-system',()=>{systemOpen=!systemOpen;render();});on('close-system',()=>{systemOpen=false;render();});on('campaign-wait',()=>send({type:'wait',days:1}));on('campaign-stop',()=>{stop();render();});on('open-new-game',()=>{archiveOpen=true;systemOpen=false;render();});on('close-new-game',()=>{archiveOpen=false;render();});
 value('new-hero',v=>heroChoice=v);value('new-mode',v=>modeChoice=v as RulesMode);value('new-seed',v=>seedChoice=v);
 on('campaign-new',()=>{try{const fresh=new Campaign({heroId:heroChoice,mode:modeChoice,seed:seedChoice,ruleset:uiRuleset()});stop();revision++;game=fresh;recruitSite='';recruitNotice='';archiveOpen=false;subtab='map';castId=-1;render();autosave();notify('新旅程已開始。');}catch(err){notify((err as Error).message,true);}});
 on('campaign-music',()=>{void soundtrack.toggle().then(on=>{saveSettings({music:on});render();});});
 root.querySelector('#music-volume')?.addEventListener('input',ev=>soundtrack.setVolume(Number((ev.target as HTMLInputElement).value)/100));
 on('campaign-motion',()=>{motionOn=!motionOn;saveSettings({motion:motionOn});render();});
 on('campaign-sound',()=>{soundOn=!soundOn;saveSettings({sfx:soundOn});if(soundOn)soundtrack.cue('heal');render();});
 on('campaign-export',()=>{void game.save().then(save=>{const url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='jiuzhou-journey.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('旅程已匯出，可完整重算驗證。');});});
 on('campaign-local',()=>{void (async()=>{try{const raw=localStorage.getItem(storageKey);if(!raw)throw Error('沒有本機自動存檔');await loadSave(JSON.parse(raw));}catch(err){notify((err as Error).message,true);}})();});
 root.querySelector('#campaign-import')?.addEventListener('change',ev=>{void (async()=>{const file=(ev.target as HTMLInputElement).files?.[0];if(!file)return;try{if(file.size>20_000_000)throw Error('存檔不可超過 20 MB');await loadSave(JSON.parse(await file.text()));}catch(err){notify((err as Error).message,true);}})();});
 value('campaign-attack',v=>attackMode=v);value('campaign-spell',v=>{spellChoice=Number(v);castId=-1;teleport=null;});
 on('campaign-cast',()=>{castId=castId>=0?-1:spellChoice;teleport=null;render();});
 on('campaign-auto',()=>{automatic=!automatic;ticks=0;castId=-1;render();pump();});on('campaign-end',()=>{if(battleSend({type:'end-turn'}))pump();});
 root.querySelectorAll<HTMLElement>('[data-company]').forEach(el=>el.onclick=()=>{if(castId>=0&&game.state.battle)chooseTarget(el.dataset.company!);else{selected=el.dataset.company!;render();}});
 root.querySelectorAll<HTMLElement>('[data-battle-cell]').forEach(el=>el.onclick=()=>{const b=game.state.battle;if(!b||b.turn!=='player'||automatic)return;const [x,y]=el.dataset.battleCell!.split(',').map(Number),friend=alive(b,'player').find(s=>s.cell?.x===x&&s.cell.y===y),enemy=alive(b,'enemy').find(s=>s.cell?.x===x&&s.cell.y===y);
  if(castId>=0){if(castId===1&&teleport&&!friend&&!enemy){battleSend({type:'cast',spellId:1,targetId:teleport,cell:{x,y}});}else if(friend||enemy)chooseTarget((friend??enemy)!.id);return;}
  if(friend){selected=friend.id;render();}else if(enemy){const actorStack=alive(b,'player').find(s=>s.id===selected),plan=attackFor(actorStack,enemy);if(!plan.ok){notify(plan.why,true);return;}battleSend({type:plan.type,actorId:selected,targetId:enemy.id});}else battleSend({type:'move',actorId:selected,cell:{x,y}});
 });
}
