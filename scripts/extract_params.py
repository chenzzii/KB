#!/usr/bin/env python3
"""Extract only the text-based, openly licensed 'free' module parameters.
This is deliberately a STATIC parser; it never executes any binary in the supplied archive.
Usage: python extract_params.py KingsBounty-CHT-full-windows-x64.zip OUTPUT_DIR
"""
import sys, json, csv, re, zipfile, pathlib, hashlib, collections, xml.etree.ElementTree as ET

def read_sections(content, source):
    sec=None; entries=[]
    for lineno, line in enumerate(content.decode('utf-8-sig').splitlines(),1):
        stripped=line.strip()
        if not stripped or stripped.startswith(('#',';')): continue
        if stripped.startswith('[') and stripped.endswith(']'):
            sec={'section':stripped[1:-1], 'source':source, 'values':{}, 'duplicates':[], 'raw_pairs':[]}; entries.append(sec)
        elif '=' in line and sec is not None:
            key,val=map(str.strip, line.split('=',1))
            if key in sec['values']:
                sec['duplicates'].append({'key':key,'prior':sec['values'][key], 'new':val,'line':lineno})
            sec['values'][key]=val
            sec['raw_pairs'].append({'key':key,'value':val,'line':lineno})
    return entries

def n(s):
    try:return int(s)
    except (ValueError,TypeError):return None

def pair(s):
    a,b=(s or '').split('-',1) if '-' in (s or '') else (None,None)
    return [n(a),n(b)]

