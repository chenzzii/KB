import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const read = p => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const ref = read('data/reference/openkb_cht_free_parameters.json');
const mapping = read('data/content/troop_mapping.json');
const roster = read('data/generated/chinese_roster_reference_stats.json');
const statsKeys = ['hp','skill','moves','melee_min','melee_max','ammo','ranged_min','ranged_max','gold','abilities','spoils','spoils_raw'];
if (mapping.length !== 25 || new Set(mapping.map(m=>m.sourceTroopId)).size !== 25) throw Error('Invalid troop mapping');
const units = mapping.map(m => {
 const s=ref.troops.find(s=>s.id===m.sourceTroopId);
 const g=roster.units.find(g=>g.sourceTroopId===m.sourceTroopId);
 if (!s || !g || m.sourceTroopId<0 || m.sourceTroopId>24 || Object.keys(m.balanceOverrides).length || JSON.stringify(s.abilities)!==JSON.stringify(m.abilitiesInherited)) throw Error('Baseline mismatch');
 for(const k of statsKeys) if(JSON.stringify(s[k])!==JSON.stringify(g.stats[k])) throw Error(`Stat drift: ${m.unitId}.${k}`);
 return {id:m.unitId,sourceTroopId:s.id,name:m.name,sourceName:s.name,group:s.group,faction:m.factionLabel,role:m.combatRole,lore:m.lore,...Object.fromEntries(statsKeys.map(k=>[k,s[k]]))};
});
// Deliberately omit original maps, towns, villain identities and asset paths from the browser bundle.
const catalogs = Object.fromEntries(['spell','artifact','hero','villain'].map(k=>[k,read(`data/content/${k}_mapping.json`).map(x=>({id:x[`${k}Id`]??x.heroClassId,name:x.name}))]));
const warnings = ref.known_issues.map(x=>`${x.section}.${x.field}: ${x.issue}`);
warnings.push('職業對照衝突：文件 Barbarian→豪俠／Sorceress→方士，但 JSON 相反；職業機制尚未啟用。');
const payload={units,catalogs,warnings};
const dataHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
if(!process.argv.includes('--check')) {
 mkdirSync(new URL('src/content/',root),{recursive:true});
 writeFileSync(new URL('src/content/generated.json',root),JSON.stringify({...payload,dataHash},null,2)+'\n');
}
console.log(`Data validated: ${units.length} troops; SHA256 ${dataHash}`);
