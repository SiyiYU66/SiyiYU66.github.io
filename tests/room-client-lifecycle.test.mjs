import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const code = await readFile(new URL('../assets/games/battleship/room-client.js', import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));

function harness({ignoreAbort = false} = {}) {
  let nextTimer = 0, nextId = 0;
  const timers = new Map(), calls = [], globalEvents = new Map(), documentEvents = new Map(), observers = new Set();
  const stored = new Map([['battleship_room_connection', JSON.stringify({code:'ABC123',token:'test-token',seat:0,cursor:0})]]);
  const eventAPI = map => ({
    addEventListener(type, fn) { if (!map.has(type)) map.set(type, new Set()); map.get(type).add(fn); },
    removeEventListener(type, fn) { map.get(type)?.delete(fn); }
  });
  const classes = new Set();
  const document = {
    ...eventAPI(documentEvents), hidden:false,
    body:{classList:{contains:name=>classes.has(name)},append(){}},
    querySelector(){return null;},getElementById(){return null;},
    createElement(){return {setAttribute(){}};}
  };
  const context = vm.createContext({
    console, document, location:{pathname:'/assets/games/battleship/Human_VS_Human.html'},
    AbortController, crypto:{randomUUID:()=>`00000000-0000-0000-0000-${String(++nextId).padStart(12,'0')}`},
    sessionStorage:{getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},
    ...eventAPI(globalEvents),
    setTimeout(fn, ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},
    clearTimeout(id){timers.delete(id);},
    MutationObserver:class {
      constructor(fn){this.fn=fn;}
      observe(){observers.add(this);}
      disconnect(){observers.delete(this);}
    },
    fetch(path, options) {
      return new Promise((resolve,reject)=>{
        const call = {path,options,settled:false,aborted:false,
          resolve(value={},status=200){if(call.settled)return;call.settled=true;resolve({ok:status<400,status,json:async()=>value});},
          reject(error){if(call.settled)return;call.settled=true;reject(error);}};
        calls.push(call);
        options.signal.addEventListener('abort',()=>{
          call.aborted=true;
          if(!ignoreAbort) call.reject(Object.assign(new Error('Aborted'),{name:'AbortError'}));
        });
      });
    }
  });
  context.window=context;
  vm.runInContext(code,context);
  const socket=context.createRoomConnection();
  const fire=(map,type,event={})=>{for(const fn of [...(map.get(type)||[])])fn(event);};
  const runTimer = async ms => {
    const entry=[...timers].find(([,t])=>t.ms===ms);
    assert.ok(entry,`expected a ${ms}ms timer`);
    timers.delete(entry[0]);entry[1].fn();await flush();
  };
  return {socket,calls,timers,stored,observers,document,classes,globalEvents,documentEvents,
    fire:(type,event)=>fire(globalEvents,type,event),
    visibility(hidden){document.hidden=hidden;fire(documentEvents,'visibilitychange');},
    runTimer,
    pollTimers:()=>[...timers.values()].filter(t=>t.ms===0||t.ms===450),
    async begin(){await runTimer(0);assert.equal(calls[0].path,'/api/battleship/health');calls[0].resolve({ok:true});await flush();assert.equal(calls[1].path,'/api/battleship/rooms/ABC123?after=0');return calls[1];},
    async finishPending(){for(const call of calls)if(!call.settled)call.resolve({events:[],cursor:0});await flush();}
  };
}

test('a late poll cannot paint stale state or create another timer chain after repeated page restores', async()=>{
  const h=harness({ignoreAbort:true}),received=[];
  h.socket.on('both_connected',data=>received.push(data));
  const old=await h.begin();
  h.fire('pagehide',{persisted:true});
  for(let i=0;i<20;i++)h.fire('pageshow',{persisted:true});
  assert.equal(old.aborted,true);
  assert.equal(h.calls.length,2,'resume waits for the existing poll to settle');
  old.resolve({events:[{id:1,type:'both_connected',data:'stale'}],cursor:1});await flush();
  assert.deepEqual(received,[]);
  assert.equal(h.pollTimers().length,1);
  await h.runTimer(0);
  const fresh=h.calls.at(-1);
  fresh.resolve({events:[{id:1,type:'both_connected',data:'fresh'}],cursor:1});await flush();
  assert.deepEqual(received,['fresh']);
  assert.equal(JSON.parse(h.stored.get('battleship_room_connection')).cursor,1);
  for(let cycle=0;cycle<8;cycle++){
    await h.runTimer(450);
    const pending=h.calls.at(-1),count=h.calls.length;
    h.fire('pagehide',{persisted:true});
    for(let i=0;i<5;i++)h.fire('pageshow',{persisted:true});
    assert.equal(h.calls.length,count);
    pending.resolve({events:[],cursor:1});await flush();
    assert.equal(h.pollTimers().length,1);
    await h.runTimer(0);h.calls.at(-1).resolve({events:[],cursor:1});await flush();
    assert.equal(h.pollTimers().length,1);
  }
  h.socket.disconnect();await h.finishPending();
});

