import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Only this existing movie is routed specially. Recompute on every build.
const movies = {'/media/balancing-segway.mp4':'/assets/projects/balancing-segway/balancing.mp4'};
export async function prepareVideoManifest(root = process.cwd()) {
  const manifest = {};
  for (const [url,asset] of Object.entries(movies)) {
    const source = path.join(root,asset.slice(1)), before = await stat(source);
    if (!before.size) throw new Error(`Project video is empty: ${asset}`);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(source)) hash.update(chunk);
    const after = await stat(source);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error(`Project video changed while preparing metadata: ${asset}`);
    manifest[url] = {filename:path.basename(asset),size:after.size,sha256:hash.digest('hex'),parts:[{path:asset,size:after.size}]};
  }
  await writeFile(path.join(root,'worker/video-manifest.js'),'// Generated from source MP4 bytes by scripts/prepare-video-manifest.mjs.\nexport const projectVideos = '+JSON.stringify(manifest,null,2)+';\n');
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await prepareVideoManifest();
