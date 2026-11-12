// ASSETS may ignore Range; discard the prefix incrementally and cancel at end.
export function byteRange(header, size) {
  if (!header) return {start:0, end:size - 1, partial:false};
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) {
    const length = Number(match[2]);
    if (!Number.isSafeInteger(length) || length <= 0) return null;
    start = Math.max(0, size - length); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return null;
    end = Math.min(end, size - 1);
  }
  return {start, end, partial:true};
}

function segmentsFor(resource, range) {
  let offset = 0;
  return resource.parts.flatMap(part => {
    const start = offset; offset += part.size;
    if (offset <= range.start || start > range.end) return [];
    return [{...part, skip:Math.max(0, range.start - start), length:Math.min(offset - 1, range.end) - Math.max(start, range.start) + 1}];
  });
}

export async function byteRangeResponse(request, env, resource, {contentType, disposition, label = 'Asset', rangeOnHead = true}) {
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const url = new URL(request.url), etag = `"${resource.sha256}"`;
  const rangeHeader = request.method === 'HEAD' && !rangeOnHead ? null : request.headers.get('Range');
  const ifRange = request.headers.get('If-Range');
  // Only a matching strong hash establishes equality. Unsupported date/weak
  // validators conservatively receive the complete representation.
  const range = byteRange(ifRange && ifRange !== etag ? null : rangeHeader,resource.size);
  if (!range) return new Response(null,{status:416,headers:{'Content-Range':`bytes */${resource.size}`,'Accept-Ranges':'bytes'}});
  const headers = new Headers({
    'Content-Type':contentType,'Content-Disposition':`${disposition}; filename="${resource.filename}"`,
    'Content-Length':String(range.end - range.start + 1),'Accept-Ranges':'bytes',
    'Cache-Control':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff',ETag:etag,
  });
  if (range.partial) headers.set('Content-Range',`bytes ${range.start}-${range.end}/${resource.size}`);
  const status = range.partial ? 206 : 200;
  if (request.method === 'HEAD') return new Response(null,{status,headers});

  const segments = segmentsFor(resource,range);
  let next = 0, current = null, opening = null, cancelled = false;
  async function openNext() {
    const segment = segments[next++];
    if (!segment || cancelled) return false;
    const abort = new AbortController(); opening = abort;
    try {
      const response = await env.ASSETS.fetch(new Request(new URL(segment.path,url.origin),{signal:abort.signal}));
      if (!response.ok || !response.body) throw new Error(`${label} asset unavailable`);
      if (cancelled) {await response.body.cancel(); return false;}
      current = {reader:response.body.getReader(),skip:segment.skip,remaining:segment.length};
      return true;
    } finally {if (opening === abort) opening = null;}
  }
  try {await openNext();} catch {return new Response(`${label} temporarily unavailable`,{status:503});}
  const body = new ReadableStream({
    async pull(controller) {
      try {
        while (!cancelled) {
          if (!current && !await openNext()) {controller.close(); return;}
          const segment = current, chunk = await segment.reader.read();
          if (cancelled) return;
          if (chunk.done) {current = null; if (segment.remaining) throw new Error(`Incomplete ${label.toLowerCase()} asset`); continue;}
          if (segment.skip >= chunk.value.byteLength) {segment.skip -= chunk.value.byteLength; continue;}
          const start = segment.skip, count = Math.min(segment.remaining,chunk.value.byteLength - start);
          segment.skip = 0; segment.remaining -= count;
          if (!segment.remaining) {current = null; await segment.reader.cancel();}
          controller.enqueue(chunk.value.subarray(start,start + count)); return;
        }
      } catch (error) {const segment=current;current=null;await segment?.reader.cancel().catch(()=>{});if(!cancelled)controller.error(error);}
    },
    async cancel() {cancelled=true;opening?.abort();const segment=current;current=null;await segment?.reader.cancel();},
  });
  return new Response(body,{status,headers});
}
