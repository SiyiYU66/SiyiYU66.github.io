import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fontConfig} from '../dist/typography.js';
export async function fontAssetStatus(root=path.resolve('dist')){
  const present=async role=>{try{const file=await stat(path.join(root,fontConfig[role].file));return file.isFile()&&file.size>0;}catch{return false;}};
  return {title:await present('title'),interface:await present('interface'),label:await present('label')};
}
export async function personalFontStatus(){
  const root=path.resolve('assets/fonts/personal-preview');
  const files={title:'PPEiko-Medium.otf',interface:'PPNeueMontrealText-Book.otf',label:'PPMuseum-Regular.otf'};
  const results=await Promise.all(Object.entries(files).map(async([role,name])=>{
    try{return [role,(await stat(path.join(root,name))).size>0];}catch{return [role,false];}
  }));
  return Object.fromEntries(results);
}
