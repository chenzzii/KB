/** Presentation profiles indexed by the immutable sourceTroopId. No game rules live here. */
export const motionProfiles=[
 ['villager',3.4],['winged',1.8],['guard',2.7],['beast',2.2],['skeleton',3.1],
 ['shambler',3.8],['smith',2.8],['crossbow',2.6],['archer',3.2],['archer',2.9],
 ['spear',3.3],['ranger',2.5],['heavy',3.6],['spirit',3.7],['heavy',3.1],
 ['beast',2.6],['berserker',2.1],['tree',4.8],['cavalry',2.4],['shaman',3.9],
 ['wind',3.1],['vampire',3.3],['giant',4.1],['reaper',3.6],['dragon',3.8]
] as const;
export function motionStyle(sourceId:number,pace=1){
 const [kind,basePeriod]=motionProfiles[sourceId],period=basePeriod*pace;
 // Advance the phase with the document timeline so DOM renders do not restart idle motion.
 const clock=typeof document==='undefined'?0:Number(document.timeline.currentTime??performance.now())/1000;
 return {kind,style:`--idle-period:${period}s;--idle-phase:-${((clock+sourceId*.317)%period).toFixed(3)}s`};
}
