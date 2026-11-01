import data from './generated.json';
import v2 from '../../data/balance/chinese_campaign_v2.json';
export const units = data.units;
type BaseUnit = typeof units[number];
/** v2 campaign units carry a tier, optional placeholder art and their own unit-magic numbers. */
export type Unit = BaseUnit & {tier?:number;art?:string;magic?:{base:number;charges:number}};
export const dataHash = data.dataHash;
export const catalogs = data.catalogs;
export const warnings = data.warnings;
/** campaign-2.0.0 roster: separate from the hashed research baseline above, so arena replays and v1 saves are unaffected. */
export const rosterV2:Unit[]=v2.units.map(u=>{const base=units.find(b=>b.sourceTroopId===u.sourceTroopId)!;return {...base,...u,ranged_min:u.ranged_min as BaseUnit['ranged_min'],ranged_max:u.ranged_max as BaseUnit['ranged_max'],abilities:u.abilities as BaseUnit['abilities'],faction:v2.factions[u.group as keyof typeof v2.factions].name,lore:base.lore,spoils:Math.round(u.gold/10),spoils_raw:String(Math.round(u.gold/10))} as Unit;});
export function unit(id:string):Unit {
 const found=units.find(u=>u.id===id)??rosterV2.find(u=>u.id===id);
 if(!found) throw Error('未知兵種');
 return found;
}
export const abilities:Record<string,string>={fly:'飛行',undead:'不死',absorb:'汲取',regen:'再生',magic:'施法',leech:'吸血',scythe:'斬魂',immune:'免疫'};
