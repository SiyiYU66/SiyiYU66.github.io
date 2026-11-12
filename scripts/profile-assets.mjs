import {stat} from 'node:fs/promises';
import path from 'node:path';
import {profile} from '../dist/profile.js';
export async function profileAssetStatus(root=path.resolve('dist')){
  const present=async(relative)=>{try{const s=await stat(path.join(root,relative));return s.isFile()&&s.size>0;}catch{return false;}};
  return {photo:await present(profile.photo),cv:await present(profile.cv)};
}
