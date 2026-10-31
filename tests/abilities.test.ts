import {describe,it,expect} from 'vitest';
import {applyCommand,initialState,makeStack,reachable,MAX_COUNT} from '../src/core/engine';
import {hasAbility,magicProfile,recoverAfterHit,damageStack} from '../src/core/abilities';
import {Session,hash} from '../src/core/replay';
import {nextAICommand} from '../src/core/ai';
import {units} from '../src/content/load';
import type {State,Command,ScenarioId} from '../src/core/types';
function duel(a='xiang_yong',b='xiang_yong',ac=20,bc=20){
 const s=initialState();s.armies.player=[makeStack('p0',a,ac),null,null,null,null];s.armies.enemy=[makeStack('e0',b,bc),null,null,null,null];
 const st=applyCommand(s,{type:'start'}).state;st.armies.enemy[0]!.cell={x:1,y:0};return st;
}
function cast(s:State,spellId:number,targetId='e0',cell?:{x:number;y:number}){return applyCommand(s,{type:'cast',spellId,targetId,...(cell?{cell}:{})});}
function finished(seed:string,scenario:ScenarioId){const s=new Session(seed,scenario);s.dispatch({type:'start'});for(let i=0;i<5000&&s.state.phase==='battle';i++)s.dispatch(nextAICommand(s.state));expect(s.state.phase).toBe('finished');return s;}
describe('飛行與再生',()=>{
 it('飛行跨越封鎖，落空格但不重疊，第二飛後結束行動',()=>{const s=duel('zhi_he_ling');s.armies.player[1]=makeStack('block','xiang_yong',10);s.armies.player[1]!.cell={x:0,y:1};const a=s.armies.player[0]!;expect(reachable(s,a)).toContainEqual({x:4,y:4});expect(reachable(s,a)).not.toContainEqual({x:1,y:0});const first=applyCommand(s,{type:'move',actorId:'p0',cell:{x:4,y:4}});expect(first.events[0].type).toBe('fly');expect(first.state.armies.player[0]!.flights).toBe(1);expect(first.state.armies.player[0]!.acted).toBe(false);const second=applyCommand(first.state,{type:'move',actorId:'p0',cell:{x:4,y:3}}).state;expect(second.armies.player[0]!.acted).toBe(true);expect(reachable(second,second.armies.player[0]!)).toEqual([]);});
 it('再生只恢復存活兵員殘傷，不復活且只在己方行動開始',()=>{const s=duel('shu_kui');s.armies.player[0]!.count=3;s.armies.player[0]!.hp=123;const en=applyCommand(s,{type:'end-turn'}).state;expect(en.armies.player[0]!.hp).toBe(123);const result=applyCommand(en,{type:'end-turn'});expect(result.state.armies.player[0]!.hp).toBe(150);expect(result.state.armies.player[0]!.count).toBe(3);expect(result.events.some(e=>e.type==='regen'&&e.amount===27)).toBe(true);});
 it('死亡樹魁不因回合再生，飛行次數正常重置',()=>{const s=duel('zhi_he_ling');s.armies.player[1]=makeStack('tree','shu_kui',1);s.armies.player[1]!.hp=0;s.armies.player[1]!.count=0;s.armies.player[0]!.flights=0;const n=applyCommand(applyCommand(s,{type:'end-turn'}).state,{type:'end-turn'}).state;expect(n.armies.player[1]!.hp).toBe(0);expect(n.armies.player[0]!.flights).toBe(2);});
});
describe('汲取、吸血與斬魂',()=>{
 it('汲取用實際擊殺，保留殘傷且可突破初始數量',()=>{const a=makeStack('ghost','you_hun',2);a.hp=17;const events=recoverAfterHit(a,5,3);expect(a.count).toBe(5);expect(a.hp).toBe(47);expect(events[0].amount).toBe(3);expect(a.maxCount).toBe(5);});
 it('汲取限制 MAX_COUNT，不溢位',()=>{const a=makeStack('a','you_hun',MAX_COUNT-1);recoverAfterHit(a,1000000000,1000000000);expect(a.count).toBe(MAX_COUNT);expect(a.hp).toBe(MAX_COUNT*10);});
 it('汲取與複製的新增兵會加入受損隊伍回復上限',()=>{const ghost=makeStack('g','you_hun',5);ghost.count=2;ghost.hp=17;recoverAfterHit(ghost,10,1);expect(ghost.maxCount).toBe(6);const s=duel();s.armies.player[0]!.count=2;s.armies.player[0]!.hp=3;expect(cast(s,0,'p0').state.armies.player[0]!.maxCount).toBe(30);});
 it('吸血按實際傷害回血，含復活但不得超過原隊生命',()=>{const a=makeStack('v','shi_xue_mei',5);a.hp=31;a.count=2;recoverAfterHit(a,70,0);expect(a.hp).toBe(101);expect(a.count).toBe(4);recoverAfterHit(a,999999,0);expect(a.hp).toBe(150);expect(a.count).toBe(5);});
 it('溢出傷害被截斷，不以原始傷害吸血',()=>{const s=duel('shi_xue_mei','xiang_min',10,1);s.armies.player[0]!.hp=271;const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(r.events.find(e=>e.type==='leech')!.amount).toBe(1);expect(r.state.armies.player[0]!.hp).toBe(272);});
 it('吸血會在反擊中觸發',()=>{const s=duel('xiang_yong','shi_xue_mei',100,5);s.armies.enemy[0]!.hp=130;const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(r.events.some(e=>e.type==='retaliate')).toBe(true);expect(r.events.some(e=>e.type==='leech'&&e.actorId==='e0')).toBe(true);});
 it('斬魂精確採 90–100 共 11 個值，不把來源註解 10% 當成程式結果',()=>{
  const s=duel('xiu_luo_gui_jiang','xiang_yong',1,1000);s.rng=1;const no=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(no.events.some(e=>e.type==='scythe')).toBe(false);
  let proc:ReturnType<typeof applyCommand>|undefined;
  for(let rng=1;rng<100000;rng++){s.rng=rng;const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});if(r.events.some(e=>e.type==='scythe')){proc=r;break;}}
  expect(proc).toBeDefined();const event=proc!.events.find(e=>e.type==='scythe')!;expect(event.roll).toBeGreaterThanOrEqual(90);expect(proc!.events.find(e=>e.type==='attack')!.damage).toBeGreaterThanOrEqual(1000);
 });
 it('汲取在近戰反擊前生效，反擊只來自存活目標',()=>{const s=duel('you_hun','xiang_yong',10,2);const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(r.state.armies.player[0]!.count).toBe(12);expect(r.events.some(e=>e.type==='retaliate')).toBe(false);});
});
describe('兵種施法與免疫',()=>{
 it('獨立魔法次數不改來源 ammo=0，固定傷害不消耗 RNG',()=>{const s=duel('zhu_you_wu_yi','xiang_yong',4,100);s.armies.enemy[0]!.cell={x:5,y:0};const rng=s.rng;expect(s.armies.player[0]!.ammo).toBe(0);expect(s.armies.player[0]!.magicCharges).toBe(3);const r=applyCommand(s,{type:'magic-attack',actorId:'p0',targetId:'e0'});expect(r.state.rng).toBe(rng);expect(r.state.armies.player[0]!.magicCharges).toBe(2);expect(r.events[0].damage).toBe(32);});
 it('免疫取消魔法傷害，但兵種魔法消耗行動與一次技能',()=>{const s=duel('yu_feng_fang_shi','chi_yan_jiao_long',2,1);s.armies.enemy[0]!.cell={x:5,y:0};const r=applyCommand(s,{type:'magic-attack',actorId:'p0',targetId:'e0'});expect(r.events[0].type).toBe('immune');expect(r.state.armies.enemy[0]!.hp).toBe(200);expect(r.state.armies.player[0]!.magicCharges).toBe(1);expect(r.state.armies.player[0]!.acted).toBe(true);});
 it('技能耗盡、非施法者、近鄰牽制皆拒絕且輸入不變',()=>{for(const id of ['xiang_yong','zhu_you_wu_yi']){const s=duel(id);const before=structuredClone(s);expect(()=>applyCommand(s,{type:'magic-attack',actorId:'p0',targetId:'e0'})).toThrow();expect(s).toEqual(before);}const s=duel('zhu_you_wu_yi');s.armies.enemy[0]!.cell={x:5,y:0};s.armies.player[0]!.magicCharges=0;expect(()=>applyCommand(s,{type:'magic-attack',actorId:'p0',targetId:'e0'})).toThrow();});
 it('免疫仍受實體遠射傷害',()=>{const s=duel('shan_yue_li_shi','chi_yan_jiao_long',10,1);s.armies.enemy[0]!.cell={x:5,y:0};const r=applyCommand(s,{type:'ranged-attack',actorId:'p0',targetId:'e0'});expect(r.events[0].damage).toBeGreaterThan(0);});
});
describe('七種英雄戰鬥法術（研究適配）',()=>{
 it.each([[2,25],[3,10],[6,50]])('傷害法術 #%i 實扣 %i HP 且不反擊',(id,damage)=>{const s=duel('xiang_yong','bai_gu_bing',50,100);const r=cast(s,id);expect(r.state.armies.enemy[0]!.hp).toBe(300-damage);expect(r.events.some(e=>e.type==='retaliate')).toBe(false);expect(r.state.spellbook.player[id]).toBe(1);expect(r.state.spellUsed.player).toBe(true);});
 it('不死是渡厄真言的目標條件；活人拒絕不耗符',()=>{const s=duel();expect(()=>cast(s,6)).toThrow();expect(s.spellbook.player[6]).toBe(2);});
 it.each([2,3,4])('免疫英雄法術 #%i，資源與機會不扣',id=>{const s=duel('xiang_yong','chi_yan_jiao_long');const r=cast(s,id);expect(r.events[0].type).toBe('immune');expect(r.state.spellUsed.player).toBe(false);expect(r.state.spellbook.player[id]).toBe(2);});
 it('複製保留殘傷、提高回復上限、不恢復彈藥或已行動',()=>{const s=duel('yu_lin_gong_shou');const a=s.armies.player[0]!;a.hp=193;a.acted=true;a.ammo=1;const r=cast(s,0,'p0').state.armies.player[0]!;expect(r.count).toBe(30);expect(r.hp).toBe(293);expect(r.maxCount).toBe(30);expect(r.ammo).toBe(1);expect(r.acted).toBe(true);});
 it('傳送保留行動與狀態，佔用／越界落點拒絕',()=>{const s=duel();s.armies.player[0]!.moved=1;s.armies.player[0]!.status={tag:'preserve'};for(const cell of [{x:1,y:0},{x:0,y:0},{x:6,y:0},{x:1.5,y:0}])expect(()=>cast(s,1,'p0',cell)).toThrow();const r=cast(s,1,'p0',{x:4,y:4}).state.armies.player[0]!;expect(r.cell).toEqual({x:4,y:4});expect(r.moved).toBe(1);expect(r.status.tag).toBe('preserve');});
 it('定身阻止敵方移動、攻擊、反擊，在敵方行動結束解除',()=>{const s=duel();const frozen=cast(s,4).state;expect(applyCommand(frozen,{type:'attack',actorId:'p0',targetId:'e0'}).events.some(e=>e.type==='retaliate')).toBe(false);const en=applyCommand(frozen,{type:'end-turn'}).state;expect(reachable(en,en.armies.enemy[0]!)).toEqual([]);expect(()=>applyCommand(en,{type:'attack',actorId:'e0',targetId:'p0'})).toThrow();const next=applyCommand(en,{type:'end-turn'}).state;expect(next.armies.enemy[0]!.status.frozen).toBeUndefined();});
 it('還魂恢復殘傷及陣亡兵，滿血不耗符；全滅原格被佔用時拒絕',()=>{const s=duel();s.armies.player[0]!.hp=3;s.armies.player[0]!.count=2;const healed=cast(s,5,'p0').state.armies.player[0]!;expect(healed.hp).toBe(40);expect(healed.count).toBe(20);expect(()=>cast(duel(),5,'p0')).toThrow();s.armies.player[1]=makeStack('dead','yu_lin_gong_shou',10);s.armies.player[1]!.hp=0;s.armies.player[1]!.count=0;s.armies.player[1]!.cell={x:2,y:2};const revived=cast(s,5,'dead').state.armies.player[1]!;expect(revived.hp).toBe(100);expect(revived.acted).toBe(true);s.armies.enemy[0]!.cell={x:2,y:2};expect(()=>cast(s,5,'dead')).toThrow();});
 it('每方每次限一道，零符／未實作／敵我錯誤一律拒絕',()=>{const s=duel();const one=cast(s,2).state;expect(()=>cast(one,3)).toThrow();for(const c of [{type:'cast',spellId:0,targetId:'e0'},{type:'cast',spellId:2,targetId:'p0'},{type:'cast',spellId:7,targetId:'e0'},{type:'cast',spellId:2.5,targetId:'e0'}] as Command[])expect(()=>applyCommand(s,c)).toThrow();s.spellbook.player[2]=0;expect(()=>cast(s,2)).toThrow();});
 it('法術可以造成勝利，死亡目標不可再被攻擊或冰凍',()=>{const s=duel('xiang_yong','xiang_min',2,1);const r=cast(s,2);expect(r.state.phase).toBe('finished');expect(r.state.winner).toBe('player');});
});
describe('全兵種與版本化重播',()=>{
 it('25 兵種都可建立並完整覆蓋 8 能力 key',()=>{const keys=new Set<string>();for(const u of units){const s=makeStack(u.id,u.id,2);expect(s.hp).toBe(u.hp*2);for(const k of u.abilities)keys.add(k);expect(s.magicCharges).toBe(magicProfile(s)?.charges??0);}expect([...keys].sort()).toEqual(['absorb','fly','immune','leech','magic','regen','scythe','undead']);});
 it.each(['demo-2026','test-2','test-3'])('試煉場全場結果確定性與重播一致：%s',async seed=>{const a=finished(seed,'abilities');const b=finished(seed,'abilities');expect(a.state).toEqual(b.state);expect(a.events).toEqual(b.events);expect((await Session.import(await a.export())).state).toEqual(a.state);});
 it('英雄施法與兵種魔法一起錄入重播；初始場景不可換掉',async()=>{const s=new Session('magic','abilities');s.dispatch({type:'start'});s.dispatch({type:'cast',spellId:4,targetId:'e0'});s.dispatch({type:'magic-attack',actorId:'p3',targetId:'e4'});const r=await s.export();expect((await Session.import(r)).events).toEqual(s.events);const bad=structuredClone(r);bad.initialState.scenarioId='skirmish';await expect(Session.import(bad)).rejects.toThrow();});
 it('拒絕舊規則回放，無聲升級不可行',async()=>{const r=await new Session().export();await expect(Session.import({...r,schemaVersion:'1',rulesetVersion:'research/proposed-combat-v0.1.0'})).rejects.toThrow();});
 it('不合法新命令不記入重播，不變更狀態與 RNG',async()=>{const s=new Session();s.dispatch({type:'start'});const before=await hash(s.state),count=s.commands.length;expect(()=>s.dispatch({type:'cast',spellId:100,targetId:'p0'})).toThrow();expect(await hash(s.state)).toBe(before);expect(s.commands).toHaveLength(count);});
});
