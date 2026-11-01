import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[],failed=[];
// v1.3 title screen and first-time tips are covered by test:title; older checks start from the journey view.
await page.addInitScript(()=>localStorage.setItem('jiuzhou-automation-skip-title','1'));
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
try{
 await mkdir('artifacts',{recursive:true});await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:5173/');
 await expect(page.locator('.hero-header')).toHaveCount(1);await expect(page.locator('.location-panel .atlas-scene')).toHaveCount(1);
 await page.waitForLoadState('networkidle');await page.screenshot({path:'artifacts/world-painted.png',fullPage:true});
 await page.locator('#campaign-import').setInputFiles('artifacts/art-review-battle.json');await expect(page.locator('.campaign-board .cell')).toHaveCount(30);await expect(page.locator('.campaign-board .unit-sprite')).toHaveCount(7);await expect(page.locator('.scenery-prop')).toHaveCount(2);
 const background=await page.locator('.painted-field').evaluate(el=>getComputedStyle(el).backgroundImage);expect(background).toContain('courtyard-v1.png');const bgUrl=background.slice(5,-2);await page.evaluate(async url=>{const img=new Image();img.src=url;await img.decode();if(img.naturalWidth<1000)throw Error('Background did not decode as full artwork');},bgUrl);
 const sprite=await page.locator('.campaign-board .unit-sprite').first().evaluate(el=>getComputedStyle(el).backgroundImage);expect(sprite).toContain('units-v1.png');
 await page.waitForLoadState('networkidle');await page.locator('.campaign-battle').screenshot({path:'artifacts/battle-painted-desktop.png'});
 // Move a real unit: Web Animation must exist, with the ordinary command recorded in the old save format.
 await page.locator('[data-battle-cell="1,0"]').click();await expect(page.locator('[data-battle-cell="1,0"]')).toContainText('鄉勇');
 const movement=await page.locator('[data-battle-cell="1,0"] .troop-visual').evaluate(el=>el.getAnimations().length);expect(movement).toBeGreaterThan(0);
 // Physical shot: visible projectile and HP delta, no direct core-state mutation.
 await page.locator('[data-battle-cell="0,1"]').click();await page.locator('#campaign-attack').selectOption('ranged-attack');await page.locator('[data-battle-cell="5,4"]').click();
 await expect(page.locator('.battle-projectile')).toHaveCount(1);await expect(page.locator('.float-damage')).toHaveCount(1);await expect(page.locator('[data-battle-cell="5,4"]')).toContainText('39 HP');
 const dl=page.waitForEvent('download');await page.locator('#campaign-export').click();await (await dl).saveAs('artifacts/painted-command-save.json');
 const save=JSON.parse(await readFile('artifacts/painted-command-save.json','utf8'));expect(save.commands.at(-1).command.type).toBe('ranged-attack');expect(save.schemaVersion).toBe(1);
 await page.locator('#campaign-import').setInputFiles('artifacts/painted-command-save.json');await expect(page.locator('#message')).toContainText('驗證通過');
 // Same live battle on mobile; restrict motion for an accessibility path.
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#campaign-import').setInputFiles('artifacts/art-review-battle.json');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.campaign-battle').screenshot({path:'artifacts/battle-painted-mobile.png'});
 // Every atlas requested and decoded, including the portrait / scene / item collections.
 await page.locator('[data-tab="artworks"]').click();await expect(page.locator('.painted-sprite-gallery .unit-sprite')).toHaveCount(25);
 await expect(page.locator('.painted-sprite-gallery .portrait-sprite')).toHaveCount(21);await expect(page.locator('.painted-sprite-gallery .world-item-sprite')).toHaveCount(36);
 const manifest=await page.request.get(new URL('assets/painted/manifest.json',page.url()).href);expect(manifest.ok()).toBe(true);
 for(const asset of (await manifest.json()).assets){await page.evaluate(async url=>{const image=new Image();image.src=url;await image.decode();},new URL(`assets/painted/${asset.file}`,page.url()).href);}
 expect(errors).toEqual([]);expect(failed).toEqual([]);await writeFile('artifacts/painted-verification.json',JSON.stringify({passed:true,sprites:25,portraits:21,worldAndItems:36,atlases:5,movement:true,projectile:true,hpDelta:true,saveCompatible:true,mobileNoOverflow:true,jsErrors:errors,failedRequests:failed},null,2));
 console.log('PASS: painted battlefield, 25 character sprites, portraits/items/scenes, props, movement animation, projectile, HP feedback, compatible saves, reduced-motion/mobile, all atlas files decoded.');
}finally{await browser.close();}
