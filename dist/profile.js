import {canvasFont} from './typography.js';
// Editable About Me content. No dates or role descriptions were inferred.
export const profile={
  id:'siyi-yu',
  name:'SIYI YU',
  degree:'MEng Design Engineering',
  university:'Imperial College London',
  introduction:'I’m a Design Engineering student at Imperial College London. I use simulation and testing to understand how designs perform, from battery cooling systems to energy-efficient vehicles.',
  photo:'./assets/profile/siyi-yu.jpg',
  cv:'./assets/cv/siyi-yu-cv.pdf',
  // Both artworks use photo above. Sleeve defaults to the whole portrait;
  // the picture disc has an independent crop, with the face above its hole.
  portraitCrops:{
    sleeve:{fit:'contain',zoom:1,positionX:.5,positionY:.5},
    disc:{fit:'cover',zoom:1.12,positionX:.5,positionY:.24}
  },
  rim:'SIYI YU · DESIGN ENGINEERING · LISTENING ROOM',
  experience:[
    {organization:'Imperial Formula Racing',role:'Operations Lead'},
    {organization:'Imperial Eco-Marathon',role:'Engineer'},
    {organization:'FEA',role:'Undergraduate Teaching Assistant'}
  ]
};

export async function loadProfileMedia(){
  let status={photo:false,cv:false};
  try{const response=await fetch('./asset-status.json',{cache:'no-store'});if(response.ok)status={...status,...await response.json()};}catch{}
  let photo=null;
  if(status.photo){
    const image=new Image();image.src=profile.photo;
    try{await image.decode();photo=image;}catch{status.photo=false;}
  }
  return {photo,cvAvailable:!!status.cv};
}

export function portraitCanvas(photo,kind='disc'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#d8d7cc';c.fillRect(0,0,1024,1024);
  if(photo){
    const {fit,zoom,positionX,positionY}=profile.portraitCrops[kind];
    const scale=(fit==='contain'?Math.min:Math.max)(1024/photo.naturalWidth,1024/photo.naturalHeight)*zoom;
    const w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
    c.drawImage(photo,(1024-w)*positionX,(1024-h)*positionY,w,h);
  }else{
    const background=c.createLinearGradient(0,0,800,1024);background.addColorStop(0,'#ddd9cf');background.addColorStop(.55,'#b7b9a9');background.addColorStop(1,'#657163');c.fillStyle=background;c.fillRect(0,0,1024,1024);
    c.strokeStyle='#f1ede14d';c.lineWidth=2;
    for(let n=0;n<10;n++){c.beginPath();c.arc(760,740,230+n*24,0,Math.PI*2);c.stroke();}
    c.fillStyle='#303d32';c.textAlign='center';c.font=canvasFont(146,400,'title');c.fillText('SIYI YU',512,365);
    c.font=canvasFont(22);c.fillText('DESIGN ENGINEERING',512,714);
    c.font=canvasFont(17);c.fillText('PORTRAIT / TO FOLLOW',512,766);
  }
  return canvas;
}
