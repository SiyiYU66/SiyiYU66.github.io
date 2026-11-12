// Opening-only picture disc. Replace this source image in assets/opening, then
// run npm run build. The Projects and About Me artwork remain independent.
export const openingArt={
  image:'./assets/opening/siyi-yu-sketch.png',
  radius:.86,
  crop:{zoom:1,positionX:.5,positionY:.5}
};

let artwork;
export function loadOpeningArt(){
  return artwork??=(async()=>{
    const image=new Image();image.src=openingArt.image;
    try{await image.decode();return openingRecordCanvas(image);}
    catch(error){console.warn('Opening portrait unavailable; using a black record.',error);return openingRecordCanvas();}
  })();
}

function openingRecordCanvas(image){
  const size=1024,half=size/2,canvas=document.createElement('canvas');
  canvas.width=canvas.height=size;const c=canvas.getContext('2d');
  c.fillStyle='#141414';c.fillRect(0,0,size,size);
  if(image){
    const radius=half*openingArt.radius,diameter=radius*2;
    const {zoom,positionX,positionY}=openingArt.crop;
    const scale=Math.max(diameter/image.naturalWidth,diameter/image.naturalHeight)*zoom;
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    c.save();c.beginPath();c.arc(half,half,radius,0,Math.PI*2);c.clip();
    c.drawImage(image,half-radius+(diameter-w)*positionX,half-radius+(diameter-h)*positionY,w,h);
    c.restore();
  }
  // Leave a real black groove rim around the portrait; surface normals and
  // reflections belong to the same rotating mesh as this printed artwork.
  for(let r=image?half*openingArt.radius+3:116;r<511;r+=2.4){
    c.beginPath();c.arc(half,half,r,0,Math.PI*2);
    c.strokeStyle=`rgba(210,216,223,${.07+.055*Math.sin(r*1.3)})`;c.lineWidth=.7;c.stroke();
  }
  return canvas;
}