test('visibility suspends requests and repeated visible events resume exactly one poll',async()=>{
  const h=harness(),disconnects=[];h.socket.on('disconnect',()=>disconnects.push(true));
  const pending=await h.begin();h.visibility(true);await flush();
  assert.equal(pending.aborted,true);assert.equal(h.pollTimers().length,0);
  for(let i=0;i<20;i++)h.visibility(false);
  assert.equal(h.pollTimers().length,1);
  await h.runTimer(0);h.calls.at(-1).resolve({events:[],cursor:0});await flush();
  assert.equal(h.pollTimers().length,1);assert.equal(disconnects.length,0,'backgrounding must not leave the opponent room');
  h.socket.disconnect();await h.finishPending();
});

test('events from a command and a concurrent poll are delivered only once; transient retries reuse their action ID',async()=>{
  const h=harness(),shots=[];h.socket.on('shot_result',value=>shots.push(value));
  const poll=await h.begin();h.socket.emit('shoot',{row:0,col:0});await flush();
  const command=h.calls.at(-1),action=JSON.parse(command.options.body);
  assert.equal(action.event,'shoot');
  command.resolve({events:[{id:1,type:'shot_result',data:'hit'}],cursor:1});await flush();
  poll.resolve({events:[{id:1,type:'shot_result',data:'hit'}],cursor:1});await flush();
  assert.deepEqual(shots,['hit']);
  h.socket.emit('shoot',{row:0,col:1});await flush();
  const first=h.calls.at(-1),firstId=JSON.parse(first.options.body).id;
  first.resolve({error:'Retry'},503);await flush();await h.runTimer(350);
  const retried=h.calls.at(-1);assert.equal(JSON.parse(retried.options.body).id,firstId);
  retried.resolve({events:[{id:2,type:'shot_result',data:'miss'}],cursor:2});await flush();
  assert.deepEqual(shots,['hit','miss']);h.socket.disconnect();await h.finishPending();
});

test('a hidden page releases its presentation observer and catches up without applying the cancelled event',async()=>{
  const h=harness(),shots=[];h.socket.on('shot_result',value=>shots.push(value));
  const poll=await h.begin();h.classes.add('board-locked');
  poll.resolve({events:[{id:1,type:'shot_result',data:'hit'}],cursor:1});await flush();
  assert.equal(h.observers.size,1);
  h.visibility(true);await flush();assert.equal(h.observers.size,0);assert.deepEqual(shots,[]);
  h.classes.delete('board-locked');h.visibility(false);await h.runTimer(0);
  h.calls.at(-1).resolve({events:[{id:1,type:'shot_result',data:'hit'}],cursor:1});await flush();
  assert.deepEqual(shots,['hit']);h.socket.disconnect();await h.finishPending();
});

test('explicit disconnect aborts outstanding work, leaves once, and cannot restart on page or visibility events',async()=>{
  const h=harness(),events=[];h.socket.on('disconnect',()=>events.push('disconnect'));
  const poll=await h.begin();h.socket.disconnect();h.socket.disconnect();await flush();
  assert.equal(poll.aborted,true);
  const leave=h.calls.filter(c=>c.options.keepalive);assert.equal(leave.length,1);
  assert.equal(JSON.parse(leave[0].options.body).event,'leave_room');
  leave[0].resolve({events:[],cursor:0});await flush();
  for(let i=0;i<10;i++){h.fire('pageshow',{persisted:true});h.visibility(false);}
  h.socket.emit('shoot',{row:0,col:0});await flush();
  assert.equal(h.calls.length,3);assert.equal(h.pollTimers().length,0);assert.equal(h.timers.size,0);
  assert.deepEqual(events,['disconnect']);assert.equal(h.globalEvents.get('pageshow').size,0);
  assert.equal(h.documentEvents.get('visibilitychange').size,0);
});

test('interrupted commands unlock pending UI and old queued gestures cannot execute after a restore',async()=>{
  const h=harness({ignoreAbort:true}),errors=[],shots=[];
  h.socket.on('command_error',value=>errors.push(value));h.socket.on('shot_result',value=>shots.push(value));
  const poll=await h.begin();
  h.socket.emit('shoot',{row:0,col:0});await flush();
  const command=h.calls.at(-1);
  h.socket.emit('shoot',{row:0,col:1});
  h.visibility(true);h.visibility(false);
  command.resolve({events:[{id:1,type:'shot_result',data:'old response'}],cursor:1});
  poll.resolve({events:[],cursor:0});await flush();
  assert.equal(h.calls.filter(c=>c.options.method==='POST').length,1,'the queued pre-hide action must not run in the new lifecycle epoch');
  assert.equal(errors.length,2);assert.ok(errors.every(e=>e.interrupted));assert.deepEqual(shots,[]);
  await h.runTimer(0);
  h.calls.at(-1).resolve({events:[{id:1,type:'shot_result',data:'server catch-up'}],cursor:1});await flush();
  assert.deepEqual(shots,['server catch-up']);
  h.socket.disconnect();await h.finishPending();
});
