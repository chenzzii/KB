import {hash,canonical} from '../core/replay';
import {dataHash as baselineHash} from '../content/load';
import {balance,balanceV2,map,places,heroClasses,villains,artifacts} from './content';
import {newWorld,applyWorld,campaignVersion,campaignVersion2} from './engine';
import type {Options,WorldCommand,World} from './types';
export type Save={schemaVersion:1;rulesetVersion:string;dataHash:string;options:Options;commands:WorldCommand[];snapshot:World;stateHash:string};
/** The v1 hash is unchanged so existing saves still verify; v2 adds its own balance file. */
export async function campaignHash(ruleset:string=campaignVersion){return ruleset===campaignVersion2?hash({baselineHash,balance,balanceV2,map,places,heroClasses,villains,artifacts}):hash({baselineHash,balance,map,places,heroClasses,villains,artifacts});}
export class Campaign {
 readonly options:Options;state:World;commands:WorldCommand[]=[];
 constructor(options:Options={seed:'jiuzhou-2026',heroId:'wu_jiang',mode:'enhanced'}){this.options={...options};
  // An absent ruleset means campaign-1.0.0; never store it as an undefined key (hashes must match JSON round trips).
  if(this.options.ruleset===undefined)delete this.options.ruleset;this.state=newWorld(this.options);}
 dispatch(c:WorldCommand){this.state=applyWorld(this.state,c);this.commands.push(structuredClone(c));}
 async save():Promise<Save>{const snapshot=structuredClone(this.state),commands=structuredClone(this.commands);const ruleset=this.options.ruleset??campaignVersion;return {schemaVersion:1,rulesetVersion:ruleset,dataHash:await campaignHash(ruleset),options:{...this.options},commands,snapshot,stateHash:await hash(snapshot)};}
 static async load(value:unknown){
  if(!value||typeof value!=='object')throw Error('存檔必須是 JSON 物件');const s=value as Save;
  const ruleset=s.options&&typeof s.options==='object'?(s.options.ruleset??campaignVersion):'';
  if(s.schemaVersion!==1||(s.rulesetVersion!==campaignVersion&&s.rulesetVersion!==campaignVersion2)||s.rulesetVersion!==ruleset||s.dataHash!==await campaignHash(ruleset))throw Error('此存檔版本或戰役資料不相容；演武回放請使用演武頁匯入');
  if(!Array.isArray(s.commands)||s.commands.length>50000)throw Error('存檔指令數不合法');
  const restored=new Campaign(s.options);
  for(const c of s.commands){if(!c||typeof c!=='object'||typeof c.type!=='string')throw Error('損壞的旅程指令');restored.dispatch(c);}
  if(canonical(restored.state)!==canonical(s.snapshot)||await hash(restored.state)!==s.stateHash)throw Error('存檔重算不一致，未載入任何資料');return restored;
 }
}
