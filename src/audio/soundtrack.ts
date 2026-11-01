import {scores,type Scene} from './score';
import {Ensemble} from './synth';
export type Cue='step'|'fly'|'attack'|'shot'|'magic'|'heal'|'victory'|'defeat'|'coin';
class Soundtrack{
 private ctx:AudioContext|null=null;private ensemble:Ensemble|null=null;private bus:GainNode|null=null;
 private timer:ReturnType<typeof setInterval>|undefined;private current:Scene|null=null;private enabled=false;private visible=true;private pageVisible=true;
 private origin=0;private nextNote=0;private loop=0;private generation=0;
 volume=.45;scene:Scene='map';
 constructor(){
  try{const stored=localStorage.getItem('jiuzhou-music-volume');if(stored!==null&&Number.isFinite(Number(stored)))this.volume=Math.max(0,Math.min(1,Number(stored)));}catch{/* Optional browser storage. */}
  document.addEventListener('visibilitychange',()=>{this.pageVisible=!document.hidden;document.body.classList.toggle('presentation-hidden',document.hidden);this.sync();});
 }
 private context(){if(!this.ctx){this.ctx=new AudioContext();this.ensemble=new Ensemble(this.ctx,this.ctx.destination);}return this.ctx;}
 async toggle(){
  this.enabled=!this.enabled;
  if(this.enabled)try{await this.context().resume();}catch{this.enabled=false;}
  this.sync();return this.enabled;
 }
 get on(){return this.enabled;}
 get active(){return this.current;}
 get title(){return scores[this.scene].title;}
 setScene(scene:Scene,visible=true){this.scene=scene;this.visible=visible;this.sync();}
 setVolume(value:number){this.volume=Math.max(0,Math.min(1,value));if(this.bus&&this.ctx)this.bus.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.06);try{localStorage.setItem('jiuzhou-music-volume',String(this.volume));}catch{/* Optional. */}}
 private stop(){
  this.generation++;if(this.timer)clearInterval(this.timer);this.timer=undefined;this.current=null;
  if(this.bus&&this.ctx){const old=this.bus,at=this.ctx.currentTime;old.gain.cancelScheduledValues(at);old.gain.setValueAtTime(old.gain.value,at);old.gain.linearRampToValueAtTime(0,at+.65);setTimeout(()=>old.disconnect(),900);this.bus=null;}
 }
 private sync(){
  if(!this.enabled||!this.visible||!this.pageVisible){if(this.current)this.stop();return;}
  if(this.current===this.scene)return;
  this.stop();const ctx=this.context(),score=scores[this.scene];this.current=this.scene;this.bus=ctx.createGain();this.bus.gain.setValueAtTime(0,ctx.currentTime);this.bus.gain.linearRampToValueAtTime(this.volume,ctx.currentTime+1.15);this.bus.connect(this.ensemble!.input);
  this.origin=ctx.currentTime+.06;this.nextNote=0;this.loop=0;const generation=this.generation,bus=this.bus;
  const schedule=()=>{
   if(generation!==this.generation)return;const seconds=60/score.bpm,loopDuration=score.beats*seconds;
   // A long suspension skips elapsed material rather than emitting a burst of old notes.
   if(ctx.currentTime>this.origin+(this.loop+1)*loopDuration){this.loop=Math.floor((ctx.currentTime-this.origin)/loopDuration);this.nextNote=0;}
   let guard=0;while(guard++<200){const n=score.notes[this.nextNote],at=this.origin+this.loop*loopDuration+n.beat*seconds;if(at>ctx.currentTime+.18)break;
    if(at>=ctx.currentTime-.025)this.ensemble!.note(n,Math.max(at,ctx.currentTime+.002),seconds,bus);
    if(++this.nextNote>=score.notes.length){this.nextNote=0;this.loop++;}
   }
  };schedule();this.timer=setInterval(schedule,30);
 }
 cue(kind:Cue){
  if(!this.pageVisible)return;
  try{const ctx=this.context();void ctx.resume().catch(()=>{});const at=ctx.currentTime+.008;if(kind==='coin'){
    // Two bright coin chimes (叮、噹) with a short metallic shimmer.
    [[93,0],[100,.07],[96,.19],[103,.25]].forEach(([midi,offset],i)=>this.ensemble!.note({beat:0,duration:i%2?.32:.14,midi,voice:'bell',gain:i%2?.13:.1,pan:i%2?.18:-.18},at+offset,1));
    this.ensemble!.note({beat:0,duration:.05,midi:84,voice:'shaker',gain:.05,pan:0},at,1);return;}
   const notes=kind==='victory'?[74,78,81,86]:kind==='defeat'?[62,60,57]:kind==='heal'?[74,78,83]:kind==='magic'?[74,81,86]:kind==='shot'?[81]:kind==='fly'?[86]:kind==='attack'?[45]:[38];
   notes.forEach((midi,i)=>this.ensemble!.note({beat:0,duration:kind==='step'?.08:kind==='attack'?.16:.22,midi,voice:kind==='step'||kind==='attack'?'drum':kind==='shot'?'plucked':'bell',gain:kind==='step'?.065:.12,pan:0},at+i*.12,1));
  }catch{/* Sound must never prevent a command. */}
 }
}
export const soundtrack=new Soundtrack();
