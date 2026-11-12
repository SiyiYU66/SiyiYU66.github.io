import {portraitCanvas} from './profile.js';
import {canvasFont} from './typography.js';

export function createTurntableArt(photo){
  const sleeve=document.createElement('canvas');sleeve.width=sleeve.height=1024;const s=sleeve.getContext('2d');
  s.fillStyle='#d8d7cc';s.fillRect(0,0,1024,1024);
  // Reserve the footer outside the portrait so a contained image stays whole.
  s.drawImage(portraitCanvas(photo,'sleeve'),62,20,900,900);
  s.fillStyle='#e9e7db';s.fillRect(0,924,1024,100);s.fillStyle='#30392f';
  s.font=canvasFont(24,500);s.fillText('SIYI YU',42,974);s.font=canvasFont(17);s.textAlign='right';s.fillText('LISTENING ROOM / 01',982,974);
  s.strokeStyle='#777c68';s.lineWidth=1;s.strokeRect(18,18,988,988);

  const record=document.createElement('canvas');record.width=record.height=1024;const r=record.getContext('2d');
  r.fillStyle='#111416';r.fillRect(0,0,1024,1024);
  r.save();r.beginPath();r.arc(512,512,428,0,Math.PI*2);r.clip();r.drawImage(portraitCanvas(photo,'disc'),0,0);r.restore();
  for(let radius=433;radius<509;radius+=2.7){
    r.strokeStyle=radius%5>.7?'#35393a':'#1d2223';r.lineWidth=.75;r.beginPath();r.arc(512,512,radius,0,Math.PI*2);r.stroke();
  }
  r.strokeStyle='#6c736a';r.lineWidth=1.5;r.beginPath();r.arc(512,512,428,0,Math.PI*2);r.stroke();
  r.fillStyle='#e1dfcf';r.beginPath();r.arc(512,512,36,0,Math.PI*2);r.fill();
  return {sleeve,record};
}

export function woodCanvas(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const g=canvas.getContext('2d');
  const pixels=g.createImageData(1024,512);let seed=1729;
  for(let y=0;y<512;y++)for(let x=0;x<1024;x++){
    seed=(seed*1664525+1013904223)>>>0;
    const wave=Math.sin(y*.28+Math.sin(x*.009)*1.7+Math.sin(x*.024+y*.03)*.4);
    const grain=wave*1.8+Math.sin(y*.91+Math.sin(x*.003)*4)*.65+(seed/4294967296-.5)*2;
    const i=(y*1024+x)*4;pixels.data[i]=51+grain;pixels.data[i+1]=32+grain*.72;pixels.data[i+2]=22+grain*.53;pixels.data[i+3]=255;
  }
  g.putImageData(pixels,0,0);return canvas;
}

export function brushedCanvas(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const g=canvas.getContext('2d');
  g.fillStyle='#c4cbd0';g.fillRect(0,0,512,512);
  for(let radius=1;radius<360;radius+=.7){g.strokeStyle=`rgba(58,67,76,${.04+(Math.sin(radius*3.7)+1)*.045})`;g.lineWidth=.45;g.beginPath();g.arc(256,256,radius,0,Math.PI*2);g.stroke();}
  return canvas;
}

export function badgeCanvas(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const g=canvas.getContext('2d');
  g.fillStyle='#d8cbb4';g.font=canvasFont(64,400,'title');g.fillText('Listening Room',10,88);
  g.textAlign='right';g.font=canvasFont(20);g.fillText('SIYI YU / PERSONAL RECORD',1012,82);return canvas;
}

// Fixed surface relief, not an albedo overlay. The same scratches rotate with
// this personal record and only become visible when they cross the room lamp.
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
