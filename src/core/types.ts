export type Team = 'player' | 'enemy';
export type ScenarioId = 'skirmish' | 'abilities';
export type Cell = {x:number;y:number};
export type Stack = { id:string; unitId:string; count:number; hp:number; maxCount:number; ammo:number; magicCharges:number; flights:number; cell:Cell|null; moved:number; acted:boolean; retaliated:boolean; turnCount?:number; status:Record<string,string> };
export type State = { rulesMode?:'study'|'enhanced'; powers?:Record<Team,number[]>; spellPower?:Record<Team,number>; terrain?:'plain'|'forest'|'ruins'; obstacles?:Cell[]; seed:string; scenarioId:ScenarioId; rng:number; phase:'setup'|'battle'|'finished'; turn:Team; round:number; winner:Team|null; armies:Record<Team,(Stack|null)[]>; gold:number; leadership:number; nextId:number; spellbook:Record<Team,number[]>; spellUsed:Record<Team,boolean> };
export type Command =
 | {type:'start'|'end-turn'}
 | {type:'move';actorId:string;cell:Cell}
 | {type:'attack'|'ranged-attack'|'magic-attack';actorId:string;targetId:string}
 | {type:'cast';spellId:number;targetId:string;cell?:Cell}
 | {type:'swap'|'merge';a:number;b:number}
 | {type:'split';slot:number;count:number;target:number}
 | {type:'recruit';slot:number;unitId:string;count:number};
export type Event = {type:string;text:string;actorId?:string;targetId?:string;damage?:number;deaths?:number;remainingHp?:number;amount?:number;roll?:number};
export type Result = {state:State;events:Event[]};
