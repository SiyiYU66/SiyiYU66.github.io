import test from 'node:test';
import assert from 'node:assert/strict';
import {sqliteD1} from '../scripts/sqlite-d1.mjs';
import {roomApi} from '../worker/room-api.js';
import {pagesOrigin,roomServiceOrigin} from '../worker/hosting-config.js';

async function setup(){
  const env={DB:sqliteD1()},origin='https://game.example';
  const api=async(path,body,token,method=body?'POST':'GET')=>{
    const res=await roomApi(new Request(origin+'/api/battleship'+path,{method,headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
    return{status:res.status,...await res.json()};
  };
  const host=await api('/rooms',{clientId:crypto.randomUUID()});
  const guest=await api('/rooms/'+host.code+'/join',{clientId:crypto.randomUUID()});
  const send=(seat,event,data,id=crypto.randomUUID())=>api('/rooms/'+host.code+'/commands',{id,event,data},seat===0?host.token:guest.token);
  return{env,api,host,guest,send};
}
async function deploy(game){
  for(const seat of [0,1])await game.send(seat,'player_name',seat?'Guest':'Host');
  for(const seat of [0,1]){
    for(const [shipName,row] of [['cruiser',0],['submarine',2],['destroyer',4],['carrier',6],['battleship',8]]){
      const r=await game.send(seat,'place_ship',{shipName,col:0,row,orientation:'horizontal'});assert.equal(r.status,200,r.error);
    }
    assert.equal((await game.send(seat,'placement_done')).status,200);
  }
}

test('the configured Pages origin can preflight and create rooms; arbitrary origins and headers are rejected',async()=>{
  const env={DB:sqliteD1()},url=roomServiceOrigin+'/api/battleship/rooms';
  const preflight=origin=>roomApi(new Request(url,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization, content-type'}}),env);
  const accepted=await preflight(pagesOrigin);
  assert.equal(accepted.status,204);assert.equal(accepted.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
  assert.equal(accepted.headers.get('Access-Control-Allow-Credentials'),null);
  const rejected=await preflight('https://unrelated.example');
  assert.equal(rejected.status,403);assert.equal(rejected.headers.get('Access-Control-Allow-Origin'),null);
  const invalidHeader=await roomApi(new Request(url,{method:'OPTIONS',headers:{Origin:pagesOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-unexpected'}}),env);
  assert.equal(invalidHeader.status,403);
  const created=await roomApi(new Request(url,{method:'POST',headers:{Origin:pagesOrigin,'Content-Type':'application/json'},body:JSON.stringify({clientId:crypto.randomUUID()})}),env);
  assert.equal(created.status,201);assert.equal(created.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
  const room=await created.json();
  const unauthorized=await roomApi(new Request(url+'/'+room.code,{headers:{Origin:pagesOrigin}}),env);
  assert.equal(unauthorized.status,401);assert.equal(unauthorized.headers.get('Access-Control-Allow-Origin'),pagesOrigin);
});
test('two independent HTTPS clients create and join a persistent room, name themselves and deploy',async()=>{
  const game=await setup();assert.equal(game.host.status,201);assert.equal(game.guest.status,200);assert.notEqual(game.host.token,game.guest.token);
  assert.ok(game.guest.events.some(e=>e.type==='both_connected'));
  await deploy(game);
  const a=await game.api('/rooms/'+game.host.code,null,game.host.token),b=await game.api('/rooms/'+game.host.code,null,game.guest.token);
  assert.equal(a.phase,'battle');assert.deepEqual(a.events,b.events);
  const boards=a.events.find(e=>e.type==='battle_ready').data.boards;
  assert.deepEqual(boards.map(board=>board.flat().filter(c=>c.ship).length),[17,17]);
});
test('seat tokens protect private room events and cannot be replaced by a requested seat number',async()=>{
  const game=await setup();assert.equal((await game.api('/rooms/'+game.host.code)).status,401);
  assert.equal((await game.api('/rooms/'+game.host.code,null,'wrong-token')).status,401);
  const r=await game.send(1,'rejoin_room',{room:game.host.code,seat:0});
  assert.equal(r.events.find(e=>e.type==='rejoined').data.seat,1);
  assert.equal((await game.api('/rooms/'+game.host.code+'/join',{clientId:crypto.randomUUID()})).status,409);
});
test('incomplete deployment, invalid coordinates and out-of-turn actions cannot advance a battle',async()=>{
  const game=await setup();await game.send(0,'player_name','Host');await game.send(1,'player_name','Guest');
  assert.equal((await game.send(0,'placement_done')).status,400);
  await deploy(game);
  assert.equal((await game.send(1,'shoot',{col:0,row:0})).status,409);
  assert.equal((await game.send(0,'shoot',{col:0.5,row:0})).status,400);
  assert.equal((await game.send(0,'shoot',{col:20,row:0})).status,400);
});
test('fire and return fire are authoritative; a retried action ID does not fire twice',async()=>{
  const game=await setup();await deploy(game);
  const id=crypto.randomUUID(),first=await game.send(0,'shoot',{col:0,row:0},id);
  assert.equal(first.status,200);assert.equal(first.events.at(-1).data.hit,true);
  await game.send(0,'shoot',{col:0,row:0},id);
  const second=await game.send(1,'shoot',{col:9,row:9});assert.equal(second.events.at(-1).data.hit,false);
  const polled=await game.api('/rooms/'+game.host.code,null,game.host.token);
  assert.equal(polled.events.filter(e=>e.type==='shot_result').length,2);
  assert.equal(polled.events.at(-1).data.next_turn,2);
});
test('simultaneous actions use compare-and-swap and cannot consume the same turn',async()=>{
  const game=await setup();await deploy(game);
  const results=await Promise.all([game.send(0,'shoot',{col:8,row:9}),game.send(0,'shoot',{col:9,row:9})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
});
test('sonar and Ghost Move remain available and synchronize both clients',async()=>{
  const game=await setup();await deploy(game);
  assert.equal((await game.send(0,'sonar',{col:0,row:0})).events.at(-1).type,'sonar_result');
  const move=await game.send(1,'ghost_relocate',{ship_name:'destroyer',anchor_col:6,anchor_row:4,orientation:'horizontal'});
  assert.equal(move.status,200);assert.equal(move.events.at(-1).type,'ghost_relocate_result');assert.deepEqual(move.events.at(-1).data.ghost_moves_left,[1,0]);
});
test('leaving notifies the opponent and expired room codes stop working',async()=>{
  const game=await setup();await game.send(0,'leave_room');
  const guest=await game.api('/rooms/'+game.host.code,null,game.guest.token);assert.equal(guest.events.at(-1).type,'opponent_left');
  game.env.DB.sqlite.prepare('UPDATE battleship_rooms SET expires_at = 0 WHERE code = ?').run(game.host.code);
  assert.equal((await game.api('/rooms/'+game.host.code,null,game.guest.token)).status,404);
});
test('a rejoining seat receives a current snapshot instead of replaying old shots before combat listeners exist',async()=>{
  const game=await setup();await deploy(game);await game.send(0,'shoot',{col:0,row:0});
  const id=crypto.randomUUID();
  const rejoin=await game.send(1,'rejoin_room',{room:game.host.code,seat:0},id);
  assert.ok(!rejoin.events.some(e=>e.type==='shot_result'));
  const snapshot=rejoin.events.find(e=>e.type==='battle_ready').data;
  assert.equal(snapshot.turn,1);assert.equal(snapshot.boards[1][0][0].shot,true);
  assert.deepEqual(snapshot.hits,[1,0]);assert.deepEqual(snapshot.sonar,[2,2]);
  const retried=await game.send(1,'rejoin_room',{room:game.host.code,seat:0},id);
  assert.deepEqual(retried.events,rejoin.events);
});
