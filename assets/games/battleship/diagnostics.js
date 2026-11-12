// Local only. No telemetry is transmitted; no room codes, names or tokens recorded.
const KEY = 'battleship-local-diagnostics-v1';
export function createDiagnostics(storage, now = () => Date.now()) {
  let prior = null;
  try { prior = JSON.parse(storage.getItem(KEY)); } catch {}
  const state = {version:1,startedAt:now(),lifecycle:'active',events:[],previous:prior ? {
    startedAt:prior.startedAt,lifecycle:prior.lifecycle,screen:prior.screen,
    lastEvent:prior.events?.at(-1),events:prior.events?.slice(-12),
    // An interrupted tab can have several causes; this is not a crash verdict.
    missingPageHide:prior.lifecycle === 'active'
  } : null};
  function record(type, fields = {}) {
    const event = {at:now(),type:String(type).slice(0,64)};
    // Explicit allowlist prevents accidental capture of game/session data.
    for (const key of ['screen','phase','message','width','height','dpr','imageMiB','reason']) {
      if (fields[key] != null) event[key] = typeof fields[key] === 'number' ? fields[key] : String(fields[key]).slice(0,240);
    }
    if (event.screen) state.screen = event.screen;
    if (type === 'hidden' || type === 'pagehide' || type === 'leaving') state.lifecycle = type;
    if (type === 'visible' || type === 'boot') state.lifecycle = 'active';
    state.events.push(event); state.events = state.events.slice(-30);
    try { storage.setItem(KEY,JSON.stringify(state)); } catch {}
  }
  record('boot');
  return {record,report:()=>JSON.stringify(state,null,2)};
}
