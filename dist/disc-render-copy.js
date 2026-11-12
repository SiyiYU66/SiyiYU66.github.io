import * as THREE from './vendor/three.module.js';

// Raycast ownership in the gallery contains circular references. Copy render
// nodes, not userData; geometry, printed textures and wear maps stay shared.
export function copyDiscRenderTree(source){
  const node=source.isMesh?new THREE.Mesh(source.geometry,source.material):new THREE.Group();
  node.position.copy(source.position);node.quaternion.copy(source.quaternion);node.scale.copy(source.scale);
  node.visible=source.visible;node.renderOrder=source.renderOrder;
  source.children.forEach(child=>node.add(copyDiscRenderTree(child)));
  return node;
}
