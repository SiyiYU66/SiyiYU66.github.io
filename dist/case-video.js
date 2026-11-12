// Native, inline playback: no iframe, automatic downloads or duplicated videos
// inside the looping image reels. Leaving the chapter/page always pauses it.
export function mountCaseVideos(videos,{Observer=globalThis.IntersectionObserver,visibilityTarget=globalThis.document}={}){
  if(!videos.length)return ()=>{};
  const pauseAll=()=>videos.forEach(video=>video.pause());
  const onVisibility=()=>{if(visibilityTarget.hidden)pauseAll();};
  const observer=Observer?new Observer(entries=>{
    for(const entry of entries)if(!entry.isIntersecting)entry.target.pause();
  },{threshold:0}):null;
  videos.forEach(video=>observer?.observe(video));
  visibilityTarget.addEventListener('visibilitychange',onVisibility);
  let disposed=false;
  return ()=>{if(disposed)return;disposed=true;observer?.disconnect();visibilityTarget.removeEventListener('visibilitychange',onVisibility);pauseAll();};
}
