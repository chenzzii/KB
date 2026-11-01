import {mkdir,writeFile} from 'node:fs/promises';
import {Campaign} from '../src/campaign/session';
import {travel} from './campaign-playthrough';
// Normal v2 commands only: these saves must survive full replay validation.
const game=new Campaign({seed:'walk-art-v1.5',heroId:'ru_jiang',mode:'enhanced',ruleset:'campaign-2.0.0'});
game.dispatch({type:'recruit-world',unitId:'v2_xiang_yong',count:1,slot:2});
travel(game,'village');game.dispatch({type:'recruit-world',unitId:'v2_shan_min',count:1,slot:3});
travel(game,'south');game.dispatch({type:'recruit-world',unitId:'v2_shan_shen',count:1,slot:4});
await mkdir('artifacts',{recursive:true});
let save=await game.save();await Campaign.load(save);
await writeFile('artifacts/walk-review-army.json',JSON.stringify(save));
travel(game,'foe-2');game.dispatch({type:'fight'});
save=await game.save();await Campaign.load(save);
await writeFile('artifacts/walk-review-battle.json',JSON.stringify(save));
