/** Player presentation preferences. UI only: nothing here reaches the rules engine or save files. */
export type Settings={sfx:boolean;motion:boolean;music:boolean;tips:boolean;skipStory:boolean};
const key='jiuzhou-settings';
const defaults:Settings={sfx:true,motion:true,music:true,tips:true,skipStory:false};
function read():Settings{
 try{const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object')return {...defaults,...Object.fromEntries(Object.entries(parsed).filter(([k,v])=>k in defaults&&typeof v==='boolean'))};}}catch{/* Optional browser storage. */}
 return {...defaults};
}
export const settings:Settings=read();
export function saveSettings(patch:Partial<Settings>){
 Object.assign(settings,patch);
 try{localStorage.setItem(key,JSON.stringify(settings));}catch{/* Optional browser storage. */}
 document.body.classList.toggle('motion-paused',!settings.motion);
}
/** Automated checks written before the title screen existed set this flag to go straight to the old layout. */
export function automationSkipsTitle(){try{return localStorage.getItem('jiuzhou-automation-skip-title')==='1';}catch{return false;}}
