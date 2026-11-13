import {albumArt} from './art.js';

// All visual lookups use stable project IDs, including the second/third demos.
const covers=new Map(),heroes=new Map(),thumbnails=new Map(),coverLoads=new Map();
export function coverImagePlacement(width,height,size,crop={}){
  // Diagram/render covers fit within the circular print rather than losing
  // their outer silhouettes to the disc crop. Existing photo crops stay intact.
  const base=crop.fit==='disc'?size/Math.hypot(width,height):Math.max(size/width,size/height);
  const scale=base*(crop.zoom||1);
  const w=width*scale,h=height*scale;
  return {x:(size-w)*(crop.positionX??.5),y:(size-h)*(crop.positionY??.5),width:w,height:h};
}
export async function preloadProjectCovers(projects){
  return Promise.all(projects.filter(project=>project.cover).map(ensureProjectCover));
}
export function ensureProjectCover(project){
  if(coverLoads.has(project.id))return coverLoads.get(project.id);
  const pending=(async()=>{
    try{
      const image=new Image();image.src=project.cover;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
      const p=coverImagePlacement(image.naturalWidth,image.naturalHeight,1024,project.coverCrop);
      const context=canvas.getContext('2d');
      if(project.coverCrop?.background){context.fillStyle=project.coverCrop.background;context.fillRect(0,0,1024,1024);}
      context.drawImage(image,p.x,p.y,p.width,p.height);
      covers.set(project.id,canvas);return project.id;
    }catch(error){console.warn(`Project cover unavailable: ${project.id}`,error);return null;}
  })();
  coverLoads.set(project.id,pending);return pending;
}
export function projectCover(project){
  if(!covers.has(project.id))covers.set(project.id,albumArt(project.art));
  return covers.get(project.id);
}
export function projectHero(project){
  if(!heroes.has(project.id))heroes.set(project.id,project.hero||
    (project.id==='between-spaces'?'./assets/between-spaces.svg':projectCover(project).toDataURL()));
  return heroes.get(project.id);
}
export function discThumbnail(project){
  if(thumbnails.has(project.id))return thumbnails.get(project.id);
  const c=document.createElement('canvas');c.width=c.height=1024;const g=c.getContext('2d');
  g.save();g.beginPath();g.arc(512,512,510,0,Math.PI*2);g.clip();g.drawImage(projectCover(project),0,0);g.restore();
  g.strokeStyle='#d9d9d9';g.lineWidth=5;g.beginPath();g.arc(512,512,507,0,Math.PI*2);g.stroke();
  g.fillStyle='#d9d9d9';g.beginPath();g.arc(512,512,100,0,Math.PI*2);g.fill();
  g.fillStyle='#e9eef280';g.beginPath();g.arc(512,512,82,0,Math.PI*2);g.fill();
  g.globalCompositeOperation='destination-out';g.beginPath();g.arc(512,512,38,0,Math.PI*2);g.fill();
  const url=c.toDataURL();thumbnails.set(project.id,url);return url;
}
