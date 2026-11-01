import type {Note,Score} from './score';
const frequency=(midi:number)=>440*2**((midi-69)/12);
/** Identical timbres in the live player and offline listening / waveform checks. */
export class Ensemble{
 readonly input:GainNode;readonly output:GainNode;
 private noise:AudioBuffer;
 private plucks=new Map<number,AudioBuffer>();
 constructor(private ctx:BaseAudioContext,destination:AudioNode){
  this.input=ctx.createGain();this.output=ctx.createGain();this.output.gain.value=.74;
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=14;compressor.ratio.value=4;compressor.attack.value=.008;compressor.release.value=.2;
  this.input.connect(compressor);compressor.connect(this.output);this.output.connect(destination);
  const reverb=ctx.createConvolver(),wet=ctx.createGain();wet.gain.value=.18;
  const impulse=ctx.createBuffer(2,Math.floor(ctx.sampleRate*1.65),ctx.sampleRate);let seed=7127;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1;};
  for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<data.length;i++)data[i]=random()*(1-i/data.length)**2.7*.35;}
  reverb.buffer=impulse;this.input.connect(reverb);reverb.connect(wet);wet.connect(compressor);
  this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=random();
 }
 private string(midi:number){
  if(this.plucks.has(midi))return this.plucks.get(midi)!;
  const size=Math.round(this.ctx.sampleRate/frequency(midi)),ring=new Float32Array(size),length=Math.floor(this.ctx.sampleRate*1.8),buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate),data=buffer.getChannelData(0);
  let seed=31+midi;for(let i=0;i<size;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;ring[i]=seed/4294967296*2-1;}
  for(let i=0;i<length;i++){const a=i%size,b=(i+1)%size;data[i]=ring[a];ring[a]=(ring[a]+ring[b])*.495;}
  this.plucks.set(midi,buffer);return buffer;
 }
 note(note:Note,at:number,beatSeconds:number,bus:AudioNode=this.input){
  const c=this.ctx,duration=Math.max(.035,note.duration*beatSeconds),gain=c.createGain(),pan=c.createStereoPanner();pan.pan.value=note.pan;gain.connect(pan);pan.connect(bus);
  const percussion=note.voice==='drum'||note.voice==='shaker',attack=note.voice==='strings'?.12:note.voice==='flute'?.045:.008,release=note.voice==='strings'?.4:note.voice==='flute'?.16:.07;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(note.gain,at+Math.min(attack,duration*.25));gain.gain.setValueAtTime(note.gain,at+duration*.65);gain.gain.exponentialRampToValueAtTime(.0001,at+duration+release);
  const end=at+duration+release+.02;
  const oscillator=(type:OscillatorType,midi:number,level=1,detune=0)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency(midi);o.detune.value=detune;g.gain.value=level;o.connect(g);g.connect(gain);o.start(at);o.stop(end);return o;};
  if(note.voice==='plucked'){
   const source=c.createBufferSource();source.buffer=this.string(note.midi);source.connect(gain);gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(note.gain*2.4,at);gain.gain.exponentialRampToValueAtTime(.0001,at+Math.min(1.75,duration+.6));source.start(at);source.stop(at+1.8);
  }else if(percussion){
   const source=c.createBufferSource(),filter=c.createBiquadFilter();source.buffer=this.noise;filter.type=note.voice==='drum'?'lowpass':'highpass';filter.frequency.value=note.voice==='drum'?900:6500;source.connect(filter);filter.connect(gain);source.start(at);source.stop(end);
   gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(note.gain*(note.voice==='drum'?.25:1),at);gain.gain.exponentialRampToValueAtTime(.0001,end);
   if(note.voice==='drum'){const o=c.createOscillator(),g=c.createGain();o.frequency.setValueAtTime(frequency(note.midi)*1.6,at);o.frequency.exponentialRampToValueAtTime(frequency(note.midi)*.48,end);g.gain.setValueAtTime(note.gain*1.3,at);g.gain.exponentialRampToValueAtTime(.0001,end);o.connect(g);g.connect(pan);o.start(at);o.stop(end);}
  }else if(note.voice==='flute'){
   const fundamental=oscillator('sine',note.midi,.82);oscillator('sine',note.midi+12,.14);oscillator('sine',note.midi+19,.055);
   const vibrato=c.createOscillator(),depth=c.createGain();vibrato.frequency.value=4.8;depth.gain.value=8;vibrato.connect(depth);depth.connect(fundamental.detune);vibrato.start(at);vibrato.stop(end);
   const breath=c.createBufferSource(),filter=c.createBiquadFilter(),level=c.createGain();breath.buffer=this.noise;breath.loop=true;filter.type='bandpass';filter.frequency.value=frequency(note.midi)*2;filter.Q.value=2;level.gain.value=.025;breath.connect(filter);filter.connect(level);level.connect(gain);breath.start(at);breath.stop(end);
  }else if(note.voice==='strings'||note.voice==='horn'){
   const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=note.voice==='horn'?1400:1800;filter.Q.value=.5;
   for(const detune of [-7,7]){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.value=frequency(note.midi);o.detune.value=detune;g.gain.value=.23;o.connect(g);g.connect(filter);o.start(at);o.stop(end);}filter.connect(gain);
  }else if(note.voice==='bell'){oscillator('sine',note.midi,.65);oscillator('sine',note.midi+19,.2);oscillator('sine',note.midi+28,.07);}
  else {oscillator('triangle',note.midi,.85);oscillator('sine',note.midi,.25);}
  // Disconnect per-note graphs after the tail. Offline rendering has no wall-clock cleanup.
  if(c instanceof AudioContext)setTimeout(()=>{gain.disconnect();pan.disconnect();},Math.max(0,(end-c.currentTime+.2)*1000));
 }
 disconnect(){this.input.disconnect();this.output.disconnect();}
}
export function scheduleScore(ctx:BaseAudioContext,score:Score,destination:AudioNode,beats=score.beats){
 const ensemble=new Ensemble(ctx,destination),seconds=60/score.bpm;
 for(const note of score.notes)if(note.beat<beats)ensemble.note(note,.05+note.beat*seconds,seconds);
 return ensemble;
}
