import {chromium,expect} from '@playwright/test';
import {build} from 'vite';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
// v1.3 title screen and first-time tips are covered by test:title; older checks start from the journey view.
await page.addInitScript(()=>localStorage.setItem('jiuzhou-automation-skip-title','1'));
try{
 await mkdir('artifacts',{recursive:true});
 // Observe real AudioContexts, not a mocked synthesizer.
 await page.addInitScript(()=>{window.__audioContexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__audioContexts.push(this);}};});
 await page.goto(process.env.SMOKE_URL||'http://127.0.0.1:5173/');
 await expect(page.locator('#campaign-music')).toHaveAttribute('data-music-track','off');await page.locator('#campaign-music').click();await expect(page.locator('#campaign-music')).toHaveAttribute('data-music-track','map');await expect(page.locator('#soundtrack-title')).toHaveText('♪ 青嵐遠行');
 expect(await page.evaluate(()=>window.__audioContexts.filter(c=>c.state==='running').length)).toBe(1);
 // Volume and navigation must not create extra contexts or restart playback on every map render.
 await page.locator('#music-volume').focus();await page.locator('#music-volume').press('Home');for(let i=0;i<23;i++)await page.locator('#music-volume').press('ArrowRight');await page.locator('[data-action="accept"]').click();await expect(page.locator('#music-volume')).toHaveValue('23');
 await page.locator('#campaign-import').setInputFiles('artifacts/art-review-battle.json');await expect(page.locator('#campaign-music')).toHaveAttribute('data-music-track','battle');await expect(page.locator('#soundtrack-title')).toHaveText('♪ 烽鼓破陣');
 const idle=await page.locator('.campaign-board .sprite-body').evaluateAll(els=>els.map(el=>({name:getComputedStyle(el).animationName,state:getComputedStyle(el).animationPlayState,transform:getComputedStyle(el).transform})));
 expect(idle.length).toBe(7);expect(idle.every(a=>a.name!=='none'&&a.state==='running')).toBe(true);
 await page.locator('[data-battle-cell="1,0"]').click();await expect(page.locator('.motion-walk')).toHaveCount(1);expect(await page.locator('.motion-walk').evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);
 await page.locator('[data-battle-cell="0,1"]').click();await page.locator('#campaign-attack').selectOption('ranged-attack');await page.locator('[data-battle-cell="5,4"]').click();await expect(page.locator('.motion-shoot')).toHaveCount(1);await expect(page.locator('.battle-projectile')).toHaveCount(1);
 // Freeze is an ordinary spell; frozen troops really pause their idle animation.
 await page.locator('#campaign-spell').selectOption({value:'4'});await page.locator('#campaign-cast').click();await page.locator('[data-battle-cell="5,0"]').click();await expect(page.locator('.motion-frozen')).toHaveCount(1);expect(await page.locator('.motion-frozen .sprite-body').evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');
 const dl=page.waitForEvent('download');await page.locator('#campaign-export').click();await (await dl).saveAs('artifacts/motion-command-save.json');await page.locator('#campaign-import').setInputFiles('artifacts/motion-command-save.json');await expect(page.locator('#message')).toContainText('驗證通過');
 await page.locator('#campaign-motion').click();expect(await page.locator('.campaign-board .sprite-body').first().evaluate(el=>getComputedStyle(el).animationPlayState)).toBe('paused');await page.locator('#campaign-motion').click();
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.campaign-board .sprite-body').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.campaign-battle').screenshot({path:'artifacts/animated-battle.png'});
 // Reach melee using a normal teleport spell, then attack with the ordinary command.
 await page.locator('#campaign-import').setInputFiles('artifacts/art-review-battle.json');await page.locator('#campaign-spell').selectOption({value:'1'});await page.locator('#campaign-cast').click();await page.locator('[data-battle-cell="0,0"]').click();await page.locator('[data-battle-cell="4,0"]').click();await page.locator('[data-battle-cell="4,0"]').click();await page.locator('#campaign-attack').selectOption('attack');await page.locator('[data-battle-cell="5,0"]').click();await expect(page.locator('.motion-strike')).toHaveCount(1);await expect(page.locator('.battle-slash')).toHaveCount(1);
 await page.locator('[data-action="retreat"]').click();await expect(page.locator('#campaign-music')).toHaveAttribute('data-music-track','map');
 await page.locator('[data-tab="artworks"]').click();await expect(page.locator('.painted-sprite-gallery .unit-sprite')).toHaveCount(25);
 const poses=()=>page.locator('.painted-sprite-gallery .unit-sprite').evaluateAll(els=>els.map(el=>[...el.querySelectorAll('.sprite-body,.sprite-upper,.sprite-leg')].map(part=>{const css=getComputedStyle(part);return [css.transform,css.translate,css.rotate,css.scale].join('|');}).join(';')));
 const first=await poses();await page.waitForTimeout(240);const second=await poses();expect(first.every((pose,i)=>pose!==second[i])).toBe(true);
 const profiles=await page.locator('.painted-sprite-gallery .unit-sprite').evaluateAll(els=>els.map(el=>el.dataset.motion));expect(new Set(profiles).size).toBeGreaterThan(10);
 await page.locator('[data-tab="journey"]').click();await expect(page.locator('#campaign-music')).toHaveAttribute('data-music-track','map');expect(await page.evaluate(()=>window.__audioContexts.length)).toBe(1);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/motion-music-mobile.png',fullPage:true});
 await page.locator('#campaign-music').click();await expect(page.locator('#campaign-music')).toHaveAttribute('data-music-track','off');
 // Render the exact production instruments offline for listening and non-silent / clipping checks.
 const result=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,lib:{entry:'scripts/music-review-entry.ts',name:'MusicReview',formats:['iife']}}});
 const output=Array.isArray(result)?result[0].output:result.output;await page.addScriptTag({content:output.find(x=>x.type==='chunk').code});
 const audioResults={};
 for(const scene of ['map','battle']){
  const rendered=await page.evaluate(async scene=>{const score=MusicReview.scores[scene],sampleRate=22050,beats=64,seconds=beats*60/score.bpm+2;const ctx=new OfflineAudioContext(2,Math.ceil(seconds*sampleRate),sampleRate);MusicReview.scheduleScore(ctx,score,ctx.destination,beats);const audio=await ctx.startRendering();
   let peak=0,sum=0;for(let ch=0;ch<2;ch++){const values=audio.getChannelData(ch);for(const v of values){peak=Math.max(peak,Math.abs(v));sum+=v*v;}}
   const wav=new ArrayBuffer(44+audio.length*4),view=new DataView(wav);const ascii=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};ascii(0,'RIFF');view.setUint32(4,36+audio.length*4,true);ascii(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,audio.length*4,true);
   const left=audio.getChannelData(0),right=audio.getChannelData(1);for(let i=0;i<audio.length;i++){view.setInt16(44+i*4,Math.max(-1,Math.min(1,left[i]))*32767,true);view.setInt16(46+i*4,Math.max(-1,Math.min(1,right[i]))*32767,true);}
   const bytes=new Uint8Array(wav);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {base64:btoa(binary),peak,rms:Math.sqrt(sum/(audio.length*2)),duration:audio.duration,voices:[...new Set(score.notes.map(n=>n.voice))],title:score.title,bpm:score.bpm};
  },scene);
  expect(rendered.peak).toBeLessThan(1);expect(rendered.rms).toBeGreaterThan(.005);expect(rendered.rms).toBeLessThan(.4);await writeFile(`artifacts/${scene}-music-preview.wav`,Buffer.from(rendered.base64,'base64'));delete rendered.base64;audioResults[scene]=rendered;
 }
 expect(audioResults.map.duration).toBeGreaterThan(audioResults.battle.duration);expect(errors).toEqual([]);
 await writeFile('artifacts/presentation-verification.json',JSON.stringify({passed:true,animatedTroops:25,motionProfiles:new Set(profiles).size,idleChangesOverTime:true,walking:true,shooting:true,meleeStrike:true,frozenPaused:true,reducedMotion:true,musicAutomaticSwitch:true,musicOneContext:true,volumePersists:true,savesCompatible:true,mobileNoOverflow:true,audio:audioResults,jsErrors:errors},null,2));
 console.log('PASS: all 25 animated units, walking/shooting/freeze, motion controls, save replay, map/battle music switching, one live AudioContext, volume, mobile, and two rendered musical previews without clipping.');console.log(JSON.stringify(audioResults));
}finally{await browser.close();}
