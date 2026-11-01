export type Scene='map'|'battle';
export type Voice='flute'|'plucked'|'strings'|'bass'|'horn'|'bell'|'drum'|'shaker';
export type Note={beat:number;duration:number;midi:number;voice:Voice;gain:number;pan:number};
export type Score={scene:Scene;title:string;bpm:number;bars:number;beats:number;notes:Note[]};
// Newly composed motifs. Each phrase has its own rhythm, rests and answering line.
// Map: D major pentatonic; battle: D minor pentatonic. MIDI is scientific pitch notation.
const mapPhrases=[
 [[74,2],[78,1],[81,1]],[[83,1.5],[81,.5],[78,1],[76,1]],[[74,1],[76,1],[78,2]],[[81,2],[0,1],[78,1]],
 [[79,1.5],[81,.5],[83,1],[86,1]],[[83,2],[81,1],[78,1]],[[76,1],[78,1],[76,1],[73,1]],[[74,3],[0,1]],
 [[81,1],[83,.5],[86,.5],[88,1],[86,1]],[[83,1.5],[81,.5],[78,2]],[[79,1],[83,1],[81,1],[79,1]],[[78,2],[76,1],[0,1]],
 [[74,1],[78,1],[81,1],[83,1]],[[86,2],[83,1],[81,1]],[[78,1.5],[76,.5],[73,1],[76,1]],[[74,3],[0,1]]
] as const;
const battlePhrases=[
 [[62,.5],[62,.5],[69,1],[72,.5],[69,.5],[67,1]],[[65,.5],[67,.5],[69,1.5],[0,.5],[65,1]],[[60,1],[67,.5],[72,.5],[70,1],[67,1]],[[69,.5],[67,.5],[65,1],[62,1],[0,1]],
 [[62,.5],[65,.5],[69,.5],[74,.5],[77,1],[74,1]],[[72,1],[69,.5],[67,.5],[65,1],[62,1]],[[67,.5],[69,.5],[72,1],[69,1],[65,1]],[[62,2],[0,.5],[62,.5],[65,.5],[69,.5]],
 [[74,.5],[74,.5],[77,1],[81,1],[79,.5],[77,.5]],[[76,1],[72,.5],[69,.5],[72,1],[0,1]],[[70,.5],[74,.5],[77,1],[74,1],[70,1]],[[69,1.5],[67,.5],[65,1],[62,1]],
 [[67,.5],[69,.5],[72,1],[74,.5],[72,.5],[69,1]],[[65,.5],[67,.5],[69,.5],[72,.5],[77,1],[74,1]],[[69,1],[65,1],[61,.5],[64,.5],[69,1]],[[74,2],[0,1],[69,.5],[72,.5]]
] as const;
export function compose(scene:Scene):Score{
 const notes:Note[]=[],battle=scene==='battle',bpm=battle?116:80;
 const add=(beat:number,duration:number,midi:number,voice:Voice,gain:number,pan=0)=>{if(midi)notes.push({beat,duration,midi,voice,gain,pan});};
 const harmony=battle?[[50,57,65],[48,55,64],[46,53,62],[43,50,58],[50,57,65],[46,53,62],[43,50,58],[45,52,61]]:[[50,57,66],[47,54,62],[43,50,59],[45,52,61],[50,57,66],[43,50,59],[47,54,62],[45,52,61]];
 for(let bar=0;bar<32;bar++){
  const section=Math.floor(bar/8),phrase=(battle?battlePhrases:mapPhrases)[bar%16],chord=harmony[bar%8],start=bar*4;
  const intensity=section===0?.74:section===2?1:section===3?.86:.9;
  let offset=0;for(const [pitch,duration] of phrase){const octave=!battle&&section===2?12:0;add(start+offset,duration*.86,pitch+octave,battle?'horn':'flute',.14*intensity,battle?-.08:.14);offset+=duration;}
  // Four-beat harmony, warm bass and an interlocking, intentionally quieter ostinato.
  chord.forEach((m,i)=>add(start,3.75,m+12,'strings',battle?.025:.027,(i-1)*.42));
  add(start,battle?1.5:3.6,chord[0]-12,'bass',battle?.18:.12,-.08);
  if(battle)add(start+2,1.5,chord[0]-12,'bass',.14,-.08);
  const order=battle?[0,1,2,1,0,2,1,2]:[0,1,2,1];
  order.forEach((voice,i)=>add(start+i*(battle?.5:1),battle?.32:.72,chord[voice]+(battle?12:24),'plucked',battle?.075:.065,i%2?.34:-.34));
  // Answering phrases enter after the introduction, with space for the lead to breathe.
  if(section>0&&bar%2===1){add(start+2,.8,chord[2]+(battle?12:24),battle?'strings':'bell',battle?.05:.045,-.36);add(start+3,.8,chord[1]+24,battle?'strings':'bell',.035,-.25);}
  if(battle){
   for(const beat of [0,1.5,2,3.5])add(start+beat,.45,beat===0?42:beat===2?48:55,'drum',beat===0?.32:.19,beat===0?-.22:.22);
   for(let i=0;i<8;i++)add(start+i*.5,.09,70,'shaker',i%2?.024:.036,i%2?-.45:.45);
   if(bar%8===7)for(const beat of [2.5,2.75,3,3.25,3.5,3.75])add(start+beat,.17,50+beat*2,'drum',.14+(beat-2.5)*.06,(beat-3)*.55);
  }else{
   if(bar%2===0)add(start,.38,44,'drum',.085,-.2);
   if(section>0)for(const beat of [1,3])add(start+beat,.12,76,'shaker',.021,beat===1?-.5:.5);
  }
 }
 return {scene,title:battle?'烽鼓破陣':'青嵐遠行',bpm,bars:32,beats:128,notes:notes.sort((a,b)=>a.beat-b.beat)};
}
export const scores={map:compose('map'),battle:compose('battle')};
