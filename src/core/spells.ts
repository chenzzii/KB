import {catalogs,unit} from '../content/load';
import {damageStack,healStack,hasAbility,MAX_COUNT} from './abilities';
import type {State,Command,Event} from './types';
export const spellRules = [
 {effect:'clone',target:'ally',description:'增加 10 名滿血兵，保留殘傷並提高回復上限；最多 1,000,000 人。'},
 {effect:'teleport',target:'ally',description:'將友軍傳送到任意空格，不消耗移動步數，不重置行動與狀態。'},
 {effect:'damage',target:'enemy',description:'造成固定 25 HP 火系傷害；免疫單位無效。',damage:25},
 {effect:'damage',target:'enemy',description:'造成固定 10 HP 雷系傷害；免疫單位無效。',damage:10},
 {effect:'freeze',target:'enemy',description:'敵軍下次己方行動無法移動、攻擊或反擊，該方行動結束後解除。'},
 {effect:'resurrect',target:'ally',description:'回復 100 HP，可復活至此隊戰中生命上限；全滅部隊須原格仍為空格。'},
 {effect:'holy',target:'enemy',description:'僅可對不死敵軍造成固定 50 HP 傷害；價格衝突未解，不提供購買。',damage:50}
] as const;
export function spellLabel(id:number){return id<7?'已實作 · 研究適配':'未實作 · 冒險階段';}
export function spellName(id:number){return catalogs.spell[id]?.name??'未知法術';}
function occupied(state:State,x:number,y:number){return [...state.armies.player,...state.armies.enemy].some(s=>s&&s.hp>0&&s.cell?.x===x&&s.cell.y===y);}
export function castSpell(state:State,cmd:Extract<Command,{type:'cast'}>):Event[]{
 const {spellId,targetId}=cmd;
 if(!Number.isInteger(spellId)||spellId<0||spellId>=spellRules.length)throw Error('此法術尚未實作或 ID 不合法');
 const team=state.turn;
 if(state.spellUsed[team])throw Error('每方每次行動只能施放一道英雄法術');
 if(state.spellbook[team][spellId]<=0)throw Error('此法術已無符籙');
 const own=state.armies[team],enemy=state.armies[team==='player'?'enemy':'player'];
 const spec=spellRules[spellId];const target=(spec.target==='ally'?own:enemy).find(s=>s?.id===targetId);
 if(!target||!target.cell||(target.hp<=0&&spec.effect!=='resurrect'))throw Error('法術目標不合法');
 if(spec.effect==='holy'&&!hasAbility(target,'undead'))throw Error('渡厄真言只能選擇不死敵軍');
 const power=state.spellPower?.[team]??1;
 const events:Event[]=[];const title=spellName(spellId),u=unit(target.unitId);
 if(['damage','holy','freeze'].includes(spec.effect)&&hasAbility(target,'immune'))return [{type:'immune',targetId,text:`${u.name} 免疫 ${title}；不消耗符籙與施法機會`}];
 if(spec.effect==='damage'||spec.effect==='holy'){
  const info=damageStack(target,spec.damage*power);events.push({type:'spell-damage',targetId,...info,text:`${title} 命中 ${u.name}：${info.damage} 傷害，${info.deaths} 人陣亡，餘 ${target.hp} HP`});
 }else if(spec.effect==='clone'){
  const gain=Math.min(10*power,MAX_COUNT-target.count);if(gain===0)throw Error('此隊已達兵數上限');
  target.count+=gain;target.hp+=gain*u.hp;target.maxCount=Math.min(MAX_COUNT,target.maxCount+gain);
  events.push({type:'clone',targetId,amount:gain,text:`${title} 為 ${u.name} 增加 ${gain} 人，現為 ${target.count} 人`});
 }else if(spec.effect==='teleport'){
  const c=cmd.cell;
  if(!c||!Number.isInteger(c.x)||!Number.isInteger(c.y)||c.x<0||c.x>=6||c.y<0||c.y>=5||occupied(state,c.x,c.y)||(state.obstacles??[]).some(o=>o.x===c.x&&o.y===c.y))throw Error('傳送落點必須為戰場內的空格');
  target.cell={...c};events.push({type:'teleport',targetId,text:`${title} 將 ${u.name} 傳送至 (${c.x+1},${c.y+1})`});
 }else if(spec.effect==='freeze'){
  if(target.status.frozen)throw Error('目標已被定身');target.status.frozen='1';events.push({type:'freeze',targetId,text:`${title} 定住 ${u.name}，直到該方下次行動結束`});
 }else if(spec.effect==='resurrect'){
  if(target.hp===0&&occupied(state,target.cell.x,target.cell.y))throw Error('陣亡隊伍原格已被佔用，無法復活');
  const wasDead=target.hp===0;const gained=healStack(target,(state.rulesMode==='study'?u.hp:100)*power);if(!gained)throw Error('此隊已滿血');
  if(wasDead){target.acted=true;target.flights=0;}
  // A dead stack cannot gain an extra action by dying and resurrecting in the same turn.
  events.push({type:'resurrect',targetId,amount:gained,text:`${title} 為 ${u.name} 回復 ${gained} HP，現為 ${target.count} 人`});
 }
 state.spellUsed[team]=true;state.spellbook[team][spellId]--;
 return events;
}
