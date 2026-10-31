import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {Session} from '../src/core/replay';
import {nextAICommand} from '../src/core/ai';
import {MAX_COUNT} from '../src/core/engine';
import {unit,units,dataHash} from '../src/content/load';
import {rulesetVersion} from '../src/core/engine';
const count=Number(process.argv[2]??10000);
if(!Number.isInteger(count)||count<1||count>10000)throw Error('場數限 1–10000');
const start=performance.now();const abilities:Record<string,number>={};const troopIds=new Set<number>();
let playerWins=0,commands=0,maxRounds=0;
for(let i=0;i<count;i++){
 const s=new Session(`batch-v2-${i}`,i%2?'abilities':'skirmish');
 if(i%2===0)s.dispatch({type:'recruit',slot:3,unitId:units[i%25].id,count:1});
 s.dispatch({type:'start'});
 for(const team of ['player','enemy'] as const)for(const a of s.state.armies[team])if(a)troopIds.add(unit(a.unitId).sourceTroopId);
 for(let j=0;j<2000&&s.state.phase==='battle';j++){
  s.dispatch(nextAICommand(s.state));
  for(const team of ['player','enemy'] as const){
   const occupied=new Set<string>();
   for(const a of s.state.armies[team])if(a){
    if(!Number.isSafeInteger(a.hp)||a.hp<0||a.count!==Math.ceil(a.hp/unit(a.unitId).hp)||a.count>MAX_COUNT||a.ammo<0||a.magicCharges<0||a.flights<0)throw Error(`State invariant failed at ${i}/${j}`);
    if(a.hp>0){const key=`${a.cell!.x},${a.cell!.y}`;if(occupied.has(key))throw Error('Cell collision');occupied.add(key);}
   }
  }
  const all=[...s.state.armies.player,...s.state.armies.enemy].filter(a=>a&&a.hp>0);
  if(new Set(all.map(a=>`${a!.cell!.x},${a!.cell!.y}`)).size!==all.length)throw Error('Cross-team cell collision');
 }
 if(s.state.phase!=='finished')throw Error(`Battle ${i} did not finish (seed ${s.initial.seed})`);
 const replay=await s.export();const replayed=await Session.import(replay);
 if(JSON.stringify(replayed.state)!==JSON.stringify(s.state))throw Error(`Replay mismatch ${i}`);
 if(s.state.winner==='player')playerWins++;commands+=s.commands.length;maxRounds=Math.max(maxRounds,s.state.round);
 for(const e of s.events)abilities[e.type]=(abilities[e.type]??0)+1;
 if((i+1)%1000===0)console.log(`Verified ${i+1}/${count} battles (${((performance.now()-start)/1000).toFixed(1)}s)`);
}
const report={rulesetVersion,dataHash,battles:count,replaysVerified:count,troopIds:[...troopIds].sort((a,b)=>a-b),playerWins,enemyWins:count-playerWins,maxRounds,commands,events:abilities,elapsedSeconds:Number(((performance.now()-start)/1000).toFixed(2))};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/batch-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
