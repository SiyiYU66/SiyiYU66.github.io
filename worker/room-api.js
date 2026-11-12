import {RoomError,newRoom,validCode,authenticate,joinRoom,command,eventsFor} from './room-state.js';
import {pagesOrigin} from './hosting-config.js';

const TTL=4*60*60*1000;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const newToken=()=>crypto.randomUUID()+crypto.randomUUID();
const makeCode=()=>{const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...crypto.getRandomValues(new Uint8Array(6))].map(n=>chars[n%chars.length]).join('');};
export class D1RoomStore {
  constructor(db){this.db=db;}
  async get(code){const row=await this.db.prepare('SELECT revision, state, expires_at FROM battleship_rooms WHERE code = ?').bind(code).first();return row?{revision:row.revision,room:JSON.parse(row.state),expires:row.expires_at}:null;}
  async create(room){await this.db.prepare('INSERT INTO battleship_rooms (code, revision, state, expires_at) VALUES (?, 0, ?, ?)').bind(room.code,JSON.stringify(room),Date.now()+TTL).run();}
  async save(code,revision,room){const result=await this.db.prepare('UPDATE battleship_rooms SET revision = revision + 1, state = ?, expires_at = ? WHERE code = ? AND revision = ?').bind(JSON.stringify(room),Date.now()+TTL,code,revision).run();return result.meta.changes===1;}
  async cleanup(){await this.db.prepare('DELETE FROM battleship_rooms WHERE code IN (SELECT code FROM battleship_rooms WHERE expires_at < ? LIMIT 100)').bind(Date.now()).run();}
}
const bodyOf=async req=>{
  const text=await req.text();if(text.length>16384)throw new RoomError('Request is too large.',413);
  try{const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();return data;}catch{throw new RoomError('Invalid request.');}
};
export async function roomApi(request, env) {
  const origin=request.headers.get('Origin'), ownOrigin=new URL(request.url).origin;
  if(origin&&origin!==ownOrigin&&origin!==pagesOrigin)return json({error:'This request must come from the game.'},403);
  const crossOrigin=origin===pagesOrigin&&origin!==ownOrigin;
  const withCors=response=>{
    if(crossOrigin){response.headers.set('Access-Control-Allow-Origin',pagesOrigin);response.headers.append('Vary','Origin');}
    return response;
  };
  if(request.method==='OPTIONS') {
    const method=request.headers.get('Access-Control-Request-Method');
    const headers=(request.headers.get('Access-Control-Request-Headers')||'').toLowerCase().split(',').map(h=>h.trim()).filter(Boolean);
    if(!origin||!['GET','POST'].includes(method)||headers.some(h=>!['authorization','content-type'].includes(h)))return json({error:'This preflight is not supported.'},403);
    return withCors(new Response(null,{status:204,headers:{'Access-Control-Allow-Methods':'GET, POST','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600','Cache-Control':'no-store'}}));
  }
  return withCors(await handleRoomApi(request,env));
}
async function handleRoomApi(request, env) {
  try {
    const url=new URL(request.url);
    if(!env.DB)throw new RoomError('The room service is starting. Please try again shortly.',503);
    const store=new D1RoomStore(env.DB),path=url.pathname.replace(/\/$/,'');
    if(path==='/api/battleship/health'&&request.method==='GET') {
      await env.DB.prepare('SELECT code FROM battleship_rooms LIMIT 1').first();return json({ok:true,transport:'https-rooms'});
    }
    if(path==='/api/battleship/rooms'&&request.method==='POST') {
      const data=await bodyOf(request);if(!/^[a-zA-Z0-9-]{16,80}$/.test(data.clientId||''))throw new RoomError('Invalid client session.');
      await store.cleanup();
      for(let i=0;i<4;i++) {
        const token=newToken(),room=newRoom(makeCode(),token,data.clientId);
        try{await store.create(room);return json({code:room.code,token,seat:0,cursor:0,events:[]},201);}catch(e){if(!/UNIQUE/.test(e.message))throw e;}
      }
      throw new RoomError('Please try creating a room again.',503);
    }
    const match=path.match(/^\/api\/battleship\/rooms\/([^/]+)(?:\/(join|commands))?$/);
    if(!match||!validCode(match[1]))throw new RoomError('Room not found.',404);
    const [,code,route]=match,token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
    const after=Number(url.searchParams.get('after')||0);
    if(!Number.isSafeInteger(after)||after<0)throw new RoomError('Invalid event cursor.');
    const data=request.method==='POST'?await bodyOf(request):null;
    for(let attempt=0;attempt<8;attempt++) {
      const stored=await store.get(code);
      if(!stored||stored.expires<Date.now())throw new RoomError('Room not found or expired. Please create a new room.',404);
      const room=stored.room;
      if(route==='join'&&request.method==='POST') {
        if(!/^[a-zA-Z0-9-]{16,80}$/.test(data.clientId||''))throw new RoomError('Invalid client session.');
        const guestToken=joinRoom(room,newToken(),data.clientId);
        if(await store.save(code,stored.revision,room))return json({code,token:guestToken,seat:1,cursor:room.sequence,events:eventsFor(room,1,0)});
        continue;
      }
      const seat=authenticate(room,token);
      if(!route&&request.method==='GET')return json({events:eventsFor(room,seat,after),cursor:room.sequence,phase:room.phase});
      if(route==='commands'&&request.method==='POST') {
        if(!/^[a-zA-Z0-9-]{16,80}$/.test(data.id||''))throw new RoomError('Invalid action identifier.');
        const before=room.sequence,changed=command(room,seat,data.event,data.data,data.id);
        const resumed=data.event==='rejoin_room'&&(room.phase==='battle'||room.phase==='finished');
        const from=resumed?(changed?before:(room.events.findLast(e=>e.type==='rejoined'&&e.seat===seat)?.id||1)-1):after;
        if(!changed||await store.save(code,stored.revision,room))return json({events:eventsFor(room,seat,from),cursor:room.sequence});
        continue;
      }
      throw new RoomError('This method is not supported.',405);
    }
    throw new RoomError('The room is busy. Please try again.',409);
  } catch(error) {
    if(error instanceof RoomError)return json({error:error.message},error.status);
    console.error('Battleship room service:',error.message);return json({error:'The room service could not respond. Please try again.'},503);
  }
}
