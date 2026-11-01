import './intro.css';
import {heroClasses} from './campaign/content';
import {units} from './content/load';
import {portraitFigure,unitFigure} from './art/painted';
import {soundtrack} from './audio/soundtrack';
import {settings,saveSettings} from './settings';
import {resetTips} from './tips';
import type {RulesMode} from './campaign/types';

export type StartChoice={heroId:string;mode:RulesMode;seed:string};
type Hooks={start:(choice:StartChoice)=>void;resume:()=>Promise<boolean>;hasSave:()=>boolean;closed:()=>void};
const atlas=import.meta.env.BASE_URL+'assets/painted/portraits-v1.png';
const e=(x:unknown)=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

const story:{scene:number;lines:string[];foes?:boolean}[]=[
 {scene:0,lines:['九州之上，烽臺相望。','千百年來，天衡烽臺一旦點燃，軍令便沿著山河傳遍九州，各地城關據此守望相助。']},
 {scene:1,lines:['三年前一個無月之夜，烽火無故熄滅。','鎮守烽臺的三枚山河印——木印、水印、山印——散落四方。軍令斷絕，城關各自為政。']},
 {scene:3,foes:true,lines:['盜寇、叛將、妖侯與幽冥商旅趁亂而起。','斷雁寨扣住糧道與木印，聽雨古廟的石碑守著水印，荒野的十七名作亂之徒，則握著山印的下落。城門上貼滿了他們的懸賞令。']},
 {scene:0,lines:['青禾府郡守召來一位行旅之人——就是你。','接下委託，招募部曲，在一百八十日內尋回三印，前往天衡烽臺，重燃烽火。']},
 {scene:2,lines:['討伐、招安，還是交易？','你在斷雁寨的選擇，將決定烽火最後傳向何方。']}
];
const heroInfo:Record<string,{title:string;style:string;traits:string[];level:string}>={
 wu_jiang:{title:'沙場宿將',style:'正面作戰，穩紮穩打',level:'新手推薦',traits:['統率高，一開始就能帶較多兵','開局銀兩與每週俸祿都較少，要精打細算','起手有弓手，可遠近搭配']},
 ru_jiang:{title:'運籌儒將',style:'先經營、再擴軍',level:'容易上手',traits:['開局銀兩最多，可大量招兵','兩隊步兵，人多但單兵較弱','統率中等，需要拆隊運用']},
 hao_xia:{title:'江湖豪俠',style:'遊走四方，快攻懸賞',level:'中等',traits:['山狼行動快，適合先手突擊','統率高，但只有一隊起始部曲','每週俸祿 2,000，收入比武將、儒將多']},
 fang_shi:{title:'雲遊方士',style:'以符籙取勝',level:'進階',traits:['法力 2：英雄法術威力加倍','統率最低，帶兵規模受限','開局銀兩多，每週俸祿 3,000 最高']}
};
const help=[
 ['旅程目標','在 180 日內尋回木、水、山三枚山河印，帶到天衡烽臺完成旅程。日程用完或全軍覆沒即失敗。'],
 ['大地圖','點格子自動尋路，或用方向鍵移動。每日 40 步；竹林、澤地或雨天每格耗 2 步。綠框「募」可招兵，紅框「戰」是敵將據點，進入後才會選擇交戰。'],
 ['部曲與統率','最多 5 隊。每隊「人數 × 單兵生命」不能超過統率。招兵要花銀兩，之後每週還要付軍餉。'],
 ['戰鬥','6 × 5 戰場。選我方兵團後點空格移動、點敵軍攻擊；可切換近戰、遠射或兵種魔法，英雄每回合另可施一道符籙。打不過可以撤退。'],
 ['金錢來源','每週（5 日）自動領取職業俸祿，同時支付部曲軍餉；擊敗敵將後回任何城鎮領取討伐賞金。'],
 ['三條路線','斷雁寨可討伐、招安或交易，選擇不可逆，會決定結局。'],
 ['存檔','旅程會自動存在本機瀏覽器；也可以匯出成檔案保存，之後匯入繼續。'],
 ['規則模式','「華夏改良」是本作的建議規則；「研究基準」用來對照來源研究資料，不保證等同 DOS 原版。']
];

let root:HTMLElement|null=null,hooks:Hooks,page=0,heroId='wu_jiang',mode:RulesMode='enhanced',seed='jiuzhou-2026',screen:'title'|'story'|'select'='title',helpOpen=false;

