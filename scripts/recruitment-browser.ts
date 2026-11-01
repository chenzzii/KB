import {chromium,expect} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {Campaign} from '../src/campaign/session';
import {travel} from './campaign-playthrough';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];
// v1.3 title screen and first-time tips are covered by test:title; older checks start from the journey view.
await page.addInitScript(()=>localStorage.setItem('jiuzhou-automation-skip-title','1'));
page.on('pageerror',err=>errors.push(err.message));
const save=async()=>{const next=page.waitForEvent('download');await page.locator('#campaign-export').click();await (await next).saveAs('artifacts/recruitment-save.json');const value=JSON.parse(await readFile('artifacts/recruitment-save.json','utf8'));await Campaign.load(value);return value;};
const load=async(game:Campaign)=>{await page.locator('#campaign-import').setInputFiles({name:'recruitment.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(await game.save()))});await expect(page.locator('#message')).toContainText('驗證通過');await page.locator('#open-recruitment').click();};
try{
 await mkdir('artifacts',{recursive:true});
 for(const mode of ['enhanced','study'])for(const hero of ['wu_jiang','ru_jiang','hao_xia','fang_shi']){
  await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:5173/');
  await page.locator('#open-new-game').click();await page.locator('#new-hero').selectOption(hero);await page.locator('#new-mode').selectOption(mode);await page.locator('#campaign-new').click();
  await page.locator('[data-action="accept"]').click();await page.locator('[data-destination="7,5"]').click();await expect(page.locator('.location-body h3')).toHaveText('柳灣鄉營');
  await page.locator('#open-recruitment').click();await expect(page.locator('#recruitment-title')).toHaveText('柳灣鄉營 · 招募');
  const before=await save(),target=Number(await page.locator('#world-recruit-slot').inputValue());
  expect(before.snapshot.army[target]?.unitId??'xiang_yong').toBe('xiang_yong');await expect(page.locator('#world-recruit')).toBeEnabled();
  await page.locator('#world-recruit').click();await expect(page.locator('#recruitment-result')).toContainText('已招募 鄉勇 5 人');
  const after=await save();expect(after.snapshot.gold).toBe(before.snapshot.gold-250);expect(after.snapshot.army[target].count).toBe((before.snapshot.army[target]?.count??0)+5);expect(after.snapshot.supplies.village.xiang_yong).toBe(15);expect(after.commands.at(-1)).toEqual({type:'recruit-world',unitId:'xiang_yong',count:5,slot:target});
  // Typing updates the preview without replacing the focused input, and invalid counts never issue commands.
  for(const amount of ['0','1.5','16']){await page.locator('#world-count').fill(amount);await expect(page.locator('#world-count')).toBeFocused();await expect(page.locator('#world-recruit')).toBeDisabled();await expect(page.locator('#recruitment-issue')).not.toBeEmpty();}
  const unchanged=await save();expect(unchanged.stateHash).toBe(after.stateHash);expect(unchanged.commands.length).toBe(after.commands.length);
  await page.locator('#world-count').fill('5');await expect(page.locator('#world-recruit')).toBeEnabled();
  await page.locator('#world-recruit-unit').selectOption('zhi_he_ling');const birdSlot=Number(await page.locator('#world-recruit-slot').inputValue());
  expect(after.snapshot.army[birdSlot]?.unitId??'zhi_he_ling').toBe('zhi_he_ling');await expect(page.locator('#world-recruit')).toBeEnabled();
  await page.locator('#world-recruit').click();await expect(page.locator('#recruitment-result')).toContainText('已招募 紙鶴靈 5 人');await save();
 }
 // Valid, replayable journeys exercise occupied slots, the leadership limit and depleted stock.
 const full=new Campaign();travel(full,'village');full.dispatch({type:'recruit-world',unitId:'xiang_yong',count:20,slot:0});full.dispatch({type:'wait',days:5});full.dispatch({type:'recruit-world',unitId:'xiang_yong',count:10,slot:0});
 await load(full);await page.locator('#world-recruit-unit').selectOption('xiang_yong');await expect(page.locator('#world-recruit-slot')).toHaveValue('2');
 await page.locator('#world-recruit-slot').selectOption('0');await expect(page.locator('#world-recruit')).toBeDisabled();await expect(page.locator('#recruitment-issue')).toContainText('統率上限');
 await page.locator('#world-recruit-slot').selectOption('1');await expect(page.locator('#world-recruit')).toBeDisabled();await expect(page.locator('#recruitment-issue')).toContainText('不同兵種');
 const emptyStock=new Campaign();travel(emptyStock,'village');emptyStock.dispatch({type:'recruit-world',unitId:'xiang_yong',count:20,slot:0});await load(emptyStock);await expect(page.locator('#world-recruit')).toBeDisabled();await expect(page.locator('#recruitment-issue')).toContainText('庫存已用盡');
 const roster=new Campaign();travel(roster,'village');for(const [slot,unitId] of [[2,'zhi_he_ling'],[3,'xiang_min'],[4,'shan_lang']] as const)roster.dispatch({type:'recruit-world',unitId,count:1,slot});await load(roster);await page.locator('#world-recruit-unit').selectOption('shan_min_duan_gong');await expect(page.locator('#world-recruit')).toBeDisabled();await expect(page.locator('#recruitment-issue')).toContainText('不同兵種');
 // The split amount and the recruit destination are independent of formation controls.
 const fresh=new Campaign();travel(fresh,'village');await load(fresh);await page.locator('#world-recruit-unit').selectOption('xiang_yong');await page.locator('#world-count').fill('1');await page.locator('#world-split-count').fill('3');await page.locator('#world-other').selectOption({value:'4'});await page.locator('#world-split').click();const split=await save();expect(split.snapshot.army[0].count).toBe(17);expect(split.snapshot.army[4].count).toBe(3);
 await page.locator('#world-recruit').click();const recruited=await save();expect(recruited.snapshot.army[0].count).toBe(18);expect(recruited.snapshot.army[4].count).toBe(3);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('.recruitment-panel').screenshot({path:'artifacts/recruitment-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});await page.locator('.recruitment-panel').screenshot({path:'artifacts/recruitment-desktop.png'});
 expect(errors).toEqual([]);await writeFile('artifacts/recruitment-verification.json',JSON.stringify({passed:true,heroAndModeCombinations:8,directCampEntry:true,autoCompatibleSlot:true,realGoldAndStockDebit:true,invalidInputBlocked:true,fullLeadershipAndOccupiedSlotFeedback:true,depletedStockFeedback:true,formationIndependent:true,saveReplay:true,mobileNoOverflow:true,jsErrors:errors},null,2));
 console.log('PASS: eight class/mode journeys to village, direct recruitment, compatible slot selection, real gold/stock/army changes, invalid input, capacity/occupied/depleted feedback, formation independence, save replay and mobile layout.');
}finally{await browser.close();}
