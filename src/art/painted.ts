import './painted.css';
import './motion.css';
import {motionStyle} from './motion';
const base=import.meta.env.BASE_URL+'assets/painted/';
const escape=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Whole PNG atlas is used directly; CSS selects a cell, no destructive image slicing. */
export function unitFigure(sourceId:number,label:string,extra=''){
 const motion=motionStyle(sourceId);
 return `<span data-motion="${motion.kind}" class="unit-sprite ${extra}" role="img" aria-label="${escape(label)}" style="${motion.style};background-image:url('${base}units-v1.png');background-position:${sourceId%5*25}% ${Math.floor(sourceId/5)*25}%"><span class="sprite-body" aria-hidden="true"><span class="sprite-upper"></span><span class="sprite-leg sprite-leg-left"></span><span class="sprite-leg sprite-leg-right"></span></span><span class="sprite-aura" aria-hidden="true"></span></span>`;
}
/** Unit art: atlas cell by sourceTroopId, or a standalone image (v2 placeholders, later Codex art) with the same layers. */
export function troopFigure(u:{sourceTroopId:number;art?:string},label:string,extra=''){
 if(!u.art)return unitFigure(u.sourceTroopId,label,extra);
 return unitFigure(u.sourceTroopId,label,`single-art ${extra}`).replace(/background-image:url\('[^']*'\);background-position:[^"]*"/,`background-image:url('${import.meta.env.BASE_URL}${u.art}');background-position:50% 50%"`);
}
export function propFigure(index:number){return `<span class="scenery-prop" aria-hidden="true" style="background-image:url('${base}props-v1.png');background-position:${index%2*100}% ${Math.floor(index/2)*100}%"></span>`;}
export const paintedBackground=base+'courtyard-v1.png';
export function portraitFigure(index:number,label:string,extra=''){return `<span class="portrait-sprite ${extra}" role="img" aria-label="${escape(label)}" style="background-image:url('${base}portraits-v1.png');background-position:${index%5*25}% ${Math.floor(index/5)*25}%"></span>`;}
export function worldFigure(index:number,label:string,extra=''){return `<span class="world-item-sprite ${extra}" role="img" aria-label="${escape(label)}" style="background-image:url('${base}world-items-v1.png');background-position:${index%6*20}% ${Math.floor(index/6)*20}%"></span>`;}
export function sceneFigure(index:number,label:string,extra=''){return `<span class="atlas-scene ${extra}" role="img" aria-label="${escape(label)}">${portraitFigure(21+index,label,'scene-square')}</span>`;}
export function atlasSvg(index:number,x:number,y:number,size:number,portraits=false){const columns=portraits?5:6;return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${index%columns*100} ${Math.floor(index/columns)*100} 100 100" preserveAspectRatio="none" aria-hidden="true" style="pointer-events:none"><image href="${base}${portraits?'portraits-v1':'world-items-v1'}.png" width="${columns*100}" height="${columns*100}"/></svg>`;}
/** SVG patterns keep each map tile's hit box local; a clipped full-atlas <image> inflates g.getBBox(). */
export function mapAtlasPatterns(){const patterns=(count:number,columns:number,filename:string,prefix:string)=>Array.from({length:count},(_,i)=>`<pattern id="${prefix}-${i}" width="1" height="1" patternUnits="objectBoundingBox" viewBox="${i%columns*100} ${Math.floor(i/columns)*100} 100 100" preserveAspectRatio="none"><image href="${base}${filename}.png" width="${columns*100}" height="${columns*100}"/></pattern>`).join('');return `<defs>${patterns(36,6,'world-items-v1','painted-world')}${patterns(21,5,'portraits-v1','painted-hero')}</defs>`;}
export function mapAtlasRect(index:number,x:number,y:number,size:number,hero=false){return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="url(#${hero?'painted-hero':'painted-world'}-${index})" style="pointer-events:none" aria-hidden="true"/>`;}
