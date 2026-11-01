#!/usr/bin/env python3
"""Export the existing art verbatim with a standalone viewer and atlas metadata."""
import argparse,csv,hashlib,html,io,json,re,shutil,subprocess,tempfile,zipfile
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
ROOT=Path(__file__).resolve().parents[1]

def sha(data):return hashlib.sha256(data).hexdigest()
def dump(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def load(path):return json.loads(path.read_text(encoding='utf-8'))
def copy(source,target):target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
def esc(value):return html.escape(str(value),quote=True)

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=ROOT/'delivery');args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
 manifest=load(ROOT/'public/assets/painted/manifest.json');byfile={a['file']:a for a in manifest['assets']}
 units=load(ROOT/'data/content/troop_mapping.json');heroes=load(ROOT/'data/content/hero_mapping.json');foes=load(ROOT/'data/content/villain_mapping.json');spells=load(ROOT/'data/content/spell_mapping.json');artifacts=load(ROOT/'data/content/artifact_mapping.json')
 profiles=re.findall(r"\['([a-z]+)',([0-9.]+)\]",(ROOT/'src/art/motion.ts').read_text());assert len(profiles)==25
 entries=[]
 def add(category,name,file,index,columns,rows,key,**extra):
  asset=byfile[file];row,column=divmod(index,columns)
  entries.append({'key':key,'category':category,'name':name,'file':'assets/painted/'+file,'index':index,'row':row,'column':column,'rows':rows,'columns':columns,'cssBackgroundSize':f'{columns*100}% {rows*100}%','cssBackgroundPosition':f'{column*100/(columns-1) if columns>1 else 0:g}% {row*100/(rows-1) if rows>1 else 0:g}%','logicalViewBox':[column*100,row*100,100,100],'logicalAtlasSize':[columns*100,rows*100],'uv':[column/columns,row/rows,(column+1)/columns,(row+1)/rows],'pixelBoundsFloat':[column*asset['width']/columns,row*asset['height']/rows,(column+1)*asset['width']/columns,(row+1)*asset['height']/rows],**extra})
 for u in units:
  i=u['sourceTroopId'];kind,period=profiles[i];add('unit',u['name'],'units-v1.png',i,5,5,u['unitId'],sourceTroopId=i,motionProfile=kind,idleSeconds=float(period),visualBrief=u.get('visualBrief',''))
 for i,h in enumerate(heroes):add('hero',h['name'],'portraits-v1.png',i,5,5,h['heroClassId'])
 for i,f in enumerate(foes):add('villain',f['name'],'portraits-v1.png',4+i,5,5,f['villainId'])
 for i,name in enumerate(['青禾曉色','竹隱聽雨','赤嶺烽火','百川盟誓']):add('scene',name,'portraits-v1.png',21+i,5,5,'scene-'+str(i))
 terrain=['平原','竹林','山壁','江河','驛道','橋梁','澤地','赤岩'];buildings=['城鎮','兵源營地','敵營','山寨','古廟','烽臺']
 for i,name in enumerate(terrain):add('terrain',name,'world-items-v1.png',i,6,6,'terrain-'+str(i))
 for i,name in enumerate(buildings):add('building',name,'world-items-v1.png',8+i,6,6,'building-'+str(i))
 for i,s in enumerate(spells):add('spell',s['name'],'world-items-v1.png',14+i,6,6,s['spellId'])
 for i,a in enumerate(artifacts):add('artifact',a['name'],'world-items-v1.png',28+i,6,6,a['artifactId'])
 for i,name in enumerate(['苔岩','古柱遺跡','竹叢','石獅']):add('prop',name,'props-v1.png',i,2,2,'prop-'+str(i))
 add('battlefield','竹林古庭','courtyard-v1.png',0,1,1,'battlefield-courtyard')
 assert len(entries)==91
 with tempfile.TemporaryDirectory(prefix='jiuzhou-art-export-') as temp:
  package=Path(temp)/'jiuzhou-art-handoff-v1.2';package.mkdir()
  for source in (ROOT/'public/assets').rglob('*'):
   if source.is_file():copy(source,package/'assets'/source.relative_to(ROOT/'public/assets'))
  for source in (ROOT/'src/art').rglob('*'):
   if source.is_file():copy(source,package/'integration/src/art'/source.relative_to(ROOT/'src/art'))
  for file in ['troop_mapping.json','hero_mapping.json','villain_mapping.json','spell_mapping.json','artifact_mapping.json','factions.json']:
   copy(ROOT/'data/content'/file,package/'references'/file)
  copy(ROOT/'scripts/create-art.mjs',package/'integration/scripts/create-art.mjs')
  copy(ROOT/'scripts/art-handoff-browser.mjs',package/'integration/scripts/art-handoff-browser.mjs')
  for name in ['art-handoff-verification.json','art-handoff-preview.png']:
   if (ROOT/'artifacts'/name).is_file():copy(ROOT/'artifacts'/name,package/'verification'/name)
  for name in ['world-atlas.svg','animated-battle.png','battle-painted-mobile.png','world-painted.png','recruitment-mobile.png']:
   copy(ROOT/'artifacts'/name,package/'screenshots'/name)
  copy(ROOT/'docs/MOTION_MUSIC_V1_2.md',package/'references/MOTION_MUSIC_V1_2.md')
  original_map=[]
  for asset in manifest['assets']:
   data=(package/'assets/painted'/asset['file']).read_bytes();assert sha(data)==asset['sha256']
   original_map.append({'file':'assets/painted/'+asset['file'],'sha256':asset['sha256'],'bytes':len(data),'originalPNGUnchanged':True})
  dump(package/'ATLAS_INDEX.json',{'gameVersion':'1.2.0','artAtlasVersion':'1.1.0','gameCommit':'d4454a3a706476b129f9dd786b701f5759745a21','sourceBranch':'delivery/jiuzhou-v1','coordinateConvention':'row, column and index are zero-based; CSS/SVG normalized cells match the current game. Non-integer pixel bounds are metadata, not newly cropped images.','count':len(entries),'items':entries})
  dump(package/'PROVENANCE.json',{'exportDate':datetime.now(ZoneInfo('Asia/Taipei')).date().isoformat(),'timezone':'Asia/Taipei','origin':'Original generated artwork made with OpenAI image_gen for Jiuzhou; no source-game imagery.','sourcePNGFiles':original_map,'prototypeSVGCount':86,'notAvailable':['PSD or other manually layered source artwork','newly drawn frame-by-frame animation sequences','reproducible original generation seeds'],'exportTransformations':'Original PNG and SVG bytes are copied verbatim. The preview selects atlas cells in CSS; no new raster crops or image edits.'})
  csvfile=io.StringIO(newline='');writer=csv.DictWriter(csvfile,fieldnames=['category','name','key','file','index','row','column','rows','columns','cssBackgroundSize','cssBackgroundPosition','sourceTroopId','motionProfile','idleSeconds'],extrasaction='ignore');writer.writeheader();writer.writerows(entries);(package/'ATLAS_INDEX.csv').write_text(csvfile.getvalue(),encoding='utf-8-sig')
  copy(ROOT/'delivery/ART_START_HERE.md',package/'START_HERE.md')
  copy(ROOT/'docs/ART_HANDOFF_V1_2.md',package/'CLAUDE_ART_BRIEF.md')
  categories=[('unit','二十五兵種'),('hero','四位英雄'),('villain','十七敵將'),('scene','四幅場景'),('terrain','八種地形'),('building','六類建築'),('spell','十四符籙'),('artifact','八件神器'),('prop','四類障礙'),('battlefield','戰場背景')]
  sections=[]
  for category,title in categories:
   figures=[]
   for a in [a for a in entries if a['category']==category]:
    style=f"background-image:url('{a['file']}');background-size:{a['cssBackgroundSize']};background-position:{a['cssBackgroundPosition']}"
    if category=='unit':
     image=f'''<span class="unit-sprite" role="img" aria-label="{esc(a['name'])}" data-motion="{a['motionProfile']}" style="{style};--idle-period:{a['idleSeconds']}s;--idle-phase:-{a['index']*.317:.3f}s"><span class="sprite-body"><span class="sprite-upper"></span><span class="sprite-leg sprite-leg-left"></span><span class="sprite-leg sprite-leg-right"></span></span><span class="sprite-aura"></span></span>'''
    elif category=='battlefield':image=f'<img class="backdrop" src="{a["file"]}" alt="{esc(a["name"])}">'
    else:image=f'<span role="img" aria-label="{esc(a["name"])}" class="atlas-cell {category}" style="{style}"></span>'
    figures.append(f'<figure>{image}<figcaption>{esc(a["name"])}<small>{esc(a["key"])} · 格 {a["index"]} · 列 {a["row"]} / 欄 {a["column"]}</small></figcaption></figure>')
   sections.append(f'<section id="{category}"><h2>{title}</h2><div class="grid {category}">{"".join(figures)}</div></section>')
  legacy=load(package/'assets/original/manifest.json')
  figures=''.join(f'<figure><img loading="eager" class="legacy-image" src="assets/original/{esc(a["file"])}" alt="{esc(a["title"])}"><figcaption>{esc(a["title"])}<small>{esc(a["file"])}</small></figcaption></figure>' for a in legacy['assets'])
  markup='''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>九州兵譜 v1.2 美術交接預覽</title><link rel="stylesheet" href="integration/src/art/painted.css"><link rel="stylesheet" href="integration/src/art/motion.css"><style>
  body{margin:0;background:#f1efe7;color:#253c38;font-family:system-ui,sans-serif}header,main{max-width:1180px;margin:auto;padding:24px}header{position:sticky;top:0;background:#f1efe7f5;z-index:50;border-bottom:1px solid #c6cdb9}h1{font-size:24px;margin:0 0 10px}p{line-height:1.8}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#315f45}button{padding:8px 14px;border:1px solid #8b9f80;border-radius:5px;color:#f5ecd2;background:#244a3b;cursor:pointer}section{scroll-margin-top:180px;margin:25px 0 45px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:14px}figure{margin:0;padding:14px;text-align:center;background:#d4dec6;border:1px solid #b7c5a6;border-radius:7px;overflow:hidden}figcaption{margin-top:12px;font-size:14px;line-height:1.6}small{display:block;font-size:10px;overflow-wrap:anywhere;color:#5b7054}.unit-sprite{--sprite-size:142px}.atlas-cell{width:142px;height:142px;display:inline-block;background-repeat:no-repeat;border-radius:5px}.scene .atlas-cell{width:100%;height:auto;aspect-ratio:1}.scene.grid{grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}.battlefield.grid{display:block}.backdrop{display:block;width:100%;height:auto}.legacy-image{display:inline-block;width:120px;height:120px;object-fit:contain}details>summary{cursor:pointer;font-size:19px;padding:14px 0}.note{font-size:12px;color:#5c6d56}@media(max-width:500px){header,main{padding:14px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.unit-sprite{--sprite-size:120px}.atlas-cell{width:110px;height:110px}figure{padding:8px}}
  </style><header><h1>九州兵譜 v1.2 · 美術交接預覽</h1><p class="note">5 張原始 PNG 圖集，91 項圖格／背景，另附 86 張原型 SVG。直接開啟本 HTML 即可預覽，原圖未重新裁切或改寫。</p><button id="motion-toggle" aria-pressed="true">動作 開</button><nav>'''+''.join(f'<a href="#{category}">{title}</a>' for category,title in categories)+'''<a href="ATLAS_INDEX.json">JSON 索引</a><a href="ATLAS_INDEX.csv">CSV 索引</a></nav></header><main>'''+''.join(sections)+f'<details><summary>舊版原型 SVG · 設計對照（86 張）</summary><div class="grid">{figures}</div></details><section><h2>實際遊戲畫面與地圖</h2><p><a href="screenshots/animated-battle.png">戰場畫面</a> · <a href="screenshots/battle-painted-mobile.png">手機戰場</a> · <a href="screenshots/world-painted.png">行旅畫面</a> · <a href="screenshots/world-atlas.svg">完整 32×32 地圖設計</a></p></section></main>'+'''<script>document.getElementById('motion-toggle').onclick=function(){const paused=document.body.classList.toggle('motion-paused');this.textContent=paused?'動作 關':'動作 開';this.setAttribute('aria-pressed',String(!paused));};</script></html>'''
  (package/'preview.html').write_text(markup,encoding='utf-8')
  verifier='''import hashlib,json,sys\nfrom pathlib import Path\nroot=Path(__file__).resolve().parent\nmanifest=json.loads((root/'SHA256_MANIFEST.json').read_text(encoding='utf-8'))\nerrors=[]\nfor name,expected in manifest['files'].items():\n p=(root/name).resolve()\n if not p.is_relative_to(root) or not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=expected['sha256']:errors.append(name)\nif errors:print('FAILED',errors);sys.exit(1)\nprint('PASS:',len(manifest['files']),'files match SHA-256')\n'''
  (package/'VERIFY_PACKAGE.py').write_text(verifier,encoding='utf-8')
  files={str(p.relative_to(package)):{'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in sorted(package.rglob('*')) if p.is_file()}
  dump(package/'SHA256_MANIFEST.json',{'algorithm':'SHA-256','manifestExcludesItself':True,'files':files})
  subprocess.run(['python3',str(package/'VERIFY_PACKAGE.py')],check=True)
  output=args.output/'jiuzhou-art-handoff-v1.2.zip'
  with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
   for p in sorted(package.rglob('*')):
    if p.is_file():z.write(p,package.name+'/'+str(p.relative_to(package)))
  with zipfile.ZipFile(output) as z:
   assert z.testzip() is None
   for path,record in files.items():assert sha(z.read(package.name+'/'+path))==record['sha256']
  output.with_suffix('.zip.sha256').write_text(sha(output.read_bytes())+'  '+output.name+'\n',encoding='ascii')
  print('Art package:',output,'bytes:',output.stat().st_size,'art entries:',len(entries),'files:',len(files)+1)
if __name__=='__main__':main()
