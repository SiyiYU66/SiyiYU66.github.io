// Stable placement keyed by project ID. No random state is used per frame.
export function surfaceLayout(projectId){
  let seed=2166136261;
  for(const c of projectId)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  return {seed,arc:{x:.44+random()*.1,y:.55+random()*.1,radius:.29+random()*.04,start:.1+random()*.3,length:.65+random()*.35},crease:{x:.88+random()*.025,y:.105+random()*.025,length:.035+random()*.015},grainSeed:Math.floor(random()*4294967295)};
}
