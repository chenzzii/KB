import {alive,distance,reachable} from './engine';
import {hasAbility} from './abilities';
import type {Command,State,Team,Stack} from './types';
export function nextAICommand(state:State,team:Team=state.turn):Command {
 if(state.phase!=='battle'||team!==state.turn)throw Error('AI 非行動階段');
 const opponents=alive(state,team==='player'?'enemy':'player');
 const own=alive(state,team);
 const order=(a:Stack,b:Stack)=>a.hp-b.hp||(a.id<b.id?-1:a.id>b.id?1:0);
 if(!state.spellUsed[team]){
  const susceptible=opponents.filter(s=>!hasAbility(s,'immune')).sort(order);
  const undead=susceptible.find(s=>hasAbility(s,'undead'));
  if(undead&&state.spellbook[team][6]>0)return {type:'cast',spellId:6,targetId:undead.id};
  const injured=own.find(s=>s.maxCount*unitHp(s)-s.hp>=50);
  if(injured&&state.spellbook[team][5]>0)return {type:'cast',spellId:5,targetId:injured.id};
  if(susceptible.length&&state.spellbook[team][2]>0)return {type:'cast',spellId:2,targetId:susceptible[0].id};
  if(susceptible.length&&state.spellbook[team][3]>0)return {type:'cast',spellId:3,targetId:susceptible[0].id};
 }
 for(const actor of own.filter(s=>!s.acted&&!s.status.frozen)){
  const enemies=[...opponents].sort((a,b)=>distance(actor.cell!,a.cell!)-distance(actor.cell!,b.cell!)||order(a,b));
  const nearest=enemies[0];if(!nearest)break;
  if(distance(actor.cell!,nearest.cell!)===1)return {type:'attack',actorId:actor.id,targetId:nearest.id};
  const magicTarget=enemies.find(s=>!hasAbility(s,'immune'));
  if(actor.magicCharges>0&&state.rulesMode!=='study'&&magicTarget)return {type:'magic-attack',actorId:actor.id,targetId:magicTarget.id};
  if(actor.ammo>0)return {type:'ranged-attack',actorId:actor.id,targetId:nearest.id};
  const choices=reachable(state,actor).sort((a,b)=>Math.min(...enemies.map(e=>distance(a,e.cell!)))-Math.min(...enemies.map(e=>distance(b,e.cell!)))||a.y-b.y||a.x-b.x);
  const cell=choices.find(c=>Math.min(...enemies.map(e=>distance(c,e.cell!)))<distance(actor.cell!,nearest.cell!));
  if(cell)return {type:'move',actorId:actor.id,cell};
 }
 return {type:'end-turn'};
}
import {unit} from '../content/load';
function unitHp(s:Stack){return unit(s.unitId).hp;}
