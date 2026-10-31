import {units,catalogs} from '../content/load';
export function gallery(){
 const categories=[
  {name:'二十五兵種',files:units.map(u=>({file:`unit-${u.sourceTroopId}`,name:u.name}))},
  {name:'十四符籙',files:catalogs.spell.map((s,i)=>({file:`spell-${i}`,name:s.name}))},
  {name:'八件神器',files:catalogs.artifact.map((s,i)=>({file:`artifact-${i}`,name:s.name}))},
  {name:'四位英雄',files:['武將','儒將','豪俠','方士'].map((name,i)=>({file:`hero-${i}`,name}))},
  {name:'十七敵將',files:catalogs.villain.map((s,i)=>({file:`foe-${i}`,name:s.name}))},
  {name:'八種地形',files:['plain','forest','mountain','water','road','bridge','marsh','ruins'].map((s,i)=>({file:`tile-${s}`,name:['平原','竹林','山壁','江河','驛道','橋梁','澤地','赤岩'][i]}))},
  {name:'六類據點',files:['city','camp','foe','bandit','shrine','beacon'].map((s,i)=>({file:`place-${s}`,name:['城鎮','兵源營地','懸賞','山寨','古廟','烽臺'][i]}))},
  {name:'四幅場景',files:['青禾曉色','竹隱聽雨','赤嶺烽火','百川盟誓'].map((name,i)=>({file:`scene-${i}`,name}))}
 ];
 return `<section class="section-heading"><p class="eyebrow">ORIGINAL ART ATLAS</p><h2>青嵐繪卷</h2><p>86 件原創向量資產：兵種、角色、敵將、符籙、神器、地形、建築與場景。沒有使用來源遊戲圖像、地圖或音樂；本作採青綠／赭紅／紙墨色系，SVG 可無損縮放。</p><p>音樂「青嵐行旅」為另作的五聲音階程式樂曲，行旅頁可選擇開啟；音樂與音效均不參與遊戲計算。</p></section>${categories.map(c=>`<section class="panel art-category"><h3>${c.name}</h3><div class="art-atlas">${c.files.map(a=>`<figure><img src="${import.meta.env.BASE_URL}assets/original/${a.file}.svg" alt="${a.name}" loading="lazy"><figcaption>${a.name}<small>${a.file}.svg</small></figcaption></figure>`).join('')}</div></section>`).join('')}`;
}
