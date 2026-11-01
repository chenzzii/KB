#!/usr/bin/env python3
"""Export source + runnable web build + provenance and evidence for another developer."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = [
    'batch-report.json', 'campaign-completion.json', 'art-review-battle.json',
    'demo-replay.json', 'abilities-replay.json', 'browser-replay.json',
    'browser-abilities-replay.json', 'painted-command-save.json',
    'painted-verification.json', 'presentation-verification.json',
    'recruitment-verification.json', 'recruitment-save.json', 'motion-command-save.json',
    'world-atlas.svg', 'world-painted.png', 'animated-battle.png',
    'battle-painted-mobile.png', 'motion-music-mobile.png',
    'recruitment-desktop.png', 'recruitment-mobile.png',
    'map-music-preview.wav', 'battle-music-preview.wav',
    'handoff-extraction-check.json', 'handoff-clean-validation.txt',
    'title-verification.json', 'title-map-markers.png', 'title-mobile-select.png',
]
EVIDENCE += [f'campaign-{mode}-{route}.json' for mode in ('enhanced', 'study')
             for route in ('conquest', 'alliance', 'trade')]
VERIFIER = '''#!/usr/bin/env python3
import hashlib, json, sys, zipfile
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'SHA256_MANIFEST.json').read_text(encoding='utf-8'))
errors=[]
for name, record in manifest['files'].items():
 path=(root/name).resolve()
 if not path.is_relative_to(root) or not path.is_file():
  errors.append('Missing or unsafe path: '+name);continue
 data=path.read_bytes()
 if len(data)!=record['bytes'] or hashlib.sha256(data).hexdigest()!=record['sha256']:
  errors.append('Hash mismatch: '+name)
original=root/'original_handoff/development_pack_v1.zip'
count=0
if original.exists():
 with zipfile.ZipFile(original) as archive:
  for item in archive.infolist():
   if item.is_dir():continue
   relative=Path(*Path(item.filename).parts[1:])
   if not relative.parts or '..' in relative.parts:
    errors.append('Unsafe original path');continue
   target=root/'project'/relative
   if not target.is_file() or target.read_bytes()!=archive.read(item):
    errors.append('Original handoff changed: '+str(relative))
   count+=1
if errors:
 print('FAILED\\n'+'\\n'.join(errors));sys.exit(1)
print(f"PASS: {len(manifest['files'])} files verified; {count} original handoff files compared.")
'''

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original-pack', required=True, type=Path)
    parser.add_argument('--output', type=Path, default=ROOT/'delivery')
    args=parser.parse_args()
    if not (ROOT/'dist/index.html').is_file():
        parser.error('Run npm run build before export.')
    tracked=[Path(name.decode()) for name in git('ls-files','-z').split(b'\0') if name]
    tracked=[p for p in tracked if p.parts[0]!='delivery']
    # Preserve the exact source handoff. This is a development package, not a game executable ZIP.
    with zipfile.ZipFile(args.original_pack) as original:
        originals=[]
        for item in original.infolist():
            if item.is_dir():continue
            relative=Path(*Path(item.filename).parts[1:])
            if not relative.parts or '..' in relative.parts:
                raise ValueError('Unsafe original archive entry')
            if (ROOT/relative).read_bytes()!=original.read(item):
                raise ValueError(f'Original handoff changed: {relative}')
            originals.append(str(relative))
    args.output.mkdir(parents=True, exist_ok=True)
    game_commit='9f5b803c5d546e54908ffbce979a4d1dcb3611b8'
    status={
        'game':'九州兵譜：烽火歸途', 'version':'1.3.0',
        'exportDate':datetime.now(ZoneInfo('Asia/Taipei')).date().isoformat(),
        'timezone':'Asia/Taipei', 'repository':'https://github.com/chenzzii/KB',
        'sourceBranch':'delivery/jiuzhou-v1', 'gameCommit':game_commit,
        'exportBaseCommit':git('rev-parse','HEAD').decode().strip(),
        'previousGameCommit':'d4454a3a706476b129f9dd786b701f5759745a21',
        'additionalHandoffFiles':['CLAUDE.md','docs/CLAUDE_HANDOFF.md','scripts/export-claude-handoff.py','delivery/jiuzhou-v1.3-web.zip'],
        'website':'https://chenzzii.github.io/KB/?v=1.3',
        'siteBranch':'gh-pages', 'siteCommit':'5771ef6696c58b5713e6140e94ea0fbe85f7166d',
        'publicHttpDeploymentVerified':False,
        'originalHandoffFileCount':len(originals),
        'originalHandoffZipSHA256':digest(args.original_pack.read_bytes()),
        'mapSize':'32x32', 'battlefield':'6x5', 'unitTypes':25,
        'campaignSave':{'schema':1,'ruleset':'campaign-1.0.0'},
        'arenaSave':{'schema':2,'ruleset':'research/abilities-v0.2.0'},
        'unitTestsLastPassed':116,
        'evidenceNotes':{
            'onboarding':'v1.3 test:title 27 browser checks (title, story skip, role selection, settings, once-only tips, map recruit/battle markers, resume, mobile); also passed against built gh-pages content and extracted v1.3 web ZIP',
            'presentation':'v1.2 motion/music browser checks, rerun and passing on v1.3; WAVs cover first 16 bars, not the complete loop',
            'recruitment':'v1.1.1 four classes x two modes browser checks',
            'campaign':'six normal completion/replay sequences, rechecked by v1.3 browser (dev server, built site and web ZIP)',
            'batch':'historical 10000 arena replay verification; not rerun for this export',
        },
        'notIncluded':['node_modules','.git','credentials','personal browser saves','source-game executables'],
    }
    with tempfile.TemporaryDirectory(prefix='jiuzhou-export-') as temporary:
        package=Path(temporary)/'jiuzhou-claude-handoff-v1.3';package.mkdir()
        copy(ROOT/'delivery/CLAUDE_START_HERE.md',package/'START_HERE.md')
        (package/'VERIFY_PACKAGE.py').write_text(VERIFIER, encoding='utf-8')
        for relative in tracked:
            copy(ROOT/relative, package/'project'/relative)
        for name in EVIDENCE:
            if (ROOT/'artifacts'/name).is_file():
                copy(ROOT/'artifacts'/name,package/'project/artifacts'/name)
        for source in (ROOT/'dist').rglob('*'):
            if source.is_file():copy(source,package/'web-build'/source.relative_to(ROOT/'dist'))
        copy(args.original_pack,package/'original_handoff/development_pack_v1.zip')
        for edition in ('full','context-only'):
            output_root=package if edition=='full' else Path(temporary)/'jiuzhou-claude-context-v1.3'
            if edition=='context-only':
                output_root.mkdir()
                for source in package.rglob('*'):
                    if not source.is_file():continue
                    relative=source.relative_to(package)
                    if relative.parts[0] in ('web-build','original_handoff'):continue
                    if source.suffix.lower() in ('.png','.wav','.zip'):continue
                    if source.name in ('HANDOFF_STATUS.json','SHA256_MANIFEST.json'):continue
                    copy(source,output_root/relative)
                (output_root/'CONTEXT_ONLY.md').write_text(
                    '此為輕量文字上下文包，未包含 PNG、美術音訊證據、原始 ZIP 或可玩的 web-build。'
                    '請另取完整交接包，或 clone GitHub 的 delivery/jiuzhou-v1 分支後執行遊戲。\n',encoding='utf-8')
            write_json(output_root/'HANDOFF_STATUS.json',{**status,'edition':edition})
            files={str(p.relative_to(output_root)):{'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())}
                   for p in sorted(output_root.rglob('*')) if p.is_file() and p.name!='SHA256_MANIFEST.json'}
            write_json(output_root/'SHA256_MANIFEST.json',{'algorithm':'SHA-256','manifestExcludesItself':True,'files':files})
            subprocess.run(['python3',str(output_root/'VERIFY_PACKAGE.py')],check=True,cwd=output_root)
            filename='jiuzhou-claude-handoff-v1.3.zip' if edition=='full' else 'jiuzhou-claude-context-v1.3.zip'
            archive_path=args.output/filename
            with zipfile.ZipFile(archive_path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
                for p in sorted(output_root.rglob('*')):
                    if p.is_file():archive.write(p,output_root.name+'/'+str(p.relative_to(output_root)))
            with zipfile.ZipFile(archive_path) as archive:
                if archive.testzip() is not None:raise ValueError('ZIP CRC failure')
                for relative,record in files.items():
                    if digest(archive.read(output_root.name+'/'+relative))!=record['sha256']:
                        raise ValueError('ZIP content mismatch: '+relative)
            archive_path.with_suffix('.zip.sha256').write_text(digest(archive_path.read_bytes())+'  '+filename+'\n',encoding='ascii')
            print(f'{edition}: {archive_path} ({archive_path.stat().st_size} bytes, {len(files)} verified files)')

if __name__=='__main__':main()
