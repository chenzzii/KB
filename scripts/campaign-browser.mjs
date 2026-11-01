import {chromium,expect} from '@playwright/test';
import {mkdir,readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
// v1.3 title screen and first-time tips are covered by test:title; older checks start from the journey view.
await page.addInitScript(()=>localStorage.setItem('jiuzhou-automation-skip-title','1'));
const go=async(id,name)=>{await page.locator(`[data-destination="${id}"]`).click();await expect(page.locator('.location-body h3')).toHaveText(name,{timeout:20000});};
try{
 await mkdir('artifacts',{recursive:true});await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:5173/');
 await expect(page.locator('.journey-header h2')).toHaveText('烽火歸途');await expect(page.locator('.world-tile')).toHaveCount(1024);
 await page.locator('[data-action="accept"]').click();await page.locator('[data-artifact="3"]').click();
 await page.screenshot({path:'artifacts/world-desktop.png',fullPage:true});
 await page.locator('[data-subtab="army"]').click();await page.locator('#world-recruit').click();await expect(page.locator('.company').first()).toContainText('25 人');
 await page.locator('[data-subtab="spells"]').click();await expect(page.locator('.spell-library article')).toHaveCount(14);await page.locator('[data-adventure-spell="13"]').click();
 await page.locator('[data-subtab="map"]').click();await go('7,5','柳灣鄉營');await go('10,8','斷雁寨');await page.locator('[data-route="alliance"]').click();
 await expect(page.locator('.quest-short')).toContainText('斷雁寨');
 // Traverse the original world and enter a real encounter through its waypoint.
 await page.locator('[data-world="11,12"]').click();await expect(page.locator('.location-body h3')).toHaveText('燕山快刀朱三刀',{timeout:20000});
 await page.locator('[data-action="fight"]').click();await expect(page.locator('.campaign-board .cell')).toHaveCount(30);
 await page.screenshot({path:'artifacts/campaign-combat.png',fullPage:true});await page.locator('#campaign-auto').click();await expect(page.locator('.campaign-board')).toHaveCount(0,{timeout:30000});
 await page.locator('[data-subtab="spells"]').click();await page.locator('[data-adventure-spell="11"]').click();await page.locator('[data-subtab="map"]').click();await expect(page.locator('.location-body h3')).toHaveText('青禾府');await page.locator('[data-action="claim"]').click();
 await page.locator('[data-subtab="journal"]').click();await expect(page.locator('.bounty-grid article')).toHaveCount(17);await expect(page.locator('.artifact-grid article')).toHaveCount(8);
 await page.screenshot({path:'artifacts/journal-art.png',fullPage:true});
 const pending=page.waitForEvent('download');await page.locator('#campaign-export').click();await (await pending).saveAs('artifacts/browser-campaign.json');
 await page.locator('#campaign-import').setInputFiles('artifacts/browser-campaign.json');await expect(page.locator('#message')).toContainText('SHA-256 驗證通過');
 await page.locator('#campaign-local').click();await expect(page.locator('#message')).toContainText('SHA-256 驗證通過');
 // Load and replay all six completed, normally played campaign command sequences in the browser.
 for(const mode of ['enhanced','study'])for(const route of ['conquest','alliance','trade']){
  await page.locator('#campaign-import').setInputFiles(`artifacts/campaign-${mode}-${route}.json`);
  await expect(page.locator('.ending-panel h2')).toHaveText({conquest:'山河歸旗',alliance:'百川盟誓',trade:'雲路無疆'}[route],{timeout:30000});
 }
 await page.screenshot({path:'artifacts/ending-desktop.png',fullPage:true});
 // Invalid save does not replace the validated ending.
 const bad=JSON.parse(await readFile('artifacts/campaign-enhanced-trade.json','utf8'));bad.snapshot.gold++;
 await page.locator('#campaign-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await expect(page.locator('#message')).toContainText('存檔重算不一致');await expect(page.locator('.ending-panel h2')).toHaveText('雲路無疆');
 await page.locator('#open-new-game').click();await page.locator('#new-hero').selectOption('fang_shi');await page.locator('#new-mode').selectOption('study');await page.locator('#campaign-new').click();
 await expect(page.locator('.journey-header')).toContainText('方士');await expect(page.locator('.journey-header')).toContainText('研究基準');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/world-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('[data-tab="artworks"]').click();await expect(page.locator('.art-atlas img')).toHaveCount(86);await page.evaluate(async()=>{const imgs=[...document.querySelectorAll('.art-atlas img')];for(const img of imgs)img.loading='eager';await Promise.all(imgs.map(img=>img.decode()));});await page.locator('.art-atlas img').last().scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/original-art-gallery.png',fullPage:true});
 expect(errors).toEqual([]);expect(missing).toEqual([]);console.log('PASS: world navigation, recruit, 14 spells, route, real battle, bounty, all assets, save/local load, six full-journey replays/endings, corrupt save rejection, class/mode choice, mobile layout, no missing assets or JS errors.');
}finally{await browser.close();}
