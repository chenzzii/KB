import balance from '../../data/balance/chinese_campaign_v1.json';
import villains from '../../data/content/villain_mapping.json';
import artifacts from '../../data/content/artifact_mapping.json';
import balanceV2 from '../../data/balance/chinese_campaign_v2.json';
export {balance,villains,artifacts,balanceV2};
export const heroClasses=[
 {id:'wu_jiang',name:'武將',leadership:100,gold:7500,commission:1000,power:1,army:[[2,20],[8,2]]},
 {id:'ru_jiang',name:'儒將',leadership:80,gold:10000,commission:1000,power:1,army:[[0,20],[2,20]]},
 {id:'hao_xia',name:'豪俠',leadership:100,gold:7500,commission:2000,power:1,army:[[3,20]]},
 {id:'fang_shi',name:'方士',leadership:60,gold:10000,commission:3000,power:2,army:[[0,30],[1,10]]}
];
// Separate campaign bindings follow the written design; the contradictory handoff JSON remains untouched.
export const artifactEffects=[
 '全軍傷害 +50%（研究來源）','所受傷害以整數先除四再乘三（研究來源）','統率上限加倍（研究來源）','每週俸祿 +50%（新作適配）',
 '英雄法術威力加倍（研究來源）','華夏模式：招安費用減為 75%；研究模式效果未知、停用','法術存量上限加倍（研究來源）','每週船費由 500 降為 100（研究來源）'
];
export type Tile='plain'|'forest'|'mountain'|'water'|'road'|'bridge'|'marsh'|'ruins';
export type Place={id:string;name:string;x:number;y:number;kind:'city'|'camp'|'foe'|'shrine'|'bandit'|'beacon';description:string;units?:number[];foe?:number;artifact?:number};
export const places:Place[]=[
 {id:'home',name:'青禾府',x:4,y:5,kind:'city',description:'烽臺熄滅後，各地軍令斷絕。郡守請你尋回三枚山河印，讓九州各部自行選擇未來。此處可領賞、補員、購符與休整。',units:[0,2,8,10,14,18]},
 {id:'east',name:'望潮城',x:25,y:7,kind:'city',description:'江海商賈交會之城。城中船坊供應渡河舟，庫藏的海舶令牌可減免船費。',units:[7,9,11,12,19,20]},
 {id:'south',name:'赤嶺關',x:24,y:26,kind:'city',description:'火山舊道上的軍關。你可以在此補給、繳交討伐憑證，或為最終旅程整軍。',units:[10,14,16,18,22,24]},
 {id:'village',name:'柳灣鄉營',x:7,y:5,kind:'camp',description:'鄉里義勇以保護村落為先。每週補充兵源，只按實際單價招募。',units:[0,1,2,3,6]},
 {id:'forest',name:'竹隱道觀',x:8,y:18,kind:'camp',description:'遊俠與祝由師在竹林中避亂。營中的太陰秘籙，等待守信的人取回。',units:[9,11,12,19,20]},
 {id:'ghost',name:'暮影鬼市',x:22,y:19,kind:'camp',description:'幽冥商旅仍遵守契約。陰兵不識朝廷法度，混編士氣須自行斟酌。',units:[4,5,13,21,23]},
 {id:'wild',name:'古木獸庭',x:26,y:13,kind:'camp',description:'山野盟友並不願世代被征服。只要不毀壞山林，他們也願交易。',units:[3,7,15,17,22,24]},
 {id:'bandit',name:'斷雁寨',x:10,y:8,kind:'bandit',description:'寨主扣住糧道與第一枚山河印。可以討伐、以銀兩交易，或立下招安盟約；此選擇不可逆。',foe:0},
 {id:'shrine',name:'聽雨古廟',x:20,y:13,kind:'shrine',description:'石碑記載了河流改道以前的誓約。願意花一天守夜的人，可取走第二枚山河印與一件護身神器。',artifact:1},
 {id:'beacon',name:'天衡烽臺',x:28,y:27,kind:'beacon',description:'三枚山河印在此重合。擊敗守印龍主後，先前的盟約將決定烽火傳向何方。',foe:16}
];
const foeCells=[[11,12],[5,13],[9,24],[12,28],[20,6],[23,10],[29,8],[19,17],[27,17],[20,24],[28,23],[6,26],[11,20],[26,29],[18,28]];
for(let i=1;i<=15;i++){const [x,y]=foeCells[i-1];places.push({id:`foe-${i}`,name:villains[i].name,x,y,kind:'foe',description:villains[i].storyHook+'。擊敗後取得討伐憑證，返回任一城鎮領賞。',foe:i});}
export const endings={
 conquest:{title:'山河歸旗',text:'你以討伐打通糧道，重燃軍令。烽火回到郡府手中；百姓得以安居，而邊地仍等待下一次和解。'},
 alliance:{title:'百川盟誓',text:'山寨、鄉里與妖靈各持一印，共守烽臺。新的秩序由盟約而生，你留下道路，沒有留下新的主人。'},
 trade:{title:'雲路無疆',text:'你以交易化解爭端，讓城關與鬼市重開商路。烽臺成為行旅的路標，九州不再只有一面旗幟。'}
};
export const map:Tile[][]=Array.from({length:32},(_,y)=>Array.from({length:32},(_,x)=>{
 if(x===0||y===0||x===31||y===31)return 'mountain';
 if(x===15||x===16)return [8,16,24].includes(y)?'bridge':'water';
 const n=(x*71+y*43+x*y*7)%31;
 return n<3?'mountain':n<10?'forest':y>20&&x>17&&n<15?'ruins':n===30?'marsh':'plain';
}));
// Original roads connect every settlement. River crossings remain only at three authored bridges.
for(const p of places){
 const crossing=p.y<12?8:p.y<22?16:24;
 const carve=(x:number,y:number)=>{if(map[y][x]!=='water'&&map[y][x]!=='bridge')map[y][x]='road';};
 for(let y=Math.min(5,crossing);y<=Math.max(5,crossing);y++)carve(4,y);
 for(let x=Math.min(4,p.x);x<=Math.max(4,p.x);x++)carve(x,crossing);
 for(let y=Math.min(p.y,crossing);y<=Math.max(p.y,crossing);y++)carve(p.x,y);
 map[p.y][p.x]='plain';
}
export const terrainNames:Record<Tile,string>={plain:'平原',forest:'竹林',mountain:'山壁',water:'江河',road:'驛道',bridge:'橋梁',marsh:'澤地',ruins:'赤岩'};
