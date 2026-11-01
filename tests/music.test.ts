import {describe,it,expect} from 'vitest';
import {scores} from '../src/audio/score';
import {motionProfiles} from '../src/art/motion';
import {units} from '../src/content/load';
describe('原創地圖與戰鬥配樂',()=>{
 it('兩首各有完整 32 小節、不同速度與多聲部，所有音符均落在樂句內',()=>{
  expect(scores.map.bpm).toBeLessThan(scores.battle.bpm);expect(scores.map.title).not.toBe(scores.battle.title);
  for(const score of Object.values(scores)){
   expect(score.bars).toBe(32);expect(score.beats).toBe(128);expect(new Set(score.notes.map(n=>n.voice)).size).toBeGreaterThanOrEqual(6);
   for(const n of score.notes){expect(n.beat).toBeGreaterThanOrEqual(0);expect(n.beat+n.duration).toBeLessThanOrEqual(score.beats);expect(n.duration).toBeGreaterThan(0);expect(n.midi).toBeGreaterThan(0);expect(n.midi).toBeLessThan(128);expect(n.gain).toBeGreaterThan(0);expect(Math.abs(n.pan)).toBeLessThanOrEqual(1);}
   expect(score.notes.some(n=>n.beat>=96)).toBe(true);
  }
 });
 it('全部 25 個兵種都有動作資料，動作不依賴戰鬥數值',()=>{
  expect(motionProfiles).toHaveLength(25);for(const u of units){const profile=motionProfiles[u.sourceTroopId];expect(profile[0]).toBeTruthy();expect(profile[1]).toBeGreaterThan(1);}
  expect(new Set(motionProfiles.map(p=>p[0])).size).toBeGreaterThan(10);
 });
});