def csv_write(path,rows,cols):
    with open(path,'w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=cols,extrasaction='ignore');w.writeheader();w.writerows(rows)

def main(src,out):
    out.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(src) as z:
        lookup={q.split('/data/free/',1)[1]:q for q in z.namelist() if '/data/free/' in q}
        def b(name):return z.read(lookup[name])
        name_map={'troops':'troops.ini','spells':'spells.ini','artifacts':'artifacts.ini','villains':'villains.ini','castles':'castles.ini','towns':'towns.ini','land':'land.ini'}
        sections={name:read_sections(b(fname),f'data/free/{fname}') for name,fname in name_map.items()}
        manifest=[]
        for name in ('KB.EXE','256.CC','416.CC','kb.bin','openkb.exe'):
            candidates=[q for q in z.namelist() if q.endswith('/'+name)]
            if candidates:
                bb=z.read(candidates[0]);manifest.append({'file':candidates[0].split('/',1)[1], 'size_bytes':len(bb),'md5':hashlib.md5(bb).hexdigest(),'sha256':hashlib.sha256(bb).hexdigest()})
        tr=[];issues=[]
        for e in sections['troops']:
            v=e['values'];id=int(e['section'][5:]);r={
              'id':id,'name':v.get('name'),'sprite':v.get('file'),'skill':n(v.get('skill')),'moves':n(v.get('moves')),
              'hp':n(v.get('hp')),'melee_min':pair(v.get('melee'))[0],'melee_max':pair(v.get('melee'))[1],
              'ammo':n(v.get('ammo')),'ranged_min':pair(v.get('ranged'))[0],'ranged_max':pair(v.get('ranged'))[1],
              'abilities': [x.strip() for x in v.get('abilities','').split(',') if x.strip() and x.strip()!='none'],
              'group':v.get('group'),'dwelling':v.get('dwelling'), 'gold':n(v.get('gold')),
              'spoils':n(v.get('spoils')),'spoils_raw':v.get('spoils'), 'source':e['source']+'#'+e['section']}
            tr.append(r)
            if r['spoils'] is None: issues.append({'file':e['source'],'section':e['section'],'field':'spoils','severity':'high','issue':f"non-integer value '{v.get('spoils')}'",'action':'check original value; do not auto-correct'})
            if not v.get('file'):issues.append({'file':e['source'],'section':e['section'],'field':'file','severity':'medium','issue':'sprite filename not specified; perhaps fallback exists','action':'inspect loader fallback'})
            elif v['file']+'.png' not in lookup:
                issues.append({'file':e['source'],'section':e['section'],'field':'file','severity':'medium','issue':f"named sprite '{v['file']}.png' is absent from data/free",'action':'check module fallback or spelling'})
        spell=[]
        for e in sections['spells']:
            v=e['values'];r={'id':int(e['section'][5:]),'name':v.get('name'),'type':v.get('type'),
              'effect_value_raw':v.get('damage'),'effect_value':n(v.get('damage')),'gold_raw':v.get('gold'), 'gold':n(v.get('gold')),
              'filter':v.get('filter'),'all_gold_assignments':[p['value'] for p in e['raw_pairs'] if p['key']=='gold'],
              'source':e['source']+'#'+e['section']};spell.append(r)
        arts=[]
        for e in sections['artifacts']:
            v=e['values'];arts.append({'id':int(e['section'][8:]),'name':v.get('name'),'power':v.get('power'),'description':v.get('description'), 'invert_id':n(v.get('invert_id')),'source':e['source']+'#'+e['section']})
        villains=[]
        for e in sections['villains']:
            v=e['values'];units=[]
            for i in range(5):
                s=v.get('army'+str(i),'');m=re.match(r'^\s*(\d+)\s*x\s*(.+?)\s*$',s)
                units.append({'slot':i,'count':int(m.group(1)) if m else None,'troop_name':m.group(2) if m else s})
            villains.append({'id':int(e['section'][7:]),'name':v.get('name'),'portrait':v.get('file'),'reward':n(v.get('reward')),'army':units,'source':e['source']+'#'+e['section']})
        locs={}
        for name in ('castles','towns'):
            locs[name]=[]
            for e in sections[name]:
                v=e['values'];locs[name].append({'id':int(re.search(r'(\d+)$',e['section']).group(1)), 'name':v.get('name'),
                  'continent':n(v.get('continent')),'x':n(v.get('x')),'y':n(v.get('y')),
                  'properties':{k:(n(val) if k in ('difficulty','boat_x','boat_y','gate_x','gate_y','spell','invert_id') and n(val) is not None else val) for k,val in v.items() if k not in ('name','continent','x','y')},'source':e['source']+'#'+e['section']})
        # All intentional duplicate assignments, with their original line numbers.
        for kind,el in sections.items():
            for e in el:
                for d in e['duplicates']:
                    issues.append({'file':e['source'],'section':e['section'],'field':d['key'],'severity':'high',
                                   'issue':f"duplicate assignment on line {d['line']}: {d['prior']!r} then {d['new']!r}",'action':'check parser precedence and intended value'})
        names={r['name'] for r in tr}
        for vill in villains:
            for arm in vill['army']:
                if arm['troop_name'] not in names:
                    issues.append({'file':'data/free/villains.ini','section':'villain'+str(vill['id']),'field':'army'+str(arm['slot']),'severity':'medium',
                        'issue':f"unknown troop {arm['troop_name']!r}",'action':'check troop reference'})
        # TMX contains layers for 64x64 continental maps.
        root=ET.fromstring(b('land.tmx'))
        layers=[]
        for x in root.findall('layer'):
            layers.append({'name':x.attrib.get('name'),'width':n(x.attrib.get('width')),'height':n(x.attrib.get('height')),
                'tile_count':len(x.findall('./data/tile'))})
        result={'schema':'kb-cht-parameter-research-v1','source_archive':src.name,
          'provenance':'Extracted from data/free/*.ini and land.tmx (the CHT fork free module), not verified against KB.EXE',
          'counts':{'troops':len(tr),'spells':len(spell),'artifacts':len(arts),'villains':len(villains),'castles':len(locs['castles']),'towns':len(locs['towns']),'world_layers':len(layers)},
          'troops':tr,'spells':spell,'artifacts':arts,'villains':villains,'castles':locs['castles'],'towns':locs['towns'],'world_layers':layers,
          'known_issues':issues,'binary_manifest':manifest,
          'license_note':'free module provenance: dual-licensed CC-BY-SA 4.0 and GPLv3-or-later; attribution: original openKB contributors and CHT translators. No original executable, ROM, art or audio is redistributed.'}
        (out/'game_parameters.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        csv_write(out/'troops.csv',[{**r,'abilities':';'.join(r['abilities'])} for r in tr],list(tr[0].keys()))
        csv_write(out/'spells.csv',[{**r,'all_gold_assignments':';'.join(r['all_gold_assignments'])} for r in spell],list(spell[0].keys()))
        csv_write(out/'artifacts.csv',arts,list(arts[0].keys()))
        csv_write(out/'villains.csv',[{k:v for k,v in r.items() if k!='army'} for r in villains],['id','name','portrait','reward','source'])
        csv_write(out/'map_locations.csv',[{'kind':k,**{key:v for key,v in r.items() if key!='properties'}} for k in ('castles','towns') for r in locs[k]],['kind','id','name','continent','x','y','source'])
        csv_write(out/'audit_issues.csv',issues,['file','section','field','severity','issue','action'])
        csv_write(out/'binary_hashes.csv',manifest,['file','size_bytes','md5','sha256'])
        print('Wrote',result['counts'],len(issues),'issues and',len(manifest),'binary hashes')
        for a in issues: print(a['section'],a['field'],a['issue'])
if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('Usage: extract_params.py ARCHIVE.zip OUT_DIR')
    main(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]))
