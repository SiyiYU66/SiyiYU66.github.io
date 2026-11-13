import fs from 'node:fs/promises';
import sharp from 'sharp';
const root = 'assets/projects/ichack/';
// SVGs are monochrome outlined artwork. Preserve paths and mask contents;
// remove the OS media-query dependency so the same dark mat always reads.
for (const [source, target] of [['problem-themed.svg','problem-dark.svg'],['fonts-v2-themed.svg','fonts-v2-dark.svg']]) {
  let svg=await fs.readFile(root+source,'utf8');
  svg=svg.replace(/<style>[\s\S]*?<\/style>/, '<style>[fill="black"]:not(mask):not(mask *){fill:white}[stroke="black"]:not(mask):not(mask *){stroke:white}</style>');
  await fs.writeFile(root+target,svg);
}
// Refine the cutout against the original artwork so sponsor marks and fine
// lettering keep their source pixels instead of being redrawn by the edit.
const {data,info}=await sharp(root+'tshirtgraphics-1600.avif').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const {width,height}=info, count=width*height, removed=new Uint8Array(count), queue=new Int32Array(count);
let split=0;
while(split<width&&data[split*4]<128)split++;
function flood(left,right,white){
  let head=0,tail=0;
  const background=i=>{const p=i*4,r=data[p],g=data[p+1],b=data[p+2];return Math.max(r,g,b)-Math.min(r,g,b)<10&&(white?Math.min(r,g,b)>242:Math.max(r,g,b)<13);};
  const push=(x,y)=>{const i=y*width+x;if(!removed[i]&&background(i)){removed[i]=1;queue[tail++]=i;}};
  for(let x=left;x<right;x++){push(x,0);push(x,height-1);}
  for(let y=0;y<height;y++){push(left,y);push(right-1,y);}
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x>left)push(x-1,y);if(x<right-1)push(x+1,y);if(y>0)push(x,y-1);if(y<height-1)push(x,y+1);}
}
flood(0,split,false);flood(split,width,true);
let cleared=0, neutralLabels=0;
for(let i=0;i<count;i++){
  const p=i*4,x=i%width,y=Math.floor(i/width);
  if(removed[i]||x===split-1){data[p]=data[p+1]=data[p+2]=data[p+3]=0;cleared++;continue;}
  // Only the standalone role headings and bottom wordmarks change ink.
  // White sponsor marks inside the coloured mountains remain untouched.
  if(y<140||y>945){
    const r=data[p],g=data[p+1],b=data[p+2],lum=(r+g+b)/3;
    if(Math.max(r,g,b)-Math.min(r,g,b)<14){
      const alpha=x<split?lum/255:(255-lum)/255;
      data[p]=data[p+1]=data[p+2]=126;data[p+3]=Math.round(255*alpha);neutralLabels++;
    }
  }
}
const output=root+'tshirtgraphics-transparent.webp';
await sharp(data,{raw:{width,height,channels:4}}).webp({quality:92,alphaQuality:100,effort:6}).toFile(output);
console.log(JSON.stringify({width,height,split,cleared,neutralLabels,bytes:(await fs.stat(output)).size}));




