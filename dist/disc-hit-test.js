import {Raycaster,Vector2} from './vendor/three.module.js';

// The decision belongs to the independent tap, never to animation completion.
// Snapshot the settled centre at pointerdown so a moving side disc cannot open
// merely because it arrives at the centre before pointerup.
export function discTapAction({pressedId,releasedId,centredIdAtPress,dragged=false,cancelled=false}){
  if(cancelled||dragged||!pressedId||pressedId!==releasedId)return 'ignore';
  return pressedId===centredIdAtPress?'open':'select';
}

// Real mesh intersections respect ring holes, orientation and depth.
export function createDiscPicker(camera){
  const raycaster=new Raycaster(),pointer=new Vector2();
  return function pickDisc(x,y,width,height,discs){
    if(width<=0||height<=0||x<0||y<0||x>width||y>height)return null;
    camera.updateMatrixWorld();pointer.set(x/width*2-1,1-y/height*2);
    raycaster.setFromCamera(pointer,camera);
    const surfaces=[];
    for(const disc of discs){
      if(!disc.esterno.visible)continue;
      disc.esterno.updateWorldMatrix(true,true);
      for(const mesh of disc.pickMeshes)if(mesh.visible)surfaces.push(mesh);
    }
    const hit=raycaster.intersectObjects(surfaces,true)[0];if(!hit)return null;
    let owner=hit.object;
    while(owner&&!owner.userData.disc)owner=owner.parent;
    const disc=owner?.userData.disc;if(!disc)return null;
    const local=disc.inclina.worldToLocal(hit.point.clone());
    return {disc,point:hit.point,localX:Math.max(-1,Math.min(1,local.x)),localY:Math.max(-1,Math.min(1,local.y)),distance:hit.distance};
  };
}
