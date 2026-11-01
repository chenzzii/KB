import type {State,Command,Stack,Cell} from '../core/types';
export type RulesMode='study'|'enhanced';
export type Ruleset='campaign-1.0.0'|'campaign-2.0.0';
/** ruleset is absent in v1 saves; new journeys from the UI use campaign-2.0.0. */
export type Options={seed:string;heroId:string;mode:RulesMode;ruleset?:Ruleset};
export type World={nextId:number;options:Options;position:Cell;day:number;steps:number;gold:number;leadership:number;commission:number;spellPower:number;army:(Stack|null)[];spellbook:number[];artifacts:number[];visited:string[];revealed:number[];bridges:number[];frozenTime:number;leadershipBuff:number;boat:boolean;weather:'晴'|'雨'|'霧';supplies:Record<string,Record<string,number>>;quest:boolean;route:'conquest'|'alliance'|'trade'|null;seals:string[];defeated:number[];claimed:number[];relations:{court:number;jianghu:number;spirits:number};battle:State|null;battleFoe:number|null;ending:string|null;log:string[]};
export type WorldCommand=
 | {type:'travel';cell:Cell}
 | {type:'wait';days:number}
 | {type:'accept'|'claim'|'rest'|'shrine'|'boat'|'retreat'|'finish'|'occupy'}
 | {type:'resolve-bandit';route:'conquest'|'alliance'|'trade'}
 | {type:'fight'}
 | {type:'recruit-world';unitId:string;count:number;slot:number}
 | {type:'formation';command:Command}
 | {type:'battle';command:Command}
 | {type:'buy-spell';spellId:number}
 | {type:'adventure-spell';spellId:number;cell?:Cell}
 | {type:'take-artifact';artifactId:number};
