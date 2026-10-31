import {unit} from '../content/load';
import {seedToUint,randomInt} from './rng';
import type {State,Stack,Team,Cell,Command,Event,Result,ScenarioId} from './types';
import {hasAbility,magicProfile,damageStack,healStack,recoverAfterHit,MAX_COUNT} from './abilities';
import {modifiedDamage} from './modifiers';
import {castSpell} from './spells';
export {MAX_COUNT} from './abilities';
export const rulesetVersion='research/abilities-v0.2.0';
export function integer(n:number,min=0,max=MAX_COUNT):number {
 if(!Number.isSafeInteger(n)||n<min||n>max) throw Error('數值必須是範圍內的安全整數');
 return n;
}
function slot(n:number){return integer(n,0,4);}
export function makeStack(id:string,unitId:string,count:number):Stack {
 const u=unit(unitId);integer(count,1);
 const s:Stack={id,unitId,count,hp:count*u.hp,maxCount:count,ammo:u.ammo,magicCharges:0,flights:0,cell:null,moved:0,acted:false,retaliated:false,status:{}};
 s.magicCharges=magicProfile(s)?.charges??0;s.flights=hasAbility(s,'fly')?2:0;return s;
}
export function initialState(seed='demo-2026',scenarioId:ScenarioId='skirmish'):State {
 if(scenarioId!=='skirmish'&&scenarioId!=='abilities')throw Error('未知試煉場');
 if(typeof seed!=='string'||!seed.trim()||seed.length>200) throw Error('種子須為 1–200 字元');
 let player=[makeStack('p0','xiang_yong',20),makeStack('p1','yu_lin_gong_shou',6),makeStack('p2','shan_lang',10),null,null];
 let enemy=[makeStack('e0','xiang_yong',16),makeStack('e1','lang_ya_nu_shou',6),makeStack('e2','shan_lang',8),null,null];
 if(scenarioId==='abilities'){
  player=[makeStack('p0','zhi_he_ling',30),makeStack('p1','you_hun',8),makeStack('p2','shu_kui',4),makeStack('p3','zhu_you_wu_yi',4),makeStack('p4','shi_xue_mei',5)];
  enemy=[makeStack('e0','yu_feng_fang_shi',3),makeStack('e1','shan_yue_li_shi',3),makeStack('e2','xiu_luo_gui_jiang',2),makeStack('e3','chi_yan_jiao_long',1),makeStack('e4','bai_gu_bing',25)];
 }
 return {seed,scenarioId,spellbook:{player:Array(7).fill(2),enemy:Array(7).fill(2)},spellUsed:{player:false,enemy:false},rng:seedToUint(seed),phase:'setup',turn:'player',round:1,winner:null,armies:{player,enemy},gold:10000,leadership:100,nextId:0};
}
export function control(s:Stack,leadership:number){return {required:s.count*unit(s.unitId).hp,over:s.count*unit(s.unitId).hp>leadership};}
export function alive(state:State,team:Team){return state.armies[team].filter((s):s is Stack=>!!s&&s.hp>0);}
export function distance(a:Cell,b:Cell){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
export function inBounds(c:Cell){return c&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.x<6&&c.y>=0&&c.y<5;}
export function stackById(state:State,id:string):Stack {
 const s=[...state.armies.player,...state.armies.enemy].find(s=>s?.id===id&&s.hp>0);
 if(!s) throw Error('兵團不存在或已陣亡');
 return s;
}
export function owner(state:State,id:string):Team {return state.armies.player.some(s=>s?.id===id)?'player':'enemy';}
export function reachable(state:State,s:Stack):Cell[] {
 if(!s.cell||s.acted||s.status.frozen) return [];
 const budget=unit(s.unitId).moves-s.moved;
 const occupied=new Set([...alive(state,'player'),...alive(state,'enemy')].filter(x=>x.id!==s.id).map(x=>`${x.cell!.x},${x.cell!.y}`));
 if(hasAbility(s,'fly'))return s.flights>0?Array.from({length:30},(_,i)=>({x:i%6,y:Math.floor(i/6)})).filter(c=>!(c.x===s.cell!.x&&c.y===s.cell!.y)&&!occupied.has(`${c.x},${c.y}`)&&!(state.obstacles??[]).some(o=>o.x===c.x&&o.y===c.y)):[];
 for(const c of state.obstacles??[])occupied.add(`${c.x},${c.y}`);
 const visited=new Set([`${s.cell.x},${s.cell.y}`]);const queue=[{...s.cell,steps:0}];const cells:Cell[]=[];
 for(let i=0;i<queue.length;i++){
  const c=queue[i];if(c.steps>=budget) continue;
  for(const n of [{x:c.x-1,y:c.y},{x:c.x+1,y:c.y},{x:c.x,y:c.y-1},{x:c.x,y:c.y+1}]){
   const k=`${n.x},${n.y}`;
   if(!inBounds(n)||occupied.has(k)||visited.has(k)) continue;
   visited.add(k);cells.push(n);queue.push({...n,steps:c.steps+1});
  }
 }
 return cells;
}
function pathLength(state:State,s:Stack,to:Cell):number {
 if(hasAbility(s,'fly')){if(reachable(state,s).some(c=>c.x===to.x&&c.y===to.y))return 0;throw Error('飛行次數不足或落點被佔用');}
 const u=unit(s.unitId);const original=s.moved;
 // The first budget that reaches a cell is its shortest unobstructed path length.
 for(let n=1;n<=u.moves-original;n++) if(reachable(state,{...s,moved:u.moves-n}).some(c=>c.x===to.x&&c.y===to.y))return n;
 throw Error('超出步數或路徑被兵團阻擋');
}
function requireFull(s:Stack){if(s.hp!==s.count*unit(s.unitId).hp||Object.keys(s.status).length) throw Error('合併／拆分僅允許滿血且無狀態的部隊');}
export function applyCommand(input:State,command:Command):Result {
 const state=structuredClone(input);const events:Event[]=[];
 const log=(type:string,text:string)=>events.push({type,text});
 if(state.phase==='finished') throw Error('戰鬥已結束');
 if(['swap','merge','split','recruit'].includes(command.type)) {
  if(state.phase!=='setup') throw Error('只能在整軍階段調整部隊');
  const a=state.armies.player;
  if(command.type==='swap'){
   slot(command.a);slot(command.b);[a[command.a],a[command.b]]=[a[command.b],a[command.a]];log('swap',`交換第 ${command.a+1}、${command.b+1} 隊`);
  } else if(command.type==='merge'){
   slot(command.a);slot(command.b);if(command.a===command.b)throw Error('不能合併同一欄');
   const src=a[command.a],dst=a[command.b];if(!src||!dst||src.unitId!==dst.unitId)throw Error('須選擇兩隊相同兵種');
   requireFull(src);requireFull(dst);integer(src.count+dst.count,1);
   // Preserve ammunition conservatively; merging cannot refill it.
   dst.count+=src.count;dst.hp+=src.hp;dst.ammo=Math.min(src.ammo,dst.ammo);a[command.a]=null;log('merge','同型滿血部隊已合併');
  }else if(command.type==='split'){
   slot(command.slot);slot(command.target);integer(command.count,1);
   const src=a[command.slot];if(!src||a[command.target]||command.count>=src.count)throw Error('拆分需空欄且兵數小於原隊');
   requireFull(src);const part=makeStack(`n${state.nextId++}`,src.unitId,command.count);part.ammo=src.ammo;
   src.count-=command.count;src.hp=src.count*unit(src.unitId).hp;a[command.target]=part;log('split',`拆出 ${command.count} 人`);
  }else if(command.type==='recruit'){
   slot(command.slot);integer(command.count,1);const u=unit(command.unitId);const dst=a[command.slot];
   if(dst&&dst.unitId!==u.id)throw Error('此欄已有不同兵種');
   if(dst)requireFull(dst);integer((dst?.count??0)+command.count,1);
   const cost=u.gold*command.count;if(cost>state.gold)throw Error('銀兩不足');
   // Sandbox camp has unlimited supply; no world recruitment claim is made.
   state.gold-=cost;
   if(dst){dst.count+=command.count;dst.hp+=command.count*u.hp;}else a[command.slot]=makeStack(`n${state.nextId++}`,u.id,command.count);
   log('recruit',`招募 ${u.name} ${command.count} 人，支出 ${cost} 兩`);
  }
  return {state,events};
 }
 if(command.type==='start'){
  if(state.phase!=='setup'||!alive(state,'player').length||!alive(state,'enemy').length)throw Error('雙方都必須有部隊');
  for(const team of ['player','enemy'] as Team[])state.armies[team].forEach((s,y)=>{if(s){s.cell={x:team==='player'?0:5,y};s.maxCount=s.count;if(state.rulesMode){s.turnCount=s.count;if(state.rulesMode==='study')s.magicCharges=0;}}});
  state.phase='battle';log('start',`開戰：種子 ${state.seed}；研究沙盒，未驗證規則採新作暫行規則`);return {state,events};
 }
 if(state.phase!=='battle') throw Error('請先開始戰鬥');
 if(command.type==='end-turn'){
  for(const s of alive(state,state.turn))if(s.status.frozen){delete s.status.frozen;log('thaw',`${unit(s.unitId).name} 定身解除`);}
  state.turn=state.turn==='player'?'enemy':'player';
  if(state.turn==='player'){
   state.round++;for(const t of ['player','enemy'] as Team[])for(const s of alive(state,t))s.retaliated=false;
  }
  state.spellUsed[state.turn]=false;
  for(const s of alive(state,state.turn)){s.moved=0;s.acted=false;if(state.rulesMode)s.turnCount=s.count;s.flights=hasAbility(s,'fly')?2:0;
   if(hasAbility(s,'regen')&&state.rulesMode!=='study'){const healed=healStack(s,s.count*unit(s.unitId).hp-s.hp,s.count*unit(s.unitId).hp);if(healed)events.push({type:'regen',actorId:s.id,amount:healed,text:`${unit(s.unitId).name} 再生 ${healed} HP，未復活陣亡者`});}
  }
  if(state.rulesMode==='study'&&state.turn==='player')for(const t of ['player','enemy'] as Team[])for(const s of alive(state,t))if(hasAbility(s,'regen')){const healed=healStack(s,s.count*unit(s.unitId).hp-s.hp,s.count*unit(s.unitId).hp);if(healed)events.push({type:'regen',actorId:s.id,amount:healed,text:`${unit(s.unitId).name} 輪首再生 ${healed} HP`});}
  log('turn',`第 ${state.round} 回合・${state.turn==='player'?'我方':'敵方'}行動`);return {state,events};
 }
 if(command.type==='cast'){events.push(...castSpell(state,command));checkVictory(state,events);return {state,events};}
 if(command.type!=='move'&&command.type!=='attack'&&command.type!=='ranged-attack'&&command.type!=='magic-attack')throw Error('未知指令');
 const actor=stackById(state,command.actorId);
 if(owner(state,actor.id)!==state.turn||actor.acted||actor.status.frozen)throw Error('非此隊行動時間，或已完成攻擊');
 if(command.type==='move'){
  if(!inBounds(command.cell))throw Error('座標超出戰場');
  const steps=pathLength(state,actor,command.cell);actor.cell={...command.cell};actor.moved+=steps;
  if(hasAbility(actor,'fly')){actor.flights--;if(actor.flights===0)actor.acted=true;log('fly',`${unit(actor.unitId).name} 飛至 (${actor.cell.x+1},${actor.cell.y+1})，餘 ${actor.flights} 次飛行`);}else log('move',`${unit(actor.unitId).name} 移至 (${actor.cell.x+1},${actor.cell.y+1})，消耗 ${steps} 步`);
 }else{
  const target=stackById(state,command.targetId);
  if(owner(state,target.id)===state.turn)throw Error('不能攻擊友軍');
  const magic=command.type==='magic-attack';
  const ranged=command.type==='ranged-attack'||magic;
  if(ranged){
   if(magic){if(!magicProfile(actor,state.rulesMode)||actor.magicCharges<=0)throw Error('此隊無施法能力或魔法次數耗盡');}
   else if(actor.ammo<=0||unit(actor.unitId).ranged_min===null)throw Error('此隊無遠射或彈藥耗盡');
   const other=state.turn==='player'?'enemy':'player';
   if(alive(state,other).some(s=>distance(actor.cell!,s.cell!)===1))throw Error('被相鄰敵軍牽制，不能遠射或施法');
   if(magic){actor.magicCharges--;}else actor.ammo--;
  }else if(distance(actor.cell!,target.cell!)!==1)throw Error('近戰須正交相鄰');
  actor.acted=true;
  if(magic&&hasAbility(target,'immune')){events.push({type:'immune',actorId:actor.id,targetId:target.id,text:`${unit(target.unitId).name} 免疫兵種魔法；已消耗施法者一次行動與技能次數`});return {state,events};}
  function hit(a:Stack,b:Stack,kind:string,isRanged=false,isMagic=false){
   const au=unit(a.unitId),bu=unit(b.unitId);let extra=0;
   if(hasAbility(a,'scythe')&&!isRanged){
    const [roll,next]=randomInt(state.rng,1,100);state.rng=next;
    if(roll>=90){extra=Math.ceil(b.count/2)*bu.hp;events.push({type:'scythe',actorId:a.id,targetId:b.id,roll,text:`${au.name} 斬魂觸發（${roll}/100），額外傷害 ${extra}`});}
   }
   let base:number;
   if(isMagic)base=magicProfile(a)!.base;
   else {const [roll,next]=randomInt(state.rng,isRanged?au.ranged_min!:au.melee_min,isRanged?au.ranged_max!:au.melee_max);state.rng=next;base=roll;}
   const count=state.rulesMode==='study'?(a.turnCount??a.count):a.count;
   const raw=modifiedDamage(state,a,b,Math.floor(count*base*(au.skill+5-bu.skill)/10),isRanged)+extra;
   const info=damageStack(b,raw);
   events.push({type:kind,actorId:a.id,targetId:b.id,...info,text:`${au.name} ${kind==='retaliate'?'反擊':isMagic?'魔法攻擊':isRanged?'遠射':'攻擊'} ${bu.name}：${info.damage} 傷害，${info.deaths} 人陣亡，餘 ${b.hp} HP`});
   if(!isRanged)events.push(...recoverAfterHit(a,info.damage,info.deaths,state.rulesMode));
  }
  hit(actor,target,magic?'magic-attack':'attack',ranged,magic);
  if(!ranged&&target.hp>0&&!target.retaliated&&!target.status.frozen){target.retaliated=true;hit(target,actor,'retaliate');}
  checkVictory(state,events);
 }
 return {state,events};
}
function checkVictory(state:State,events:Event[]){
 if(!alive(state,'player').length||!alive(state,'enemy').length){state.winner=alive(state,'player').length?'player':'enemy';state.phase='finished';events.push({type:'victory',text:state.winner==='player'?'我方勝利':'敵方勝利'});}
}
