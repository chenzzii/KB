import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
// v1.3 title screen and first-time tips are covered by test:title; older checks start from the journey view.
await page.addInitScript(()=>localStorage.setItem('jiuzhou-automation-skip-title','1'));
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await mkdir('artifacts',{recursive:true});
 await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:5173/');
 await page.locator('[data-tab="battle"]').click();
 await expect(page.locator('.army-card')).toHaveCount(5);
 await page.locator('#split').click();await expect(page.locator('[data-select="n0"]')).toContainText('5 人');
 await page.locator('#slot-a').selectOption('3');await page.locator('#slot-b').selectOption('0');await page.locator('#merge').click();await expect(page.locator('[data-select="p0"]')).toContainText('20 人');
 await page.locator('#slot-a').selectOption('0');await page.locator('#slot-b').selectOption('4');
 await page.locator('#swap').click();await page.locator('#swap').click();
 await page.locator('#recruit-unit').selectOption('yu_lin_gong_shou');await page.locator('#recruit-count').fill('2');await page.locator('#recruit').click();
 await expect(page.locator('.economy')).toContainText('9,500');
 await page.locator('[data-tab="roster"]').click();await expect(page.locator('.roster-card')).toHaveCount(25);
 await page.locator('#names').check();await expect(page.locator('.roster-card').first()).toContainText('農夫');await page.locator('#names').uncheck();
 await page.locator('[data-tab="research"]').click();await expect(page.locator('.warning-block')).toHaveCount(5);
 await page.locator('#reset').click();await page.locator('#start').click();await expect(page.locator('.cell')).toHaveCount(30);
 // Real mouse and keyboard movement, then ranged attack and normal enemy AI.
 await page.locator('[data-cell="0,0"]').focus();await page.keyboard.press('Enter');
 await page.locator('[data-cell="1,0"]').click();await expect(page.locator('[data-cell="1,0"]')).toContainText('鄉勇');
 await page.locator('[data-cell="0,1"]').click();await page.locator('#mode').click();await page.locator('[data-cell="5,1"]').click();
 await expect(page.locator('[data-select="p1"]')).toContainText('彈 11');
 await page.screenshot({path:'artifacts/battle-desktop.png',fullPage:true});
 await page.locator('#end').click();await expect(page.locator('.battle-heading h2')).toHaveText('第 02 回合',{timeout:20000});
 // Reset to the same initial state used by the CLI simulation.
 await page.locator('#reset').click();await page.locator('#start').click();await page.locator('#autoplay').click();
 await expect(page.locator('.battle-heading h2')).toHaveText('此役告捷',{timeout:30000});
 const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs('artifacts/browser-replay.json');
 const replay=JSON.parse(await readFile('artifacts/browser-replay.json','utf8'));
 const cli=JSON.parse(await readFile('artifacts/demo-replay.json','utf8'));
 expect(replay.finalStateHash).toBe(cli.finalStateHash);expect(replay.events).toEqual(cli.events);expect(replay.commands).toEqual(cli.commands);
 await page.locator('#reset').click();await page.locator('#import').setInputFiles('artifacts/browser-replay.json');
 await expect(page.locator('#message')).toContainText('重播驗證通過');await expect(page.locator('.battle-heading h2')).toHaveText('此役告捷');
 await writeFile('artifacts/tampered-replay.json',JSON.stringify({...replay,finalStateHash:'tampered'}));
 await page.locator('#import').setInputFiles('artifacts/tampered-replay.json');await expect(page.locator('#message')).toContainText('回放結果驗證失敗');
 await expect(page.locator('.battle-heading h2')).toHaveText('此役告捷');
 // Exercise the new scenario through UI commands, not direct state edits.
 await page.locator('#scenario').selectOption('abilities');await page.locator('#reset').click();await page.locator('#start').click();
 await expect(page.locator('[data-select="p3"]')).toContainText('術 3');
 await page.locator('#spell-select').selectOption('4');await page.locator('#cast-mode').click();await page.locator('[data-cell="5,0"]').click();
 await expect(page.locator('[data-cell="5,0"]')).toContainText('定身');
 await page.locator('[data-cell="0,3"]').click();await page.locator('#mode').click();await expect(page.locator('#mode')).toContainText('魔法攻擊');
 await page.locator('[data-cell="5,4"]').click();await expect(page.locator('[data-select="p3"]')).toContainText('術 2');
 await page.locator('[data-cell="0,0"]').click();await page.locator('[data-cell="4,0"]').click();await expect(page.locator('[data-cell="4,0"]')).toContainText('紙鶴靈');
 await page.screenshot({path:'artifacts/abilities-desktop.png',fullPage:true});
 // Immunity does not spend a hero scroll, but unit magic spends one charge.
 await page.locator('#reset').click();await page.locator('#start').click();await page.locator('#spell-select').selectOption('2');await page.locator('#cast-mode').click();await page.locator('[data-cell="5,3"]').click();
 await expect(page.locator('#spell-select option:checked')).toContainText('餘 2 張');await expect(page.locator('.event-list')).toContainText('免疫');
 await page.locator('[data-cell="0,3"]').click();await page.locator('#mode').click();await page.locator('[data-cell="5,3"]').click();await expect(page.locator('[data-select="p3"]')).toContainText('術 2');
 await expect(page.locator('[data-cell="5,3"]')).toContainText('200 HP');
 // Teleport follows a two-stage allied-stack / empty-destination selection.
 await page.locator('#spell-select').selectOption('1');await page.locator('#cast-mode').click();await page.locator('[data-cell="0,2"]').click();await page.locator('[data-cell="2,4"]').click();
 await expect(page.locator('[data-cell="2,4"]')).toContainText('樹魁');
 await page.locator('#reset').click();await page.locator('#start').click();await page.locator('#autoplay').click();
 await expect(page.locator('.battle-heading h2')).toHaveText(/此役告捷|此役失利/,{timeout:30000});
 const abilityDownloadPromise=page.waitForEvent('download');await page.locator('#export').click();const abilityDownload=await abilityDownloadPromise;await abilityDownload.saveAs('artifacts/browser-abilities-replay.json');
 await page.locator('#reset').click();await page.locator('#import').setInputFiles('artifacts/browser-abilities-replay.json');await expect(page.locator('#message')).toContainText('重播驗證通過');
 await expect(page.locator('#scenario')).toHaveValue('abilities');
 await page.locator('#scenario').selectOption('skirmish');
 await page.setViewportSize({width:390,height:844});await page.locator('#reset').click();await page.locator('#start').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'artifacts/battle-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
 console.log('PASS: ability scenario, flight, unit magic, hero freeze, magic immunity, teleport, new scenario replay; browser formation, recruitment, 25-unit roster, provenance warnings, keyboard/mouse movement, ranged ammo, enemy AI, complete battle, replay export/import, tamper rejection, responsive layout, no JS errors.');
 console.log(`Browser and CLI final SHA256: ${replay.finalStateHash}`);
}finally{await browser.close();}
