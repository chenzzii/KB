import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {Campaign} from '../src/campaign/session';
import {pathTo} from '../src/campaign/engine';
import {places} from '../src/campaign/content';
import {alive,distance} from '../src/core/engine';
import {hasAbility} from '../src/core/abilities';
import type {Command} from '../src/core/types';
import {nextAICommand} from '../src/core/ai';
import type {RulesMode} from '../src/campaign/types';
export function travel(game:Campaign,id:string){const p=places.find(p=>p.id===id)!;for(const cell of pathTo(game.state,p.x,p.y))game.dispatch({type:'travel',cell});if(game.state.position.x!==p.x||game.state.position.y!==p.y)throw Error(`Unreachable ${id}`);}
export function battle(game:Campaign){
 for(let n=0;n<2000&&game.state.battle&&!game.state.ending;n++){
  const state=game.state.battle;let command:Command=nextAICommand(state);
  if(state.turn==='player'&&game.state.battleFoe===16){
   const threat=alive(state,'enemy').find(a=>hasAbility(a,'scythe'));
   if(threat){
    if(!state.spellUsed.player&&state.spellbook.player[4]>0&&!threat.status.frozen)command={type:'cast',spellId:4,targetId:threat.id};
    else if(command.type==='attack'||command.type==='ranged-attack'||command.type==='magic-attack'){
     const actorId=command.actorId;const actor=alive(state,'player').find(a=>a.id===actorId)!;
     if(command.type!=='attack'||distance(actor.cell!,threat.cell!)===1)command={...command,targetId:threat.id};
    }
   }
  }
  game.dispatch({type:'battle',command});
 }
 if(game.state.ending)throw Error(`Defeat at day ${game.state.day}: ${game.state.log.slice(-6).join(';')}`);if(game.state.battle)throw Error('Battle timeout');
}
export function play(route:'conquest'|'alliance'|'trade',mode:RulesMode='enhanced'){
 const game=new Campaign({seed:`complete-${route}`,heroId:'wu_jiang',mode});
 game.dispatch({type:'accept'});game.dispatch({type:'take-artifact',artifactId:3});
 game.dispatch({type:'adventure-spell',spellId:13});game.dispatch({type:'adventure-spell',spellId:13});
 game.dispatch({type:'recruit-world',unitId:'yu_lin_gong_shou',count:18,slot:1});
 game.dispatch({type:'adventure-spell',spellId:12});game.dispatch({type:'adventure-spell',spellId:12});
 travel(game,'bandit');game.dispatch({type:'resolve-bandit',route});battle(game);game.dispatch({type:'take-artifact',artifactId:0});
 travel(game,'foe-1');game.dispatch({type:'fight'});battle(game);
 travel(game,'home');game.dispatch({type:'claim'});game.dispatch({type:'rest'});
 travel(game,'shrine');game.dispatch({type:'shrine'});
 if(route==='conquest'){
  travel(game,'foe-4');game.dispatch({type:'fight'});battle(game);game.dispatch({type:'take-artifact',artifactId:2});
  travel(game,'home');game.dispatch({type:'claim'});game.dispatch({type:'rest'});
  while(game.state.gold<25000&&!game.state.ending)game.dispatch({type:'wait',days:10});
  travel(game,'south');game.dispatch({type:'recruit-world',unitId:'chi_yan_jiao_long',count:5,slot:2});
  travel(game,'beacon');game.dispatch({type:'fight'});battle(game);
 }else{if(game.state.gold<2000){travel(game,'home');game.dispatch({type:'wait',days:20});}}
 travel(game,'beacon');game.dispatch({type:'finish'});if(game.state.ending!==route)throw Error('Wrong ending');return game;
}
if(fileURLToPath(import.meta.url)===resolve(process.argv[1]??'')){
 await mkdir('artifacts',{recursive:true});const results=[];
 for(const mode of ['enhanced','study'] as const)for(const route of ['conquest','alliance','trade'] as const){
  const g=play(route,mode),save=await g.save(),restored=await Campaign.load(save);if(restored.state.ending!==route)throw Error('Save failed');
  await writeFile(`artifacts/campaign-${mode}-${route}.json`,JSON.stringify(save,null,2));
  results.push({mode,route,day:g.state.day,commands:g.commands.length,hash:save.stateHash,verified:true});
 }
 await writeFile('artifacts/campaign-completion.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}
