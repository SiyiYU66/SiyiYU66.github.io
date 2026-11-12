import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {reportDownload} from '../worker/report-download.js';
import {reports} from '../worker/report-manifest.js';
import {reportPreviews} from '../dist/report-previews.js';

const origin = 'https://listening-room.test';
function assets() {
  let requests = 0;
  return {
    get requests() {return requests;},
    ASSETS: {async fetch(request) {
      requests++;
      const path = '.' + new URL(request.url).pathname;
      try {await stat(path);} catch {return new Response(null, {status: 404});}
      return new Response(Readable.toWeb(createReadStream(path, {highWaterMark: 17311})));
    }},
  };
}

for (const [url, report] of Object.entries(reports)) {
  test(`${report.filename}: full download is the unchanged original PDF`, async () => {
    const response = await reportDownload(new Request(origin + url), assets());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'application/pdf');
    assert.equal(response.headers.get('Content-Disposition'), `attachment; filename="${report.filename}"`);
    assert.equal(+response.headers.get('Content-Length'), report.size);
    const hash = createHash('sha256');
    let size = 0;
    for await (const bytes of response.body) {hash.update(bytes); size += bytes.length;}
    assert.equal(size, report.size);
    assert.equal(hash.digest('hex'), report.sha256);
    for (const part of report.parts) assert.ok(part.size < 25 * 1024 * 1024, 'Each hosted asset fits the platform limit');
  });

  test(`${report.filename}: HEAD avoids reading the report`, async () => {
    const env = assets();
    const response = await reportDownload(new Request(origin + url, {method: 'HEAD'}), env);
    assert.equal(response.status, 200);
    assert.equal(response.body, null);
    assert.equal(env.requests, 0);
    assert.equal(+response.headers.get('Content-Length'), report.size);
  });

  test(`${report.filename}: resume within or across parts, suffix and invalid ranges`, async () => {
    const boundary = report.parts[0].size;
    const first = await readFile('.' + report.parts[0].path);
    const multiPart = report.parts.length > 1;
    const start = multiPart ? boundary - 13 : Math.floor(report.size / 2);
    const end = start + 50;
    const expected = multiPart
      ? Buffer.concat([first.subarray(-13), (await readFile('.' + report.parts[1].path)).subarray(0, 38)])
      : first.subarray(start, end + 1);
    const response = await reportDownload(new Request(origin + url, {headers: {Range: `bytes=${start}-${end}`}}), assets());
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), `bytes ${start}-${end}/${report.size}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);
    const suffix = await reportDownload(new Request(origin + url, {headers: {Range: 'bytes=-19'}}), assets());
    const last = await readFile('.' + report.parts.at(-1).path);
    assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), last.subarray(-19));
    for (const range of [`bytes=${report.size}-`, 'bytes=20-5', 'bytes=-0', 'bytes=0-1,4-5', 'invalid']) {
      const invalid = await reportDownload(new Request(origin + url, {headers: {Range: range}}), assets());
      assert.equal(invalid.status, 416);
      assert.equal(invalid.headers.get('Content-Range'), `bytes */${report.size}`);
    }
  });
}

test('unknown PDFs and write methods are not served', async () => {
  const env = assets(), url = Object.keys(reports)[0];
  assert.equal((await reportDownload(new Request(origin + '/downloads/unknown.pdf'), env)).status, 404);
  assert.equal((await reportDownload(new Request(origin + url, {method: 'POST'}), env)).status, 405);
  assert.equal(env.requests, 0);
});

test('missing report assets give a recoverable response', async () => {
  const response = await reportDownload(new Request(origin + Object.keys(reports)[0]), {ASSETS: {fetch: async () => new Response(null, {status: 404})}});
  assert.equal(response.status, 503);
});

test('each preview has all pages and both image sizes', async () => {
  const pageCounts = {sedan: 16, battery: 13, sustainable: 28, fea: 18};
  for (const [key, report] of Object.entries(reportPreviews)) {
    assert.equal(report.pages.length, pageCounts[key]);
    assert.equal(reports[report.href].filename, report.filename);
    for (const [index, page] of report.pages.entries()) {
      assert.equal(page.page, index + 1);
      assert.ok((await stat('.' + page.src)).size > 0);
      assert.ok((await stat('.' + page.smallSrc)).size > 0);
    }
  }
});
