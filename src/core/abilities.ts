import {unit} from '../content/load';
import type {Stack,Event} from './types';
export const MAX_COUNT=1_000_000;
export const abilityRules = {
 fly:{name:'飛行',evidence:'open-source-implementation',description:'每次己方行動有 2 次全場飛行，可跨越兵團但不可落在佔用格；第二次飛行或攻擊後結束行動。'},
 undead:{name:'不死',evidence:'open-source-implementation',description:'可被渡厄真言選中；不自動免疫一般傷害，士氣與週次效果尚未啟用。'},
 absorb:{name:'汲取',evidence:'open-source-implementation',description:'近戰或反擊擊殺多少敵兵，增加等量滿血兵；保留自身殘傷，最高 1,000,000 人。'},
 regen:{name:'再生',evidence:'proposed-new-game',description:'己方行動開始時補滿存活兵員的殘傷，不復活陣亡者；觸發時機為沙盒適配。'},
 magic:{name:'施法',evidence:'proposed-new-game',description:'祝由巫醫每兵固定基值 10、3 發；御風方士 25、2 發，另經技能公式。獨立技能次數，不改來源彈藥；相鄰敵軍可牽制。'},
 leech:{name:'吸血',evidence:'proposed-new-game',description:'近戰與反擊按實際扣除的 HP 回復等量 HP，可復活至此隊戰中生命上限；不使用來源的整兵取整方式。'},
 scythe:{name:'斬魂',evidence:'open-source-implementation',description:'每次近戰或反擊先骰 1–100，90–100（11%）額外造成目標兵數向上取半 × 單兵 HP 傷害。'},
 immune:{name:'免疫',evidence:'open-source-implementation',description:'免疫兵種魔法攻擊、火龍符、天雷訣、渡厄真言及定身咒；一般近戰與實體遠射仍有效。'}
} as const;
export type Ability=keyof typeof abilityRules;
export function hasAbility(s:Stack,key:Ability){return (unit(s.unitId).abilities as string[]).includes(key);}
export function magicProfile(s:Stack,mode?:'study'|'enhanced'){if(mode==='study')return null;return hasAbility(s,'magic')?{base:unit(s.unitId).sourceTroopId===19?10:25,charges:unit(s.unitId).sourceTroopId===19?3:2}:null;}
export function abilityLabel(key:string){const r=abilityRules[key as Ability];return r?`${r.name}：已實作 · ${r.evidence}`:`${key}：未實作`;}
export function damageStack(s:Stack,amount:number){
 const before=s.count;const damage=Math.min(s.hp,Math.max(0,Math.floor(amount)));
 s.hp-=damage;s.count=Math.ceil(s.hp/unit(s.unitId).hp);
 return {damage,deaths:before-s.count,remainingHp:s.hp};
}
export function healStack(s:Stack,amount:number,cap=s.maxCount*unit(s.unitId).hp){
 // Never shrink a stack if its current HP already exceeds a recovery cap.
 const restored=Math.max(0,Math.min(Math.floor(amount),cap-s.hp));s.hp+=restored;s.count=Math.ceil(s.hp/unit(s.unitId).hp);return restored;
}
export function recoverAfterHit(a:Stack,damage:number,kills:number,mode?:'study'|'enhanced'):Event[]{
 const events:Event[]=[];const u=unit(a.unitId);
 if(hasAbility(a,'absorb')&&kills>0){
  const gain=Math.min(kills,MAX_COUNT-a.count);a.count+=gain;a.hp+=gain*u.hp;a.maxCount=Math.min(MAX_COUNT,a.maxCount+gain);
  events.push({type:'absorb',actorId:a.id,amount:gain,text:`${u.name} 汲取 ${gain} 名兵員，現為 ${a.count} 人`});
 }
 if(hasAbility(a,'leech')&&damage>0){const restored=healStack(a,mode==='study'?Math.floor(damage/u.hp)*u.hp:damage);if(restored)events.push({type:'leech',actorId:a.id,amount:restored,text:`${u.name} 吸血回復 ${restored} HP，現為 ${a.count} 人`});}
 return events;
}
