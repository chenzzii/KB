import data from './generated.json';
export const units = data.units;
export type Unit = typeof units[number];
export const dataHash = data.dataHash;
export const catalogs = data.catalogs;
export const warnings = data.warnings;
export function unit(id:string):Unit {
 const found=units.find(u=>u.id===id);
 if(!found) throw Error('未知兵種');
 return found;
}
export const abilities:Record<string,string>={fly:'飛行',undead:'不死',absorb:'汲取',regen:'再生',magic:'施法',leech:'吸血',scythe:'斬魂',immune:'免疫'};
