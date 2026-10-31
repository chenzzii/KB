import {dataHash} from '../content/load';
import {applyCommand,initialState,rulesetVersion} from './engine';
import type {Command,Event,State,ScenarioId} from './types';
export function canonical(value:unknown):string {
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonical((value as Record<string,unknown>)[k])}`).join(',')}}`;
}
export async function hash(value:unknown):Promise<string>{
 const bytes=new TextEncoder().encode(canonical(value));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export type Replay={schemaVersion:'2';rulesetVersion:string;dataHash:string;seed:string;initialState:State;commands:Command[];events:Event[];finalStateHash:string};
export class Session {
 state:State; readonly initial:State; commands:Command[]=[];events:Event[]=[];
 constructor(seed='demo-2026',scenarioId:ScenarioId='skirmish'){this.initial=initialState(seed,scenarioId);this.state=structuredClone(this.initial);}
 dispatch(command:Command){const result=applyCommand(this.state,command);this.state=result.state;this.events.push(...result.events);this.commands.push(structuredClone(command));}
 async export():Promise<Replay>{return {schemaVersion:'2',rulesetVersion,dataHash,seed:this.initial.seed,initialState:structuredClone(this.initial),commands:structuredClone(this.commands),events:structuredClone(this.events),finalStateHash:await hash(this.state)};}
 static async import(value:unknown):Promise<Session>{
  if(!value||typeof value!=='object')throw Error('回放必須是 JSON 物件');
  const r=value as Replay;
  if(r.schemaVersion!=='2'||r.rulesetVersion!==rulesetVersion||r.dataHash!==dataHash)throw Error('回放版本或資料雜湊不相符');
  const session=new Session(r.seed,r.initialState?.scenarioId);
  if(canonical(r.initialState)!==canonical(session.initial))throw Error('回放初始狀態不符此版本');
  if(!Array.isArray(r.commands)||r.commands.length>50000)throw Error('回放指令數不合法');
  for(const c of r.commands){validateCommand(c);session.dispatch(c);}
  if(await hash(session.state)!==r.finalStateHash||canonical(session.events)!==canonical(r.events))throw Error('回放結果驗證失敗，檔案可能已損壞或遭修改');
  return session;
 }
}
export function validateCommand(c:Command){
 if(!c||typeof c!=='object')throw Error('指令格式不合法');
 switch(c.type){
  case 'start':case 'end-turn':return;
  case 'move':if(typeof c.actorId==='string'&&c.cell&&Number.isInteger(c.cell.x)&&Number.isInteger(c.cell.y))return;break;
  case 'attack':case 'ranged-attack':case 'magic-attack':if(typeof c.actorId==='string'&&typeof c.targetId==='string')return;break;
  case 'cast':if(Number.isInteger(c.spellId)&&typeof c.targetId==='string'&&(c.cell===undefined||(c.cell&&Number.isInteger(c.cell.x)&&Number.isInteger(c.cell.y))))return;break;
  case 'swap':case 'merge':if(Number.isInteger(c.a)&&Number.isInteger(c.b))return;break;
  case 'split':if(Number.isInteger(c.slot)&&Number.isInteger(c.target)&&Number.isInteger(c.count))return;break;
  case 'recruit':if(Number.isInteger(c.slot)&&typeof c.unitId==='string'&&Number.isInteger(c.count))return;break;
 }
 throw Error('未知或格式不合法的指令');
}
