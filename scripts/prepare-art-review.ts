import {mkdir,writeFile} from 'node:fs/promises';
import {Campaign} from '../src/campaign/session';
import {travel} from './campaign-playthrough';
const game=new Campaign({seed:'art-review',heroId:'wu_jiang',mode:'enhanced'});
game.dispatch({type:'accept'});travel(game,'foe-2');game.dispatch({type:'fight'});
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/art-review-battle.json',JSON.stringify(await game.save()));
