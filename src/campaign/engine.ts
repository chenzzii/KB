import {units,unit} from '../content/load';
import {applyCommand,initialState,makeStack,integer,alive} from '../core/engine';
import {hasAbility} from '../core/abilities';
import {balance,heroClasses,places,map,villains} from './content';
import type {World,Options,WorldCommand} from './types';
import type {Stack} from '../core/types';
export const campaignVersion='campaign-1.0.0';
export function location(w:World){return places.find(p=>p.x===w.position.x&&p.y===w.position.y);}
export function leadership(w:World){return (w.leadership+w.leadershipBuff)*(w.artifacts.includes(2)?2:1);}
export function upkeep(w:World){return w.army.reduce((n,s)=>n+(s?s.count*Math.floor(unit(s.unitId).gold/10):0),0);}
export function spellCap(w:World){return (4+Math.floor(w.defeated.length/3))*(w.artifacts.includes(6)?2:1);}
function reveal(w:World){const set=new Set(w.revealed);for(let y=Math.max(0,w.position.y-4);y<=Math.min(31,w.position.y+4);y++)for(let x=Math.max(0,w.position.x-4);x<=Math.min(31,w.position.x+4);x++)set.add(y*32+x);w.revealed=[...set].sort((a,b)=>a-b);const p=location(w);if(p&&!w.visited.includes(p.id)){w.visited.push(p.id);w.log.push(`發現 ${p.name}。`);}}
function restock(w:World){for(const p of places)if(p.units){const stock=w.supplies[p.id]??={};for(const id of p.units){const key=units[id].id;stock[key]=Math.min(100,(stock[key]??0)+balance.weeklySupply);}}}
export function newWorld(options:Options):World{
 if(options.mode!=='study'&&options.mode!=='enhanced')throw Error('未知規則模式');
 const hero=heroClasses.find(h=>h.id===options.heroId);if(!hero)throw Error('未知英雄職業');initialState(options.seed);
 const army:(Stack|null)[]=Array(5).fill(null);hero.army.forEach(([id,count],i)=>army[i]=makeStack(`hero-${i}`,units[id].id,count));
 const w:World={nextId:0,options:{...options},position:{x:4,y:5},day:1,steps:0,gold:hero.gold,leadership:hero.leadership,commission:hero.commission,spellPower:hero.power,army,spellbook:Array(14).fill(balance.startingSpellCharges),artifacts:[],visited:[],revealed:[],bridges:[],frozenTime:0,leadershipBuff:0,boat:false,weather:'晴',supplies:{},quest:false,route:null,seals:[],defeated:[],claimed:[],relations:{court:0,jianghu:0,spirits:0},battle:null,battleFoe:null,ending:null,log:['你抵達青禾府。先接受三印委託，再前往柳灣鄉營補員。所有地圖、劇情與戰役平衡均為原創新作。']};
 restock(w);reveal(w);return w;
}
function spend(w:World,n:number){if(w.gold<n)throw Error('銀兩不足');w.gold-=n;}
function tick(w:World,days:number){
 for(let i=0;i<days&&!w.ending;i++){
  w.day++;w.weather=(['晴','雨','晴','霧','晴'] as const)[Math.floor(w.day/2)%5];
  if(w.day>balance.deadlineDays){w.ending='timeout';w.log.push('百八十日已過，烽火盡滅。這一段旅程以失敗告終。');break;}
  if((w.day-1)%balance.daysPerWeek===0){
   const income=Math.floor(w.commission*(w.artifacts.includes(3)?1.5:1));w.gold+=income;const wage=upkeep(w),boat=w.boat?(w.artifacts.includes(7)?100:500):0;
   const due=wage+boat;w.log.push(`第 ${Math.floor((w.day-1)/5)+1} 週：俸祿 +${income}，軍餉 ${wage}，船費 ${boat}。`);
   if(w.gold>=due)w.gold-=due;else{
    w.gold=0;w.log.push('欠餉：華夏模式各隊離去一成；研究模式只警告，欠餉行為未核實。');
    if(w.options.mode==='enhanced')for(const s of w.army)if(s){s.count=Math.max(0,s.count-Math.ceil(s.count/10));s.hp=Math.min(s.hp,s.count*unit(s.unitId).hp);}
   }
   restock(w);
  }
 }
 w.army=w.army.map(s=>s&&s.count>0?s:null);
 if(!w.army.some(Boolean)&&!w.ending){w.ending='defeat';w.log.push('部曲散盡，旅程結束。');}
}
export function passable(w:World,x:number,y:number){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=32||y>=32)return false;
 const t=map[y][x];if(t==='mountain')return false;
 return t!=='water'||w.boat||w.bridges.includes(y*32+x);
}
export function pathTo(w:World,x:number,y:number){
 if(!passable(w,x,y))return [];
 const q=[w.position],seen=new Set([w.position.y*32+w.position.x]),prev=new Map<number,number>();
 for(let i=0;i<q.length;i++){const c=q[i];if(c.x===x&&c.y===y){let k=y*32+x;const path=[];while(prev.has(k)){path.unshift({x:k%32,y:Math.floor(k/32)});k=prev.get(k)!;}return path;}
  for(const n of [{x:c.x+1,y:c.y},{x:c.x-1,y:c.y},{x:c.x,y:c.y+1},{x:c.x,y:c.y-1}]){const k=n.y*32+n.x;if(!passable(w,n.x,n.y)||seen.has(k))continue;seen.add(k);prev.set(k,c.y*32+c.x);q.push(n);}
 }
 return [];
}
function beginBattle(w:World,foe:number){
 if(w.defeated.includes(foe))throw Error('此敵將已被解決');
 if(foe===16&&(!w.quest||w.seals.length<3))throw Error('須先接受委託並尋回三印');
 const s=initialState(`${w.options.seed}/foe-${foe}/day-${w.day}`);
 s.armies.player=w.army.map((a,i)=>{if(!a)return null;const fresh=makeStack(`p${i}`,a.unitId,a.count);fresh.hp=a.hp;return fresh;});
 const army=villains[foe].army;
 s.armies.enemy=army.map((a,i)=>makeStack(`e${i}`,a.unitId,Math.max(balance.minimumEnemyStack,Math.ceil(a.count/balance.encounterDivisor))));
 s.rulesMode=w.options.mode;s.powers={player:w.artifacts.filter(a=>a!==5),enemy:[]};
 const power=w.spellPower*(w.artifacts.includes(4)?2:1);s.spellPower={player:power,enemy:1};s.spellbook={player:w.spellbook.slice(0,7),enemy:Array(7).fill(0)};
 s.leadership=leadership(w);s.gold=w.gold;s.terrain=foe%3===0?'forest':foe%3===1?'plain':'ruins';
 s.obstacles=s.terrain==='plain'?[]:[{x:2,y:1},{x:3,y:3}];
 w.battle=applyCommand(s,{type:'start'}).state;w.battleFoe=foe;w.log.push(`與 ${villains[foe].name} 開戰。戰役兵數為獨立平衡檔縮放，基準兵種屬性不變。`);
}
function win(w:World,foe:number){
 if(!w.defeated.includes(foe))w.defeated.push(foe);w.leadership+=balance.victoryLeadership;
 w.spellPower=heroClasses.find(h=>h.id===w.options.heroId)!.power+Math.floor(w.defeated.length/3);
 if(foe===0&&!w.seals.includes('wood'))w.seals.push('wood');
 if(foe>0&&foe<16&&!w.seals.includes('stone')){w.seals.push('stone');w.log.push('你從失落軍印中找回山印，三印之一。');}
 w.log.push(`取得討伐憑證，統率 +${balance.victoryLeadership}。返回任一城鎮領賞。`);
}
export function applyWorld(input:World,c:WorldCommand):World{
 const w=structuredClone(input);if(w.ending)throw Error('此旅程已結束，請讀取先前存檔或另開新局');
 if(w.battle){
  if(c.type==='battle'){
   const result=applyCommand(w.battle,c.command);w.battle=result.state;w.log.push(...result.events.map(e=>e.text));
   if(w.battle.phase==='finished'){
    w.spellbook.splice(0,7,...w.battle.spellbook.player);
    if(w.battle.winner==='player'){w.army=w.battle.armies.player.map(a=>a&&a.count>0?{...a,cell:null,status:{}}:null);win(w,w.battleFoe!);w.battle=null;w.battleFoe=null;tick(w,1);}
    else {w.ending='defeat';w.log.push('最後的軍旗倒下，此役與旅程告終。');}
   }
  }else if(c.type==='retreat'){
   w.army=w.battle.armies.player.map(a=>a&&a.count>0?{...a,count:Math.max(1,Math.floor(a.count*0.8)),hp:Math.max(1,Math.floor(a.count*0.8))*unit(a.unitId).hp,cell:null,status:{}}:null);
   w.spellbook.splice(0,7,...w.battle.spellbook.player);w.battle=null;w.battleFoe=null;w.position={x:4,y:5};tick(w,2);w.log.push('撤回青禾府，損失兩成存活兵員並耗時兩日。');
  }else throw Error('戰鬥期間只能下達戰鬥指令或撤退');
  return w;
 }
 const p=location(w);
 if(c.type==='travel'){
  const {x,y}=c.cell;if(!passable(w,x,y)||Math.abs(x-w.position.x)+Math.abs(y-w.position.y)!==1)throw Error('只能移動至相鄰可通行格');
  w.position={x,y};const t=map[y][x],cost=t==='forest'||t==='marsh'||w.weather==='雨'?2:1;
  if(w.frozenTime>0)w.frozenTime--;else {w.steps+=cost;while(w.steps>=balance.stepsPerDay){w.steps-=balance.stepsPerDay;tick(w,1);}}
  reveal(w);
 }else if(c.type==='wait'){integer(c.days,1,30);tick(w,c.days);w.log.push(`駐營 ${c.days} 日。`);
 }else if(c.type==='accept'){
  if(p?.id!=='home'||w.quest)throw Error('請在青禾府接受尚未承接的委託');w.quest=true;w.log.push('委託「山河三印」：斷雁寨取木印、聽雨古廟取水印、擊敗任一野外敵將取山印；再前往天衡烽臺。');
 }else if(c.type==='resolve-bandit'){
  if(p?.id!=='bandit'||!w.quest||w.route)throw Error('請先接委託，並在斷雁寨選擇尚未決定的道路');
  if(!['conquest','alliance','trade'].includes(c.route))throw Error('未知抉擇');
  if(c.route==='conquest'){w.route=c.route;w.relations.court+=2;w.relations.spirits--;beginBattle(w,0);}
  else {spend(w,Math.floor((c.route==='alliance'?500:1000)*(w.options.mode==='enhanced'&&w.artifacts.includes(5)?0.75:1)));w.route=c.route;w.seals.push('wood');w.relations.jianghu+=2;if(c.route==='alliance')w.relations.spirits+=2;w.log.push(c.route==='alliance'?'山寨接受招安盟約，交出木印；討伐與交易路線關閉。':'你買下糧路通行權與木印；招安與討伐路線關閉。');tick(w,1);}
 }else if(c.type==='shrine'){
  if(p?.id!=='shrine'||!w.quest||w.seals.includes('water'))throw Error('此處沒有尚未完成的守夜');w.seals.push('water');if(!w.artifacts.includes(1))w.artifacts.push(1);w.relations.spirits++;tick(w,1);w.log.push('守夜後取回水印與玄武甲，妖靈認可你的承諾。');
 }else if(c.type==='fight'){
  if(p?.foe===undefined)throw Error('此處沒有敵將');if(p.id==='bandit'&&w.route!=='conquest')throw Error('斷雁寨須先選擇討伐／招安／交易');beginBattle(w,p.foe);
 }else if(c.type==='claim'){
  if(p?.kind!=='city')throw Error('須在城鎮領賞');const list=w.defeated.filter(id=>!w.claimed.includes(id));if(!list.length)throw Error('沒有待領賞金');
  for(const id of list){const reward=Math.max(500,Math.floor(villains[id].baselineRewardGold/5));w.gold+=reward;w.claimed.push(id);w.log.push(`${villains[id].name} 賞金 +${reward} 兩。`);}
 }else if(c.type==='rest'){
  if(p?.kind!=='city')throw Error('只能在城鎮休整');spend(w,100);tick(w,1);for(const a of w.army)if(a){a.hp=a.count*unit(a.unitId).hp;a.ammo=unit(a.unitId).ammo;}w.log.push('客棧休整：存活兵員傷勢痊癒，不能復活陣亡者。');
 }else if(c.type==='boat'){
  if(p?.id!=='east'||w.boat)throw Error('須在望潮城租用尚未租用的船');spend(w,w.artifacts.includes(7)?100:500);w.boat=true;w.log.push('已租船，可渡江；每週另扣船費。');
 }else if(c.type==='recruit-world'){
  integer(c.count,1);integer(c.slot,0,4);if(!p?.units?.some(id=>units[id].id===c.unitId))throw Error('此據點不供應該兵種');
  if((p.id==='ghost'||p.id==='wild')&&w.relations.spirits<0)throw Error('妖靈關係敵對，須先在古廟守夜修復關係');
  const u=unit(c.unitId),stock=w.supplies[p.id][u.id];if(c.count>stock)throw Error('據點兵源不足，等待週次補充');
  const dst=w.army[c.slot];if(dst&&dst.unitId!==u.id)throw Error('目標欄已有不同兵種');integer((dst?.count??0)+c.count,1);
  if((dst?.count??0)*u.hp+c.count*u.hp>leadership(w))throw Error('招募後此隊超出統率，請先提高統率或選擇空欄分隊');
  spend(w,c.count*u.gold);w.supplies[p.id][u.id]-=c.count;
  if(dst){dst.count+=c.count;dst.hp+=c.count*u.hp;dst.maxCount=dst.count;}else w.army[c.slot]=makeStack(`world-${w.nextId++}`,u.id,c.count);
  w.log.push(`${p.name} 招募 ${u.name} ${c.count} 人，花費 ${c.count*u.gold} 兩。`);
 }else if(c.type==='formation'){
  if(!['swap','merge','split'].includes(c.command.type))throw Error('冒險整軍只允許交換、合併與拆分');const s=initialState(w.options.seed);s.nextId=w.nextId;s.armies.player=w.army;const result=applyCommand(s,c.command);w.army=result.state.armies.player;w.nextId=result.state.nextId;
 }else if(c.type==='buy-spell'){
  integer(c.spellId,0,13);if(p?.kind!=='city')throw Error('須在城鎮符坊購買');const price=balance.heroSpellPrices[c.spellId];if(price===null)throw Error('渡厄真言價格衝突，暫停販售；可使用初始符籙');if(w.spellbook[c.spellId]>=spellCap(w))throw Error('已達法術攜帶上限');spend(w,price);w.spellbook[c.spellId]++;w.log.push('購得一道符籙。');
 }else if(c.type==='adventure-spell'){
  integer(c.spellId,7,13);if(w.spellbook[c.spellId]<=0)throw Error('此術沒有符籙');const id=c.spellId;
  if(id===7){const cell=c.cell;if(!cell||!Number.isInteger(cell.x)||!Number.isInteger(cell.y)||cell.x<0||cell.x>31||cell.y<0||cell.y>31||Math.abs(cell.x-w.position.x)+Math.abs(cell.y-w.position.y)!==1||map[cell.y][cell.x]!=='water'||w.bridges.includes(cell.y*32+cell.x))throw Error('架橋只能選擇相鄰且尚無橋梁的江面');w.bridges.push(cell.y*32+cell.x);}
  if(id===8)w.frozenTime+=40;
  if(id===9){const next=places.find(q=>q.foe!==undefined&&!w.defeated.includes(q.foe)&&q.id!=='bandit');if(!next)throw Error('已無待尋敵將');for(let y=next.y-1;y<=next.y+1;y++)for(let x=next.x-1;x<=next.x+1;x++)if(!w.revealed.includes(y*32+x))w.revealed.push(y*32+x);w.log.push(`羅盤指向 ${next.name}（${next.x+1},${next.y+1}）。`);}
  if(id===10||id===11){const target=id===10?'south':'home';if(!w.visited.includes(target))throw Error('尚未造訪該城，無法使用歸返術');const dest=places.find(q=>q.id===target)!;w.position={x:dest.x,y:dest.y};reveal(w);}
  if(id===12){const id='xiang_yong';const slot=w.army.findIndex(a=>a?.unitId===id||!a);if(slot<0)throw Error('沒有同型隊伍或空欄');const a=w.army[slot],count=(a?.count??0)+10;if(count*unit(id).hp>leadership(w))throw Error('召兵後超過統率');if(a){a.count=count;a.hp+=20;a.maxCount=count;}else w.army[slot]=makeStack(`summon-${w.nextId++}`,id,10);}
  if(id===13)w.leadershipBuff+=50;
  w.spellbook[id]--;w.log.push(`施放第 ${id+1} 道冒險法術。`);
 }else if(c.type==='take-artifact'){
  integer(c.artifactId,0,7);if(w.artifacts.includes(c.artifactId))throw Error('神器已在行囊');const sites=['bandit','shrine','foe-4','home','foe-9','forest','ghost','east'];
  if(p?.id!==sites[c.artifactId]||c.artifactId===0&&!w.route||p.foe!==undefined&&!w.defeated.includes(p.foe)&&p.kind!=='bandit')throw Error('此處沒有可取得的神器，或守衛尚在');
  if(c.artifactId===0&&w.route==='conquest'&&!w.defeated.includes(0))throw Error('須先擊敗斷雁寨守軍');
  if(c.artifactId===2&&w.defeated.length<2)throw Error('須至少解決兩名敵將');w.artifacts.push(c.artifactId);w.log.push(`取得第 ${c.artifactId+1} 件神器，其效果已啟用。`);
 }else if(c.type==='occupy'){
  if(p?.kind!=='city'||p.id==='home'||w.visited.includes(`held:${p.id}`))throw Error('此城不可再占領');if(w.route!=='conquest')throw Error('只有討伐路線能占領城關');spend(w,1000);w.visited.push(`held:${p.id}`);w.commission+=500;w.relations.court++;w.relations.spirits--;w.log.push(`占領 ${p.name}，每週俸祿 +500。`);
 }else if(c.type==='finish'){
  if(p?.id!=='beacon'||!w.quest||w.seals.length<3||!w.route)throw Error('請帶三印抵達天衡烽臺');
  if(!w.defeated.includes(16)){if(w.route==='conquest')throw Error('討伐路線須先擊敗守印龍主');spend(w,2000);w.log.push('你以盟約與贖金換取龍主守印，避免最後一戰。');}
  w.ending=w.route;w.log.push('三印合一，烽火再燃。');
 }else throw Error('未知旅程指令');
 return w;
}
