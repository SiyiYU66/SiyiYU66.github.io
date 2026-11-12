import {reports} from './report-manifest.js';
import {byteRangeResponse} from './byte-range-response.js';

// Preserve the existing parser export and PDF download response contract.
export {byteRange as reportByteRange} from './byte-range-response.js';
export async function reportDownload(request, env) {
  const report = reports[new URL(request.url).pathname];
  if (!report) return new Response('Report not found',{status:404});
  return byteRangeResponse(request,env,report,{contentType:'application/pdf',disposition:'attachment',label:'Report',rangeOnHead:true});
}
