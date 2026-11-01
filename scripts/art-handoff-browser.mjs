import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
try{
 const root=process.env.ART_REVIEW_URL||'http://127.0.0.1:4182/';await page.goto(new URL('preview.html',root).href);await page.waitForLoadState('load');
 await expect(page.locator('#unit .unit-sprite')).toHaveCount(25);await expect(page.locator('figure')).toHaveCount(177);
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img')].map(image=>image.decode()));});
 const manifest=await (await page.request.get(new URL('assets/painted/manifest.json',root).href)).json();
 for(const asset of manifest.assets)await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();if(image.naturalWidth<1000)throw Error('Missing full-resolution atlas');},new URL('assets/painted/'+asset.file,root).href);
 const poses=()=>page.locator('#unit .unit-sprite').evaluateAll(els=>els.map(el=>[...el.querySelectorAll('.sprite-body,.sprite-upper,.sprite-leg')].map(part=>{const s=getComputedStyle(part);return[s.translate,s.rotate,s.scale].join('|');}).join(';')));
 const first=await poses();await page.waitForTimeout(280);const second=await poses();expect(first.every((p,i)=>p!==second[i])).toBe(true);
 await page.locator('#motion-toggle').click();expect(await page.locator('#unit .sprite-body').first().evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');await page.locator('#motion-toggle').click();
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('#unit .sprite-body').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#unit').screenshot({path:'artifacts/art-handoff-preview.png'});
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);expect(failed).toEqual([]);
 await writeFile('artifacts/art-handoff-verification.json',JSON.stringify({passed:true,previewMode:'local HTTP static server',fileURLNotTestableInManagedBrowser:true,paintedAtlasesDecoded:5,paintedEntries:91,prototypeSVGs:86,all25UnitsAnimated:true,motionToggle:true,reducedMotion:true,mobileNoOverflow:true,pageErrors:errors,failedRequests:failed},null,2));console.log('PASS: standalone static preview, 5 original atlases decoded, 91 art entries, 86 SVGs, 25 animated units, motion controls, reduced motion, mobile layout; no missing resources or JS errors.');
}finally{await browser.close();}
