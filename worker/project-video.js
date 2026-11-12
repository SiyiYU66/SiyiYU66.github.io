import {projectVideos} from './video-manifest.js';
import {byteRangeResponse} from './byte-range-response.js';

export const isProjectVideo = pathname => Object.hasOwn(projectVideos,pathname);
export async function projectVideo(request, env) {
  const video = projectVideos[new URL(request.url).pathname];
  if (!video) return new Response('Video not found',{status:404});
  return byteRangeResponse(request,env,video,{contentType:'video/mp4',disposition:'inline',label:'Video',rangeOnHead:false});
}
