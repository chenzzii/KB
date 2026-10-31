export function seedToUint(seed:string):number {
 let h=2166136261;
 for(let i=0;i<seed.length;i++) h=Math.imul(h^seed.charCodeAt(i),16777619);
 return (h>>>0)||0x9e3779b9;
}
export function randomInt(state:number,min:number,max:number):[number,number] {
 let x=state||0x9e3779b9; x^=x<<13;x^=x>>>17;x^=x<<5;
 const next=x>>>0;
 return [min+Math.floor((next/4294967296)*(max-min+1)),next];
}