function bg(scene:number){const i=21+scene;return `<div class="title-bg" aria-hidden="true"><span style="background-image:url('${atlas}');background-position:${i%5*25}% ${Math.floor(i/5)*25}%"></span></div>`;}
function toggles(){
 return `<div class="title-settings"><h3>聲音與畫面</h3>
 <label class="switch"><input type="checkbox" id="opt-music" ${settings.music?'checked':''}><span>配樂</span><small>地圖〈青嵐遠行〉、戰鬥〈烽鼓破陣〉</small></label>
 <label class="volume">配樂音量 <input type="range" id="opt-volume" min="0" max="100" value="${Math.round(soundtrack.volume*100)}" aria-label="配樂音量"></label>
 <label class="switch"><input type="checkbox" id="opt-sfx" ${settings.sfx?'checked':''}><span>音效</span><small>移動、攻擊、施法的提示音</small></label>
 <label class="switch"><input type="checkbox" id="opt-motion" ${settings.motion?'checked':''}><span>部隊動作</span><small>兵種待機與戰鬥動畫</small></label>
 <label class="switch"><input type="checkbox" id="opt-tips" ${settings.tips?'checked':''}><span>首次提示</span><small>第一次遇到新功能時說明</small></label>
 <label class="switch"><input type="checkbox" id="opt-skip-story" ${settings.skipStory?'checked':''}><span>略過開場故事</span><small>下次直接進入選角</small></label>
 <button id="opt-reset-tips" class="ghost">重新顯示所有提示</button></div>`;
}
function helpHTML(){return `<div class="title-help" role="dialog" aria-modal="true" aria-labelledby="help-title"><div class="title-help-card"><p class="eyebrow">HOW TO PLAY</p><h2 id="help-title">遊戲說明</h2><dl>${help.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl><button class="primary" id="help-close">回到選單</button></div></div>`;}

function titleHTML(){
 const save=hooks.hasSave();
 return `${bg(0)}<div class="title-main"><span class="title-seal" aria-hidden="true">九<br>州</span><p class="eyebrow">JIUZHOU · THE BEACONS RETURN</p><h1>九州兵譜</h1><p class="title-sub">烽火歸途</p>
 <div class="title-menu">${save?'<button class="primary" id="title-continue">繼續旅程</button>':''}<button class="${save?'':'primary'}" id="title-new">開始新旅程</button><button id="title-help">遊戲說明</button><button id="title-options">設定</button></div>
 <p class="title-foot">原創華夏戰略 RPG · v1.3.1</p></div>`;
}
function storyHTML(){
 const s=story[page],last=page===story.length-1;
 return `${bg(s.scene)}<div class="story-box"><p class="eyebrow">序章 · ${page+1} / ${story.length}</p>${s.foes?`<div class="story-foes">${Array.from({length:7},(_,i)=>portraitFigure(4+[0,4,6,8,11,13,16][i],'懸賞敵將','story-foe')).join('')}</div>`:''}${s.lines.map((l,i)=>`<p class="${i===0?'story-lead':''}">${e(l)}</p>`).join('')}
 <div class="story-actions"><button id="story-skip" class="ghost">跳過故事</button>${page>0?'<button id="story-prev">上一頁</button>':''}<button class="primary" id="story-next">${last?'選擇身分':'下一頁'}</button></div></div>`;
}
function selectHTML(){
 const hero=heroClasses.find(h=>h.id===heroId)!,info=heroInfo[heroId];
 return `${bg(1)}<div class="select-wrap"><div class="select-head"><div><p class="eyebrow">CHOOSE YOUR ROLE</p><h2>選擇你的身分</h2></div><div><button id="select-story" class="ghost">重看故事</button><button id="select-help">遊戲說明</button><button id="select-back" class="ghost">返回標題</button></div></div>
 <div class="hero-grid" role="radiogroup" aria-label="職業">${heroClasses.map((h,i)=>`<button role="radio" aria-checked="${h.id===heroId}" class="hero-card ${h.id===heroId?'chosen':''}" data-hero="${h.id}">${portraitFigure(i,h.name,'hero-pick')}<span><strong>${h.name}</strong><small>${heroInfo[h.id].title}</small><em>${heroInfo[h.id].level}</em></span></button>`).join('')}</div>
 <div class="select-body"><section class="hero-detail"><div class="hero-detail-head">${portraitFigure(heroClasses.indexOf(hero),hero.name,'hero-big')}<div><p class="eyebrow">${info.level}</p><h3>${hero.name} · ${info.title}</h3><p>${info.style}</p></div></div>
 <dl class="hero-stats"><div><dt>統率</dt><dd>${hero.leadership}</dd></div><div><dt>起始銀兩</dt><dd>${hero.gold.toLocaleString()}</dd></div><div><dt>每週俸祿（收入）</dt><dd>${hero.commission.toLocaleString()}</dd></div><div><dt>法力</dt><dd>${hero.power}</dd></div></dl>
 <ul class="hero-traits">${info.traits.map(t=>`<li>${t}</li>`).join('')}</ul>
 <h4>起始部曲</h4><div class="hero-army">${hero.army.map(([u,n])=>`<span>${unitFigure(units[u].sourceTroopId,units[u].name,'army-pick')}<b>${units[u].name}</b><small>× ${n}</small></span>`).join('')}</div>
 <details class="advanced"><summary>進階設定</summary><label>規則模式<select id="opt-mode"><option value="enhanced" ${mode==='enhanced'?'selected':''}>華夏改良（建議）</option><option value="study" ${mode==='study'?'selected':''}>研究基準（非 DOS 已驗證）</option></select></label><label>亂數種子<input id="opt-seed" value="${e(seed)}" maxlength="200"></label></details>
 </section>${toggles()}</div>
 <div class="select-go">${hooks.hasSave()?'<small>開始新旅程會覆蓋本機自動存檔；需要保留請先在遊戲中匯出存檔。</small>':''}<button class="primary big" id="title-start">以${hero.name}身分出發</button></div></div>`;
}
function optionsHTML(){return `${bg(0)}<div class="select-wrap narrow"><div class="select-head"><div><p class="eyebrow">SETTINGS</p><h2>設定</h2></div><button id="select-back" class="ghost">返回標題</button></div>${toggles()}</div>`;}
let optionsOnly=false;

