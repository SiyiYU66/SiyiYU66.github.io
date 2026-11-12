// The single font configuration for DOM text and Canvas artwork.
// Add licensed webfont files at these paths, then rebuild and publish.
export const fontConfig={
  title:{family:'PP Eiko',file:'./assets/fonts/PPEiko-Light.woff2',weight:'300',fallback:'titleFallback'},
  interface:{family:'PP Neue Montreal',file:'./assets/fonts/PPNeueMontreal-Book.woff2',weight:'375',fallback:'interfaceFallback'},
  label:{family:'PP Museum',file:'./assets/fonts/PPMuseum-Regular.woff2',weight:'400',fallback:'interfaceFallback'},
  titleFallback:{family:'Instrument Serif',file:'./vendor/fonts/instrument-serif-latin-400-normal.woff2',weight:'400'},
  interfaceFallback:{family:'Mona Sans Variable',file:'./vendor/fonts/mona-sans-latin-wght-normal.woff2',weight:'200 900'}
};
// Personal-use OTFs stay outside dist and Git; the loopback dev server alone
// exposes these for evaluation. No relabelling Medium as Light or Text as Display.
export const previewFonts={
  title:{family:'PP Eiko Medium',file:'/__preview/fonts/PPEiko-Medium.otf',weight:'500',format:'opentype'},
  interface:{family:'PP Neue Montreal Text Book',file:'/__preview/fonts/PPNeueMontrealText-Book.otf',weight:'375',format:'opentype'},
  label:{family:'PP Museum',file:'/__preview/fonts/PPMuseum-Regular.otf',weight:'400',format:'opentype'}
};
let resolved={title:fontConfig.titleFallback,interface:fontConfig.interfaceFallback,label:fontConfig.interfaceFallback};
const faceWeight=face=>face.weight.includes(' ')?'400':face.weight;
export function canvasFont(size,weight=400,role='interface'){
  if(weight===400)weight=Number(faceWeight(resolved[role]));
  return `${weight} ${size}px "${resolved[role].family}",${role==='title'?'Georgia,serif':'Arial,sans-serif'}`;
}
export async function loadTypography(){
  let status={title:false,interface:false,label:false};
  try{const response=await fetch('./font-status.json',{cache:'no-store'});if(response.ok)status={...status,...await response.json()};}catch{}
  const available=[fontConfig.titleFallback,fontConfig.interfaceFallback];
  const roles=['title','interface','label'];
  const localPreview=status.personalPreview&&['127.0.0.1','localhost','[::1]'].includes(location.hostname);
  const candidates=Object.fromEntries(roles.map(role=>[role,status[role]?fontConfig[role]:localPreview&&status.personalPreview[role]?previewFonts[role]:status.privateEvaluation?.[role]?{...previewFonts[role],file:status.privateEvaluation[role]}:fontConfig[fontConfig[role].fallback]]));
  for(const candidate of Object.values(candidates))if(!available.includes(candidate))available.push(candidate);
  const style=document.createElement('style');style.id='listening-room-fonts';
  style.textContent=available.map(f=>`@font-face{font-family:"${f.family}";src:url("${f.file}") format("${f.format||'woff2'}");font-style:normal;font-weight:${f.weight};font-display:swap}`).join('\n');
  document.head.append(style);
  await Promise.all(roles.map(async role=>{
    const candidate=candidates[role];
    const weight=faceWeight(candidate);
    try{const faces=await document.fonts.load(`${weight} 20px "${candidate.family}"`);if(faces.some(f=>f.status==='loaded'))resolved[role]=candidate;}catch{}
    await document.fonts.load(`${faceWeight(resolved[role])} 20px "${resolved[role].family}"`);
  }));
  const root=document.documentElement;
  root.style.setProperty('--serif',`"${resolved.title.family}",Georgia,serif`);
  root.style.setProperty('--sans',`"${resolved.interface.family}",Arial,sans-serif`);
  root.style.setProperty('--title-weight',resolved.title.weight);
  root.style.setProperty('--interface-weight',faceWeight(resolved.interface));
  root.style.setProperty('--label-font',`"${resolved.label.family}",Arial,sans-serif`);
  root.style.setProperty('--label-weight',faceWeight(resolved.label));
  root.dataset.titleFont=resolved.title.family;root.dataset.interfaceFont=resolved.interface.family;
  root.dataset.labelFont=resolved.label.family;
  return {...resolved};
}
