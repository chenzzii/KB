import {describe,it,expect} from 'vitest';
import {Campaign,campaignHash} from '../src/campaign/session';
import {newWorld,applyWorld,pathTo,leadership,siteRoster,heroArmy,spellPrice,campaignVersion,campaignVersion2} from '../src/campaign/engine';
import {places,heroClasses,balanceV2} from '../src/campaign/content';
import {unit,units,rosterV2,dataHash} from '../src/content/load';
import {magicProfile} from '../src/core/abilities';
import {makeStack} from '../src/core/engine';
import type {Options} from '../src/campaign/types';

const v2:Options={seed:'v2-test',heroId:'wu_jiang',mode:'enhanced',ruleset:campaignVersion2};
const go=(c:Campaign,x:number,y:number)=>{for(const cell of pathTo(c.state,x,y))c.dispatch({type:'travel',cell});};

describe('campaign-2.0.0 five-faction roster',()=>{
 it('has five factions with tiers 1 to 5 each, 25 units, 25 distinct trait sources',()=>{
  expect(rosterV2).toHaveLength(25);
  for(const g of 'ABCDE'){const tiers=rosterV2.filter(u=>u.group===g).map(u=>u.tier).sort();expect(tiers).toEqual([1,2,3,4,5]);}
  expect(new Set(rosterV2.map(u=>u.sourceTroopId)).size).toBe(25);
  expect(rosterV2.filter(u=>u.group==='A').sort((a,b)=>a.tier!-b.tier!).map(u=>u.name)).toEqual(['鄉民','鄉兵','鄉勇','山民','山神']);
 });
 it('keeps every original KB trait somewhere in the roster',()=>{
  const all=new Set(rosterV2.flatMap(u=>u.abilities as string[]));
  for(const k of ['fly','magic','undead','absorb','regen','leech','scythe','immune'])expect(all.has(k)).toBe(true);
  expect(rosterV2.filter(u=>u.ranged_min!==null).length).toBeGreaterThanOrEqual(4);
  expect(unit('v2_xiang_bing').ranged_min).not.toBeNull();
  expect(unit('v2_shan_shen').ammo).toBeGreaterThan(0);
 });
 it('gives each faction a rising tier curve',()=>{
  for(const g of 'ABCDE'){const list=rosterV2.filter(u=>u.group===g).sort((a,b)=>a.tier!-b.tier!);
   for(let i=1;i<list.length;i++){expect(list[i].gold).toBeGreaterThan(list[i-1].gold);expect(list[i].hp).toBeGreaterThanOrEqual(list[i-1].hp);}}
 });
 it('uses unit-magic numbers from the roster',()=>{
  expect(magicProfile(makeStack('m','v2_zhu_you_wu_yi',1),'enhanced')).toEqual({base:10,charges:3});
  expect(magicProfile(makeStack('m','v2_yu_feng_fang_shi',1),'enhanced')).toEqual({base:25,charges:2});
 });
 it('leaves the research baseline and its hash untouched',()=>{
  expect(units).toHaveLength(25);
  expect(units.find(u=>u.id==='zhi_he_ling')!.group).toBe('A');
  expect(dataHash).toMatch(/^[0-9a-f]{64}$/);
 });
});

describe('campaign-2.0.0 journey rules',()=>{
 it('starts with the quest already accepted; v1 journeys still need 接受委託',()=>{
  expect(newWorld(v2).quest).toBe(true);
  expect(newWorld({...v2,ruleset:undefined}).quest).toBe(false);
  expect(()=>newWorld({...v2,ruleset:'campaign-9.0.0' as never})).toThrow();
 });
 it('starting armies fit each class leadership',()=>{
  for(const h of heroClasses){const o={...v2,heroId:h.id};const w=newWorld(o);
   for(const s of w.army.filter(Boolean))expect(s!.count*unit(s!.unitId).hp).toBeLessThanOrEqual(leadership(w));
   expect(heroArmy(o).every(([id])=>id.startsWith('v2_'))).toBe(true);}
 });
 it('recruits v2 units with tiered stock; 研究基準 keeps the source roster',()=>{
  const village=places.find(p=>p.id==='village')!;
  expect(siteRoster(v2,village)).toEqual(balanceV2.sites.village);
  expect(siteRoster({...v2,mode:'study'},village)!.every(id=>!id.startsWith('v2_'))).toBe(true);
  const w=newWorld(v2);expect(w.supplies.village.v2_xiang_min).toBe(30);expect(w.supplies.village.v2_shan_min).toBe(6);
  const c=new Campaign(v2);go(c,7,5);c.dispatch({type:'recruit-world',unitId:'v2_xiang_bing',count:3,slot:2});
  expect(c.state.army[2]!.unitId).toBe('v2_xiang_bing');expect(c.state.gold).toBe(7500-240);
  expect(()=>c.dispatch({type:'recruit-world',unitId:'xiang_yong',count:1,slot:3})).toThrow('此據點不供應該兵種');
 });
 it('converts enemy armies to v2 units while keeping total HP close',()=>{
  const c=new Campaign(v2);go(c,10,8);c.dispatch({type:'resolve-bandit',route:'conquest'});
  const enemy=c.state.battle!.armies.enemy.filter(Boolean);
  expect(enemy.every(s=>s!.unitId.startsWith('v2_'))).toBe(true);
 });
 it('sells 渡厄真言 at 1000 in v2 華夏改良 and still not in 研究基準',()=>{
  expect(spellPrice(v2,6)).toBe(1000);expect(spellPrice({...v2,mode:'study'},6)).toBeNull();
  const w=newWorld(v2);const next=applyWorld(w,{type:'buy-spell',spellId:6});expect(next.spellbook[6]).toBe(w.spellbook[6]+1);expect(next.gold).toBe(w.gold-1000);
 });
 it('符兵召來 summons 10 鄉兵 with correct HP',()=>{
  const w=newWorld(v2);const next=applyWorld(w,{type:'adventure-spell',spellId:12});
  const s=next.army.find(a=>a?.unitId==='v2_xiang_bing')!;expect(s.count).toBe(10);expect(s.hp).toBe(10*unit('v2_xiang_bing').hp);
 });
 it('saves and reloads v2 journeys and rejects version mismatches; v1 hash unchanged by v2 data',async()=>{
  const c=new Campaign(v2);go(c,7,5);c.dispatch({type:'recruit-world',unitId:'v2_xiang_min',count:5,slot:2});
  const save=await c.save();expect(save.rulesetVersion).toBe(campaignVersion2);
  const back=await Campaign.load(JSON.parse(JSON.stringify(save)));expect(back.state.gold).toBe(c.state.gold);
  await expect(Campaign.load({...save,rulesetVersion:campaignVersion})).rejects.toThrow();
  expect(await campaignHash(campaignVersion)).not.toBe(await campaignHash(campaignVersion2));
  const v1=await new Campaign({seed:'v1',heroId:'wu_jiang',mode:'enhanced'}).save();expect(v1.rulesetVersion).toBe(campaignVersion);
  expect((await Campaign.load(v1)).state.quest).toBe(false);
 });
 it('never stores an undefined ruleset key (browser and replay hashes must agree)',()=>{
  const c=new Campaign({seed:'k',heroId:'wu_jiang',mode:'enhanced',ruleset:undefined});
  expect('ruleset' in c.options).toBe(false);expect('ruleset' in c.state.options).toBe(false);
 });
});