function render(){
 if(!root)return;
 root.className=`title-screen screen-${optionsOnly?'options':screen}`;
 root.innerHTML=(optionsOnly?optionsHTML():screen==='title'?titleHTML():screen==='story'?storyHTML():selectHTML())+(helpOpen?helpHTML():'');
 bind();
 const focus=root.querySelector<HTMLElement>(helpOpen?'#help-close':screen==='story'&&!optionsOnly?'#story-next':'.primary');focus?.focus({preventScroll:true});
}
async function music(){if(settings.music&&!soundtrack.on){soundtrack.setScene('map',true);await soundtrack.toggle();}}
function bind(){
 const r=root!,on=(id:string,fn:()=>void)=>r.querySelector(`#${id}`)?.addEventListener('click',()=>{void music();fn();});
 on('title-new',()=>{screen=settings.skipStory?'select':'story';page=0;render();});
 on('title-continue',()=>{void hooks.resume().then(ok=>{if(ok)close();});});
 on('title-help',()=>{helpOpen=true;render();});on('select-help',()=>{helpOpen=true;render();});on('help-close',()=>{helpOpen=false;render();});
 on('title-options',()=>{optionsOnly=true;render();});
 on('select-back',()=>{optionsOnly=false;screen='title';render();});
 on('select-story',()=>{screen='story';page=0;render();});
 on('story-skip',()=>{screen='select';render();});
 on('story-prev',()=>{page=Math.max(0,page-1);render();});
 on('story-next',()=>{if(page<story.length-1)page++;else screen='select';render();});
 r.querySelectorAll<HTMLElement>('[data-hero]').forEach(el=>el.onclick=()=>{heroId=el.dataset.hero!;render();});
 r.querySelector('#opt-mode')?.addEventListener('change',ev=>mode=(ev.target as HTMLSelectElement).value as RulesMode);
 r.querySelector('#opt-seed')?.addEventListener('input',ev=>seed=(ev.target as HTMLInputElement).value);
 on('title-start',()=>{hooks.start({heroId,mode,seed:seed.trim()||'jiuzhou-2026'});close();});
 const check=(id:string,fn:(v:boolean)=>void)=>r.querySelector(`#${id}`)?.addEventListener('change',ev=>fn((ev.target as HTMLInputElement).checked));
 check('opt-music',v=>{saveSettings({music:v});if(v!==soundtrack.on){soundtrack.setScene('map',true);void soundtrack.toggle();}});
 check('opt-sfx',v=>saveSettings({sfx:v}));check('opt-motion',v=>saveSettings({motion:v}));check('opt-tips',v=>saveSettings({tips:v}));check('opt-skip-story',v=>saveSettings({skipStory:v}));
 r.querySelector('#opt-volume')?.addEventListener('input',ev=>soundtrack.setVolume(Number((ev.target as HTMLInputElement).value)/100));
 on('opt-reset-tips',()=>{resetTips();saveSettings({tips:true});render();const b=r.querySelector('#opt-reset-tips');if(b)b.textContent='已重設，所有提示會再出現一次';});
 r.onkeydown=ev=>{
  if(ev.key==='Escape'&&helpOpen){helpOpen=false;render();}
  else if(screen==='story'&&!optionsOnly&&!helpOpen&&(ev.key==='ArrowRight'||ev.key===' ')&&!(ev.target instanceof HTMLButtonElement&&ev.key===' ')){ev.preventDefault();(r.querySelector('#story-next') as HTMLElement).click();}
 };
}
function close(){root?.remove();root=null;document.body.classList.remove('title-open');hooks.closed();}
export function titleOpen(){return !!root;}
/** Shows the title flow above the page. Rules and saves stay in adventure/campaign modules. */
export function showTitle(h:Hooks,initial:'title'|'select'='title'){
 hooks=h;screen=initial;page=0;helpOpen=false;optionsOnly=false;
 if(!root){root=document.createElement('div');root.setAttribute('role','dialog');root.setAttribute('aria-label','九州兵譜 標題畫面');document.body.append(root);}
 document.body.classList.add('title-open');render();
}
