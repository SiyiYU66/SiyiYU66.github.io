import {LatheGeometry,RingGeometry,Vector2} from './vendor/three.module.js';

// A revolved, rounded physical edge joining both planar faces. The outer
// diameter and total thickness stay fixed; there is no screen-space outline.
export function createBeveledDiscGeometry({radius,thickness,bevel,innerRadius=.2,segments=192}){
  if(!(bevel>0&&bevel<thickness/2))throw new RangeError('Disc bevel must fit inside half the thickness.');
  const h=thickness/2,faceRadius=radius-bevel,profile=[];
  for(let step=0;step<=8;step++){
    const angle=step/8*Math.PI/2;
    profile.push(new Vector2(faceRadius+bevel*Math.sin(angle),-h+bevel-bevel*Math.cos(angle)));
  }
  profile.push(new Vector2(radius,h-bevel));
  for(let step=1;step<=8;step++){
    const angle=step/8*Math.PI/2;
    profile.push(new Vector2(faceRadius+bevel*Math.cos(angle),h-bevel+bevel*Math.sin(angle)));
  }
  const edge=new LatheGeometry(profile,segments).rotateX(Math.PI/2);
  const face=new RingGeometry(innerRadius,faceRadius,segments,1);
  const positions=face.getAttribute('position'),uv=face.getAttribute('uv');
  // Keep the existing full-disc print scale: the bevel trims the image margin.
  for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)/radius+1)/2,(positions.getY(i)/radius+1)/2);
  return {edge,face,faceRadius,profile:profile.map(p=>({radius:p.x,z:p.y}))};
}
