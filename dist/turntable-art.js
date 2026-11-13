// Shared rotating record surface for the opening.
// Fixed surface relief, not an albedo overlay. The same scratches rotate with
// this opening record and only become visible when they cross the room lamp.
export function recordSurfaceCanvases({seed:initialSeed=0x51a17e,pictureDisc=true}={}){
  const size=768,half=size/2,heights=new Float32Array(size*size);
  let seed=initialSeed;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const scratches=[
    {angle:random()*Math.PI*2,radius:.72+random()*.1,length:.14},
    {angle:random()*Math.PI*2,radius:.78+random()*.12,length:.09}
  ];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const dx=(x-half)/half,dy=(y-half)/half,radius=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    // The photograph stays smooth; most groove energy belongs to its black rim.
    const ringStrength=!pictureDisc||radius>.83?.045:.009;
    let height=Math.sin(radius*half*2.5)*ringStrength;
    for(const mark of scratches){
      const difference=Math.atan2(Math.sin(angle-mark.angle),Math.cos(angle-mark.angle));
      const along=Math.max(0,1-Math.abs(radius-mark.radius)/mark.length);
      height+=Math.exp(-difference*difference/.000018)*along*.10;
    }
    heights[y*size+x]=height;
  }
  const normal=document.createElement('canvas'),roughness=document.createElement('canvas');
  normal.width=normal.height=roughness.width=roughness.height=size;
  const nc=normal.getContext('2d'),rc=roughness.getContext('2d'),np=nc.createImageData(size,size),rp=rc.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const index=y*size+x,p=index*4;
    const dx=(heights[y*size+Math.min(size-1,x+1)]-heights[y*size+Math.max(0,x-1)])*3.8;
    const dy=(heights[Math.min(size-1,y+1)*size+x]-heights[Math.max(0,y-1)*size+x])*3.8;
    const length=Math.hypot(dx,dy,1);
    np.data[p]=Math.round((.5-dx/length*.5)*255);np.data[p+1]=Math.round((.5+dy/length*.5)*255);np.data[p+2]=Math.round((.5+.5/length)*255);np.data[p+3]=255;
    const value=Math.round(238-Math.abs(heights[index])*110);
    rp.data[p]=rp.data[p+1]=rp.data[p+2]=value;rp.data[p+3]=255;
  }
  nc.putImageData(np,0,0);rc.putImageData(rp,0,0);
  return {normal,roughness};
}
