import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>localStorage.setItem('jiuzhou-settings',JSON.stringify({tips:false,music:false,sfx:false,motion:true})));
try{
 await mkdir('artifacts',{recursive:true});
 await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:5173/');
 await page.locator('#title-new').click();await page.locator('#story-skip').click();await page.locator('[data-hero="ru_jiang"]').click();
 await page.locator('.title-screen').screenshot({path:'artifacts/walk-role-selection.png'});
 await page.locator('#title-start').click();await page.locator('#open-system').click();
 // Exercise the actual renderer for every roster entry in a test-only gallery.
 const ids=await page.evaluate(async()=>{
  const {troopFigure}=await import('/src/art/painted.ts');const {rosterV2}=await import('/src/content/load.ts');
  const ground=rosterV2.filter(u=>u.walk);const gallery=document.createElement('section');gallery.id='walk-verification';
  gallery.innerHTML=ground.map(u=>`<figure data-unit="${u.id}">${troopFigure(u,u.name)}<figcaption>${u.name}</figcaption></figure>`).join('');document.body.append(gallery);
  return ground.map(u=>u.id);
 });
 expect(ids).toHaveLength(19);
 const manifest=JSON.parse(await readFile('public/assets/painted/walk/manifest.json','utf8'));
 expect(manifest.assets.map(a=>a.unitId).sort()).toEqual([...ids].sort());
 for(const asset of manifest.assets){
  expect(createHash('sha256').update(await readFile(`public/assets/painted/walk/${asset.file}`)).digest('hex')).toBe(asset.sha256);
  await page.evaluate(async file=>{
   const im=new Image();im.src=new URL(`assets/painted/walk/${file}`,document.baseURI).href;await im.decode();if(im.naturalWidth!==1536||im.naturalHeight!==256)throw Error(`Bad strip ${file}`);
   const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),hashes=[];
   for(let f=0;f<6;f++){ctx.clearRect(0,0,256,256);ctx.drawImage(im,f*256,0,256,256,0,0,256,256);const data=ctx.getImageData(0,0,256,256).data;let transparent=false,solid=false;for(let i=3;i<data.length;i+=4){transparent ||= data[i]===0;solid ||= data[i]>220;const pixel=(i-3)/4,x=pixel%256,y=Math.floor(pixel/256);if(data[i]>16&&(x===0||x===255||y===0||y===255))throw Error(`Clipped boundary ${file} frame ${f}`);}if(!transparent||!solid)throw Error(`Bad alpha ${file} frame ${f}`);hashes.push([...new Uint8Array(await crypto.subtle.digest('SHA-256',data))].join(','));}
   if(new Set(hashes).size!==6)throw Error(`Duplicate poses ${file}`);
  },asset.file);
 }
 const strips=page.locator('#walk-verification .sprite-walk');expect(await strips.count()).toBe(19);
 const staticManifest=JSON.parse(await readFile('public/assets/painted/v2/manifest.json','utf8'));
 expect(staticManifest.assets).toHaveLength(3);
 for(const a of staticManifest.assets){
  expect(createHash('sha256').update(await readFile(`public/assets/painted/v2/${a.file}`)).digest('hex')).toBe(a.sha256);
  await page.evaluate(async file=>{const im=new Image();im.src=new URL(`assets/painted/v2/${file}`,document.baseURI).href;await im.decode();if(im.naturalWidth!==512||im.naturalHeight!==512)throw Error(`Bad static ${file}`);},a.file);
 }
 const positions=()=>strips.evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundPosition));
 const before=await positions();await page.waitForTimeout(420);const after=await positions();
 expect(before.every((p,i)=>p!==after[i])).toBe(true);
 const animations=await strips.evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return [s.animationName,s.animationTimingFunction,s.animationPlayState];}));
 expect(animations.every(a=>a[0]==='troop-walk-frames'&&a[1].includes('steps(6)')&&a[2]==='running')).toBe(true);
 // Observe a complete cycle, ensuring every frame index appears, not just a moving CSS property.
 const frames=await strips.first().evaluate(async el=>{const seen=new Set();const duration=parseFloat(getComputedStyle(el).animationDuration)*1000;const start=performance.now();while(performance.now()-start<duration+150){seen.add(Math.round(parseFloat(getComputedStyle(el).backgroundPositionX)/20));await new Promise(r=>setTimeout(r,30));}return [...seen].sort();});
 expect(frames).toEqual([0,1,2,3,4,5]);
 await page.locator('#campaign-motion').click();expect(await page.locator('body').getAttribute('class')).toContain('motion-paused');
 const paused=await positions();await page.waitForTimeout(300);expect(await positions()).toEqual(paused);
 expect(await strips.evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused'))).toBe(true);
 await page.locator('#campaign-motion').click();await page.emulateMedia({reducedMotion:'reduce'});
 expect(await strips.evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none'))).toBe(true);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#walk-verification').evaluate(el=>el.classList.add('motion-frozen'));
 expect(await strips.evaluateAll(els=>els.every(el=>getComputedStyle(el).animationPlayState==='paused'))).toBe(true);
 await page.locator('#walk-verification').evaluate(el=>el.remove());
 await page.locator('#campaign-import').setInputFiles('artifacts/walk-review-army.json');
 await expect(page.locator('#message')).toContainText('驗證通過');await page.locator('[data-subtab="army"]').click();
 await page.screenshot({path:'artifacts/walk-village-five-tiers.png',fullPage:true});
 await page.locator('#campaign-import').setInputFiles('artifacts/walk-review-battle.json');
 await expect(page.locator('.campaign-board .walk-art')).not.toHaveCount(0);
 expect(await page.locator('.campaign-board .enemy .unit-sprite').first().evaluate(el=>getComputedStyle(el).transform)).toContain('-1');
 for(let i=0;i<6;i++){await page.locator('.campaign-battle').screenshot({path:`artifacts/walk-battle-${i}.png`,animations:'allow'});await page.waitForTimeout(160);}
 const dl=page.waitForEvent('download');await page.locator('#campaign-export').click();await (await dl).saveAs('artifacts/walk-roundtrip.json');
 await page.locator('#campaign-import').setInputFiles('artifacts/walk-roundtrip.json');await expect(page.locator('#message')).toContainText('驗證通過');
 // Exercise command effects on the new strip renderer, not only the old atlas tests.
 await page.locator('[data-battle-cell="1,0"]').click();
 expect(await page.locator('.motion-walk .sprite-body').evaluate(el=>getComputedStyle(el).animationName)).toBe('travel-bob');
 expect(await page.locator('.motion-walk .sprite-walk').evaluate(el=>getComputedStyle(el).animationName)).toBe('troop-walk-frames');
 await page.locator('[data-battle-cell="0,1"]').click();await page.locator('#campaign-attack').selectOption('ranged-attack');await page.locator('[data-battle-cell="5,0"]').click();
 expect(await page.locator('.motion-shoot .sprite-body').evaluate(el=>getComputedStyle(el).animationName)).toBe('bow-recoil');
 await expect(page.locator('.battle-projectile')).toHaveCount(1);
 await page.locator('#campaign-spell').selectOption({value:'4'});await page.locator('#campaign-cast').click();await page.locator('[data-battle-cell="5,2"]').click();
 expect(await page.locator('.motion-frozen .sprite-walk').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
 await page.locator('#campaign-import').setInputFiles('artifacts/walk-review-battle.json');
 await page.locator('#campaign-spell').selectOption({value:'1'});await page.locator('#campaign-cast').click();await page.locator('[data-battle-cell="0,2"]').click();await page.locator('[data-battle-cell="4,2"]').click();
 await page.locator('[data-battle-cell="4,2"]').click();await page.locator('#campaign-attack').selectOption('attack');await page.locator('[data-battle-cell="5,2"]').click();
 expect(await page.locator('.motion-strike .sprite-body').evaluate(el=>getComputedStyle(el).animationName)).toBe('weapon-swing');
 await expect(page.locator('.battle-slash')).toHaveCount(1);
 expect(errors).toEqual([]);
 await writeFile('artifacts/walk-verification.json',JSON.stringify({passed:true,ids,frames,decoded:19,allAdvance:true,disabledPaused:true,reducedMotion:true,frozen:true,enemyMirror:true,newSaveRoundtrip:true,stripMovement:true,stripShooting:true,stripMelee:true,errors},null,2));
 console.log('PASS: 19 decoded/hash-verified six-frame strips, all change frames, full cycle, actual motion switch, reduced motion, freeze, enemy facing and new-save roundtrip.');
}finally{await browser.close();}
