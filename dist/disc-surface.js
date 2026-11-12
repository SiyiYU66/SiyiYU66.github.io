import {TextureLoader,Vector2} from './vendor/three.module.js';

// Shared approved UROP parameters; each project owns its precomputed wear maps.
export const discSurfaceConfig={
  // Default anchor for the optional local comparison controls, not a scope limit.
  projectId:'between-spaces',
  basePath:'./assets/disc-surfaces/',
  normalStrength:.23,coatNormalStrength:.22,
  roughness:.37,metalness:.3,clearcoat:.8,clearcoatRoughness:.17,
  envMapIntensity:.8
};
export function discSurfaceUrls(projectId){
  const path=discSurfaceConfig.basePath+encodeURIComponent(projectId)+'/';
  return ['normal.png','roughness.png','coat-roughness.png'].map(name=>path+name);
}
export async function loadDiscSurface(projectId=discSurfaceConfig.projectId){
  const loader=new TextureLoader();
  const [normal,roughness,coatRoughness]=await Promise.all(discSurfaceUrls(projectId).map(url=>loader.loadAsync(url)));
  // Data maps remain in linear/no-color space; only the unmodified cover is sRGB.
  for(const map of [normal,roughness,coatRoughness])map.anisotropy=8;
  return {projectId,normal,roughness,coatRoughness,dispose(){[normal,roughness,coatRoughness].forEach(map=>map.dispose());}};
}
export function applyDiscSurface(original,maps){
  const c=discSurfaceConfig,material=original.clone();
  Object.assign(material,{
    normalMap:maps.normal,normalScale:new Vector2(c.normalStrength,c.normalStrength),
    roughnessMap:maps.roughness,roughness:c.roughness,metalness:c.metalness,
    clearcoat:c.clearcoat,clearcoatRoughness:c.clearcoatRoughness,
    clearcoatRoughnessMap:maps.coatRoughness,clearcoatNormalMap:maps.normal,
    clearcoatNormalScale:new Vector2(c.coatNormalStrength,c.coatNormalStrength),
    envMapIntensity:c.envMapIntensity
  });
  return material;
}
