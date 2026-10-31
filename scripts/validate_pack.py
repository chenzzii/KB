#!/usr/bin/env python3
"""Validate research + Chinese mapping using Python stdlib. No game binaries executed."""
import json
import sys
from pathlib import Path

BASE=Path(__file__).resolve().parents[1]

def read(p):
    return json.loads((BASE/p).read_text(encoding='utf-8-sig'))

def validate():
    err=[]; warn=[]
    ref=read('data/reference/openkb_cht_free_parameters.json')
    units=read('data/content/troop_mapping.json')
    gen=read('data/generated/chinese_roster_reference_stats.json')['units']
    spells=read('data/content/spell_mapping.json')
    arts=read('data/content/artifact_mapping.json')
    heroes=read('data/content/hero_mapping.json')
    villains=read('data/content/villain_mapping.json')
    arrays=[('source troops',ref['troops'],25,'id'),('new units',units,25,'sourceTroopId'),('merged units',gen,25,'sourceTroopId'),
            ('source spells',ref['spells'],14,'id'),('new spells',spells,14,'sourceSpellId'),
            ('source artifacts',ref['artifacts'],8,'id'),('new artifacts',arts,8,'sourceArtifactId'),
            ('new hero classes',heroes,4,'sourceHeroClassIndex'),('source villains',ref['villains'],17,'id'),('new villains',villains,17,'sourceVillainId')]
    for label,arr,needed,key in arrays:
        ids=[x[key] for x in arr]
        if len(ids)!=needed or sorted(ids)!=list(range(needed)):
            err.append(f'{label}: requires unique 0..{needed-1}, found {ids}')
    if len({u['unitId'] for u in units})!=25:
        err.append('unitId unique count must equal 25')
    if len({u['name'] for u in units})!=25:
        err.append('Chinese display name unique count must equal 25')
    faction_map={'A':'鄉里','B':'朝廷軍旅','C':'方外江湖','D':'山野妖靈','E':'幽冥'}
    for s,m,g in zip(ref['troops'],units,gen):
        ix=s['id']
        if s['id']!=m['sourceTroopId'] or m['sourceTroopId']!=g['sourceTroopId']:
            err.append(f'#{ix}: misplaced source ID mapping')
        if s['group']!=m['factionGroup'] or m['factionLabel']!=faction_map.get(s['group']):
            err.append(f'#{ix}: mismatched faction group')
        if s['abilities']!=m['abilitiesInherited']:
            err.append(f'#{ix}: ability lost in mapping')
        if g['unitId']!=m['unitId'] or g['name']!=m['name']:
            err.append(f'#{ix}: merged name/slug mismatch')
        if m['balanceOverrides']:
            err.append(f'#{ix}: baseline balanceOverride not empty')
        for k in ['skill','moves','hp','melee_min','melee_max','ammo','ranged_min','ranged_max','abilities','gold','spoils','spoils_raw']:
            if g['stats'].get(k)!=s.get(k):
                err.append(f'#{ix}: generated stat {k} changed')
        for k in ['hp','skill','moves','gold']:
            if not isinstance(s[k],int) or s[k]<0:
                err.append(f'#{ix}: invalid {k}')
        if s['melee_min']>s['melee_max']:
            err.append(f'#{ix}: damage range reversed')
        if s['ammo']>0 and (s['ranged_min'] is None or s['ranged_max'] is None):
            err.append(f'#{ix}: ammo but no ranged damage')
    source_by_name={u['name']:u['id'] for u in ref['troops']}
    for s,v in zip(ref['villains'],villains):
        if len(s['army'])!=len(v['army']):
            err.append(f"villain #{s['id']}: army slot count changed")
            continue
        if s['reward']!=v['baselineRewardGold']:
            err.append(f"villain #{s['id']}: reward changed")
        for sr,vr in zip(s['army'],v['army']):
            if (sr['slot']!=vr['slot'] or sr['count']!=vr['count'] or source_by_name[sr['troop_name']]!=vr['sourceTroopId']):
                err.append(f"villain #{s['id']}: army mapping changed")
    # Source-data anomalies are deliberately not errors for a reference-only dataset.
    for a in ref['known_issues']:
        warn.append(f"known source issue: {a['section']}.{a['field']}: {a['issue']}")
    if ref['troops'][14]['spoils_raw']!='10s0' or ref['troops'][14]['spoils'] is not None:
        err.append('original bad spoils literal must be preserved without conversion')
    if ref['spells'][6]['all_gold_assignments']!=['250','2000']:
        err.append('original duplicate spell6.gold assignments must be preserved')
    for msg in warn:
        print('WARNING:',msg)
    if err:
        for msg in err:print('ERROR:',msg,file=sys.stderr)
        print(f'FAILED: {len(err)} errors, {len(warn)} known warnings.',file=sys.stderr)
        return 1
    print(f'PASS: {len(units)} unit mappings, {len(spells)} spells, {len(arts)} artifacts, {len(heroes)} heroes, {len(villains)} villains.')
    print(f'PASS: unit IDs, numeric stat preservation, ability mapping, villain armies, anomaly retention. {len(warn)} expected warnings.')
    return 0

if __name__=='__main__':sys.exit(validate())
