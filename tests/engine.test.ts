import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {units,catalogs,unit,warnings} from '../src/content/load';
import {applyCommand,initialState,makeStack,control,reachable,integer,MAX_COUNT,alive} from '../src/core/engine';
import {nextAICommand} from '../src/core/ai';
import {Session,hash,validateCommand} from '../src/core/replay';
import {randomInt,seedToUint} from '../src/core/rng';
import type {State,Command} from '../src/core/types';
const load=(p:string)=>JSON.parse(readFileSync(new URL(`../${p}`,import.meta.url),'utf8'));
function battle(aId='xiang_yong',bId='xiang_yong',count=20):State{
 const s=initialState();s.armies.player=[makeStack('p0',aId,count),null,null,null,null];s.armies.enemy=[makeStack('e0',bId,count),null,null,null,null];
 const b=applyCommand(s,{type:'start'}).state;b.armies.player[0]!.cell={x:0,y:0};b.armies.enemy[0]!.cell={x:1,y:0};return b;
}
function run(seed='demo-2026'){
 const s=new Session(seed);s.dispatch({type:'start'});
 for(let i=0;i<5000&&s.state.phase==='battle';i++)s.dispatch(nextAICommand(s.state));
 expect(s.state.phase).toBe('finished');return s;
}
describe('資料基準',()=>{
 it('全 25 IDs 唯一且完整',()=>{expect(units.map(u=>u.sourceTroopId).sort((a,b)=>a-b)).toEqual(Array.from({length:25},(_,i)=>i));expect(new Set(units.map(u=>u.id)).size).toBe(25);});
 it('名稱映射不改變基準任何數值／能力',()=>{const ref=load('data/reference/openkb_cht_free_parameters.json');for(const u of units){const r=ref.troops[u.sourceTroopId];for(const key of ['hp','skill','moves','melee_min','melee_max','ranged_min','ranged_max','ammo','gold','abilities','group','spoils','spoils_raw'])expect((u as Record<string,unknown>)[key]).toEqual(r[key]);}});
 it('14 法術、8 神器、4 職業、17 敵將',()=>{expect(Object.fromEntries(Object.entries(catalogs).map(([k,v])=>[k,v.length]))).toEqual({spell:14,artifact:8,hero:4,villain:17});});
 it('保留所有來源異常及職業衝突',()=>{expect(unit('hu_ben_zhong_jia').spoils_raw).toBe('10s0');expect(unit('hu_ben_zhong_jia').spoils).toBeNull();expect(load('data/reference/openkb_cht_free_parameters.json').spells[6].all_gold_assignments).toEqual(['250','2000']);expect(warnings).toHaveLength(5);});
});
describe('五隊管理與統率',()=>{
 it.each([[0,0],[0,1],[0,4]])('交換 %i/%i 兩次還原且不修改輸入',(a,b)=>{const s=initialState();s.armies.player[0]!.hp--;s.armies.player[0]!.status={tag:'保留'};const copy=structuredClone(s);const once=applyCommand(s,{type:'swap',a,b}).state;expect(applyCommand(once,{type:'swap',a,b}).state).toEqual(s);expect(s).toEqual(copy);});
 it('拆分再合併：人數與 HP 守恆',()=>{const s=initialState();const part=applyCommand(s,{type:'split',slot:0,target:3,count:5}).state;expect(part.armies.player[0]!.count).toBe(15);expect(part.armies.player[3]!.count).toBe(5);const merged=applyCommand(part,{type:'merge',a:3,b:0}).state;expect(merged.armies.player[0]!.hp).toBe(s.armies.player[0]!.hp);expect(merged.armies.player[0]!.count).toBe(20);expect(merged.armies.player[3]).toBeNull();});
 it.each([0,-1,20,21,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER])('拒絕非法拆分兵數 %s',count=>expect(()=>applyCommand(initialState(),{type:'split',slot:0,target:3,count})).toThrow());
 it('禁止覆蓋與異型合併／自己合併',()=>{for(const c of [{type:'split',slot:0,target:1,count:5},{type:'merge',a:0,b:1},{type:'merge',a:0,b:0}] as Command[])expect(()=>applyCommand(initialState(),c)).toThrow();});
 it('殘血與狀態不可透過合併拆分抹除',()=>{const s=initialState();s.armies.player[0]!.hp--;expect(()=>applyCommand(s,{type:'split',slot:0,target:3,count:5})).toThrow();s.armies.player[0]!.hp++;s.armies.player[0]!.status={poison:'1'};expect(()=>applyCommand(s,{type:'split',slot:0,target:3,count:5})).toThrow();});
 it('合併／拆分不補彈',()=>{const s=initialState();s.armies.player[1]!.ammo=2;const split=applyCommand(s,{type:'split',slot:1,target:3,count:2}).state;expect(split.armies.player[3]!.ammo).toBe(2);split.armies.player[3]!.ammo=1;expect(applyCommand(split,{type:'merge',a:3,b:1}).state.armies.player[1]!.ammo).toBe(1);});
 it('合併數量上限',()=>{const s=initialState();s.armies.player[0]=makeStack('p0','xiang_yong',MAX_COUNT);s.armies.player[3]=makeStack('p3','xiang_yong',1);expect(()=>applyCommand(s,{type:'merge',a:3,b:0})).toThrow();});
 it('統率以每隊 HP 核算；相等與超額分開',()=>{expect(control(makeStack('a','yu_lin_gong_shou',10),100).over).toBe(false);expect(control(makeStack('a','yu_lin_gong_shou',11),100).over).toBe(true);});
 it('招募扣款並檢查空欄、同型、資金與上限',()=>{const s=initialState();const r=applyCommand(s,{type:'recruit',slot:3,unitId:'yu_lin_gong_shou',count:2}).state;expect(r.gold).toBe(9500);expect(r.armies.player[3]!.count).toBe(2);expect(applyCommand(r,{type:'recruit',slot:3,unitId:'yu_lin_gong_shou',count:1}).state.armies.player[3]!.count).toBe(3);for(const c of [{type:'recruit',slot:0,unitId:'chi_yan_jiao_long',count:1},{type:'recruit',slot:3,unitId:'chi_yan_jiao_long',count:3},{type:'recruit',slot:3,unitId:'xiang_min',count:-1}] as Command[])expect(()=>applyCommand(s,c)).toThrow();});
 it.each([-1,NaN,Infinity,1.5,MAX_COUNT+1])('兵數拒絕 %s',n=>expect(()=>integer(n)).toThrow());
});
describe('研究沙盒暫行戰鬥規則（proposed-new-game，非 DOS 結論）',()=>{
 it('6 欄 5 列與起始位置固定',()=>{const s=applyCommand(initialState(),{type:'start'}).state;expect(s.armies.player[1]!.cell).toEqual({x:0,y:1});expect(s.armies.enemy[1]!.cell).toEqual({x:5,y:1});});
 it('移動上限、碰撞、繞路成本與負座標',()=>{const s=battle('xiang_yong');expect(()=>applyCommand(s,{type:'move',actorId:'p0',cell:{x:1,y:0}})).toThrow();expect(()=>applyCommand(s,{type:'move',actorId:'p0',cell:{x:2,y:0}})).toThrow();expect(()=>applyCommand(s,{type:'move',actorId:'p0',cell:{x:-1,y:0}})).toThrow();const r=applyCommand(s,{type:'move',actorId:'p0',cell:{x:1,y:1}}).state;expect(r.armies.player[0]!.moved).toBe(2);expect(reachable(r,r.armies.player[0]!)).toEqual([]);});
 it('近戰必須正交相鄰',()=>{const s=battle();s.armies.enemy[0]!.cell={x:1,y:1};expect(()=>applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'})).toThrow();});
 it('敵方／友軍／重複攻擊受限且輸入純粹',()=>{const s=battle();expect(()=>applyCommand(s,{type:'attack',actorId:'e0',targetId:'p0'})).toThrow();expect(()=>applyCommand(s,{type:'attack',actorId:'p0',targetId:'p0'})).toThrow();const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(s.armies.player[0]!.acted).toBe(false);expect(()=>applyCommand(r.state,{type:'attack',actorId:'p0',targetId:'e0'})).toThrow();expect(()=>applyCommand(r.state,{type:'move',actorId:'p0',cell:{x:0,y:1}})).toThrow();});
 it('遠射耗彈、零彈拒絕，無遠射反擊',()=>{const s=battle('yu_lin_gong_shou');s.armies.enemy[0]!.cell={x:5,y:0};s.armies.player[0]!.ammo=1;const r=applyCommand(s,{type:'ranged-attack',actorId:'p0',targetId:'e0'});expect(r.state.armies.player[0]!.ammo).toBe(0);expect(r.events.filter(e=>e.type==='retaliate')).toHaveLength(0);r.state.armies.player[0]!.acted=false;expect(()=>applyCommand(r.state,{type:'ranged-attack',actorId:'p0',targetId:'e0'})).toThrow();});
 it('被近鄰牽制時禁止遠射',()=>expect(()=>applyCommand(battle('yu_lin_gong_shou'),{type:'ranged-attack',actorId:'p0',targetId:'e0'})).toThrow());
 it('存活隊伍每輪反擊一次，下一輪重置',()=>{const s=battle();s.armies.enemy[0]!.count=100;s.armies.enemy[0]!.hp=200;s.armies.player[1]=makeStack('p1','xiang_yong',20);s.armies.player[1]!.cell={x:1,y:1};const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(r.events.filter(e=>e.type==='retaliate')).toHaveLength(1);const r2=applyCommand(r.state,{type:'attack',actorId:'p1',targetId:'e0'});expect(r2.events.filter(e=>e.type==='retaliate')).toHaveLength(0);const next=applyCommand(applyCommand(r2.state,{type:'end-turn'}).state,{type:'end-turn'}).state;expect(next.round).toBe(2);expect(next.armies.enemy[0]!.retaliated).toBe(false);});
 it('擊殺不反擊、勝負與結束後鎖定',()=>{const s=battle('chi_yan_jiao_long','xiang_min');s.armies.enemy[0]!.count=1;s.armies.enemy[0]!.hp=1;const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(r.state.phase).toBe('finished');expect(r.state.winner).toBe('player');expect(r.events.some(e=>e.type==='retaliate')).toBe(false);expect(()=>applyCommand(r.state,{type:'end-turn'})).toThrow();});
 it('敵方勝利同樣可判定',()=>{const s=battle('xiang_min','chi_yan_jiao_long',1);s.turn='enemy';expect(applyCommand(s,{type:'attack',actorId:'e0',targetId:'p0'}).state.winner).toBe('enemy');});
 it('傷害最少 1、HP 非負、受傷跨回合保留',()=>{const s=battle('xiang_min','chi_yan_jiao_long',10);const r=applyCommand(s,{type:'attack',actorId:'p0',targetId:'e0'});expect(r.events[0].damage).toBe(1);expect(r.state.armies.enemy[0]!.hp).toBe(1999);expect(r.state.armies.enemy[0]!.count).toBe(10);const hp=r.state.armies.enemy[0]!.hp;if(r.state.phase==='battle'){const next=applyCommand(r.state,{type:'end-turn'}).state;expect(next.armies.enemy[0]!.hp).toBe(hp);}for(const t of ['player','enemy'] as const)for(const a of r.state.armies[t])if(a){expect(a.hp).toBeGreaterThanOrEqual(0);expect(a.count).toBeGreaterThanOrEqual(0);}});
 it('戰中不能改編組，戰前不能攻擊',()=>{expect(()=>applyCommand(battle(),{type:'swap',a:0,b:1})).toThrow();expect(()=>applyCommand(initialState(),{type:'attack',actorId:'p0',targetId:'e0'})).toThrow();});
});
describe('種子與重播',()=>{
 it('zero seed 不鎖死且輸出在範圍內',()=>{const [v,n]=randomInt(0,1,6);expect(n).not.toBe(0);expect(v).toBeGreaterThanOrEqual(1);expect(v).toBeLessThanOrEqual(6);expect(seedToUint('')).not.toBe(0);});
 it('SHA-256 使用規範排序 JSON',async()=>expect(await hash({b:2,a:1})).toBe(createHash('sha256').update('{"a":1,"b":2}').digest('hex')));
 it('同 seed 的指令、事件與最終狀態一致',async()=>{const a=run(),b=run();expect(a.state).toEqual(b.state);expect(a.commands).toEqual(b.commands);expect(a.events).toEqual(b.events);expect(await a.export()).toEqual(await b.export());});
 it.each(['demo-2026','alpha','beta','統率邊界','0'])('完整模擬並匯入驗證：%s',async seed=>{const s=run(seed);const restored=await Session.import(JSON.parse(JSON.stringify(await s.export())));expect(restored.state).toEqual(s.state);expect(restored.events).toEqual(s.events);expect(alive(s.state,s.state.winner!)).not.toHaveLength(0);});
 it('編組指令一同錄製可重播',async()=>{const s=new Session();s.dispatch({type:'split',slot:0,target:3,count:5});s.dispatch({type:'swap',a:0,b:3});s.dispatch({type:'recruit',slot:4,unitId:'xiang_min',count:2});s.dispatch({type:'start'});expect((await Session.import(await s.export())).state).toEqual(s.state);});
 it('拒絕改種子、資料、版本、事件、指令或最終雜湊',async()=>{const r=await run().export();for(const [k,v] of Object.entries({seed:'other',dataHash:'bad',rulesetVersion:'other',events:[],finalStateHash:'bad',initialState:{},commands:[{type:'evil'}]}))await expect(Session.import({...r,[k]:v})).rejects.toThrow();});
 it('非法指令不進入 session，不消耗 RNG',()=>{const s=new Session();const before=structuredClone(s.state);expect(()=>s.dispatch({type:'recruit',slot:4,unitId:'xiang_min',count:-1})).toThrow();expect(s.state).toEqual(before);expect(s.commands).toEqual([]);});
 it('未知與損壞指令格式被拒絕',()=>{for(const c of [null,{type:'unknown'},{type:'move',actorId:'p0',cell:null}])expect(()=>validateCommand(c as Command)).toThrow();});
});
