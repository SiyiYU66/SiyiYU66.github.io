import {roomApi} from './room-api.js';
import {reportDownload} from './report-download.js';
import {isProjectVideo,projectVideo} from './project-video.js';

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/battleship/'))return roomApi(request,env);
    if(url.pathname.startsWith('/downloads/'))return reportDownload(request,env);
    if(isProjectVideo(url.pathname))return projectVideo(request,env);
    return env.ASSETS.fetch(request);
  }
};
