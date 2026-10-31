import {unit} from '../content/load';
import type {State,Stack,Team} from './types';
import balance from '../../data/balance/chinese_campaign_v1.json';
const matrix=balance.morale.matrix;
export function morale(s:State,a:Stack):'L'|'N'|'H'{
 if(!s.rulesMode)return 'N';
 const team:Team=s.armies.player.some(x=>x?.id===a.id)?'player':'enemy';
 const row='ABCDE'.indexOf(unit(a.unitId).group);const values=s.armies[team].filter(x=>x&&x.hp>0&&x.id!==a.id).map(x=>matrix[row]['ABCDE'.indexOf(unit(x!.unitId).group)]);
 return values.includes('L')?'L':values.includes('H')?'H':'N';
}
export function modifiedDamage(s:State,a:Stack,b:Stack,raw:number,ranged:boolean){
 let n=raw;const mood=morale(s,a);if(mood==='L')n=Math.floor(n/2);if(mood==='H')n+=Math.floor(n/2);
 const attack:Team=s.armies.player.some(x=>x?.id===a.id)?'player':'enemy';const defend=attack==='player'?'enemy':'player';
 if(s.powers?.[attack].includes(0))n+=Math.floor(n/2);
 if(s.powers?.[defend].includes(1))n=Math.floor(n/4)*3;
 if(s.rulesMode==='enhanced'&&s.terrain==='forest'&&ranged)n=Math.floor(n*0.8);
 return Math.max(s.rulesMode==='study'?0:1,n);
}
