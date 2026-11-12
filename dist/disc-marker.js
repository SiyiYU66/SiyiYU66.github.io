// The gallery scribble and the footer's tapered stroke share disc projection.
export function createDiscMarker({random=Math.random,startAngle=null}={}){
  const count=30,turn=Math.PI*2;let strokes=[];
  function reseed(){
    strokes=Array.from({length:2},(_,i)=>({
      start:startAngle===null?random()*turn:startAngle+i*.12,
      radius:1.08+i*.05+random()*.02,end:1.04+random()*.14,
      points:Array.from({length:count+1},()=>1+(random()-.5)*.06)
    }));
  }
  function draw(context,{strength,projectPoint,color='#cbc7bd'}){
    if(strength<=.001)return;
    context.strokeStyle=typeof document!=='undefined'&&document.documentElement.dataset.theme==='light'?'#252525':color;context.lineWidth=2.2;context.lineCap='round';context.lineJoin='round';
    strokes.forEach((stroke,i)=>{
      const portion=Math.min(1,Math.max(0,strength*2-i*.6));if(portion<=0)return;
      const n=Math.max(2,Math.round(count*stroke.end*portion)),points=[];
      for(let k=0;k<=n;k++)points.push(projectPoint(stroke.start+k/count*turn,stroke.radius*stroke.points[k%stroke.points.length]));
      context.beginPath();context.moveTo(...points[0]);
      for(let k=1;k<points.length-1;k++)context.quadraticCurveTo(...points[k],(points[k][0]+points[k+1][0])/2,(points[k][1]+points[k+1][1])/2);
      context.lineTo(...points.at(-1));context.stroke();
    });
  }
  function drawGauge(context, {progress, projectPoint, lineWidth = 6, color = '#e2d9ca'}) {
    if (progress <= .004) return;
    const extent = Math.min(1, progress) ** 1.18;
    const segments = Math.max(3, Math.ceil(60 * extent));
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments * extent;
      const angle = (154 - 126 * t) * Math.PI / 180;
      const wobble = .011 * Math.sin(18 * t + .4) + .007 * Math.sin(39 * t + 1.1);
      points.push(projectPoint(angle, 1.081 + wobble));
    }

    // A single tapered brush outline follows the exposed rim. Reusing the
    // same curve for every charge lets the tip retract along its own path.
    const upper = [], lower = [];
    for (let i = 0; i < points.length; i++) {
      const [x, y] = points[i];
      const [ax, ay] = points[Math.max(0, i - 1)];
      const [bx, by] = points[Math.min(segments, i + 1)];
      const length = Math.hypot(bx - ax, by - ay) || 1;
      const t = i / segments;
      const taper = Math.min(1, t * 3.2, (1 - t) * 3.6) ** .8;
      const halfWidth = lineWidth * .5 * taper * (.60 + .40 * Math.sqrt(extent));
      const nx = (ay - by) / length * halfWidth, ny = (bx - ax) / length * halfWidth;
      upper.push([x + nx, y + ny]);
      lower.push([x - nx, y - ny]);
    }
    context.fillStyle = typeof document!=='undefined'&&document.documentElement.dataset.theme==='light'?'#252525':color;
    context.beginPath();
    context.moveTo(...upper[0]);
    for (const point of upper.slice(1)) context.lineTo(...point);
    for (const point of lower.reverse()) context.lineTo(...point);
    context.closePath();
    context.fill();
  }
  reseed();return {reseed,draw,drawGauge};
}
