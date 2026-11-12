import Battleship from '../assets/games/battleship/BattleShip.js';

export class RoomError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const assert = (value, message, status) => { if (!value) throw new RoomError(message, status); };
export const validCode = code => /^[A-HJ-NP-Z2-9]{6}$/.test(code);
export function newRoom(code, token, clientId, now = Date.now()) {
  return {code, players:[{token,clientId,name:null},null], ready:[false,false], phase:'lobby', turn:0,
    boards:[Battleship.empty_board(),Battleship.empty_board()], sonar:[2,2], ghost:[1,1],
    events:[], sequence:0, receipts:[], createdAt:now};
}
export function addEvent(room, type, data, seat = null) {
  room.events.push({id:++room.sequence,type,data,seat});
  // A full match is at most 200 shots plus deployment and special moves.
  room.events = room.events.slice(-512);
}
export const eventsFor = (room,seat,after) => room.events.filter(e=>e.id>after&&(e.seat===null||e.seat===seat)).map(({id,type,data})=>({id,type,data}));
export function authenticate(room, token) {
  const seat=room.players.findIndex(p=>p&&p.token===token);
  assert(seat!==-1,'This room session is not valid. Please return to the lobby.',401);
  return seat;
}
export function joinRoom(room, token, clientId) {
  assert(room.phase==='lobby','This battle has already started.',409);
  if(room.players[1]?.clientId===clientId) return room.players[1].token;
  assert(!room.players[1],'Room is full.',409);
  room.players[1]={token,clientId,name:null};
  addEvent(room,'both_connected',{code:room.code});
  return token;
}
const point = data => {
  const {col,row}=data||{};
  assert(Number.isInteger(col)&&col>=0&&col<10&&Number.isInteger(row)&&row>=0&&row<10,'Choose a cell inside the grid.');
  return [col,row];
};
const removeShip = (board,name) => board.map(row=>row.map(cell=>cell.shipName===name?{...cell,ship:false,shipName:undefined}:cell));
export function command(room, seat, event, data, requestId) {
  if(room.receipts.includes(requestId)) return false;
  assert(room.phase!=='closed','This room has closed. Please start a new room.',410);
  if(event==='rejoin_room') {
    addEvent(room,'rejoined',{code:room.code,seat},seat);
    if(room.phase==='battle'||room.phase==='finished') {
      const shots=room.events.filter(e=>e.type==='shot_result').map(e=>e.data);
      addEvent(room,'battle_ready',{boards:room.boards,turn:room.turn,resumed:true,sonar:room.sonar,ghost:room.ghost,
        shots:[0,1].map(s=>shots.filter(e=>e.shooter_seat===s).length),hits:[0,1].map(s=>shots.filter(e=>e.shooter_seat===s&&e.hit).length),
        sunk:[0,1].map(s=>shots.filter(e=>e.shooter_seat===s&&e.sunk_ship).length)},seat);
    }
  } else if(event==='leave_room') {
    room.phase='closed'; addEvent(room,'opponent_left',{},1-seat);
  } else if(event==='player_name') {
    assert(room.players[1]&&room.phase==='lobby','Wait for the other commander to join.');
    const name=String(data||'').trim().slice(0,14); assert(name,'Enter your commander name.');
    room.players[seat].name=name;
    if(room.players.every(p=>p?.name)) {
      room.phase='deployment'; addEvent(room,'game_start',{names:room.players.map(p=>p.name)});
    }
  } else if(event==='place_ship') {
    assert(room.phase==='deployment'&&!room.ready[seat],'Deployment is already confirmed.',409);
    const template=Battleship.ship_array.find(s=>s.name===data?.shipName); assert(template,'Choose a valid ship.');
    const [col,row]=point(data),orientation=data.orientation==='vertical'?'vertical':'horizontal';
    const board=removeShip(room.boards[seat],template.name);
    const placed=Battleship.place_ship(board,{...template,orientation},col,row);
    assert(placed!==board,'That ship overlaps another ship or leaves the grid.'); room.boards[seat]=placed;
  } else if(event==='placement_done') {
    assert(room.phase==='deployment','Deployment has already ended.',409);
    assert(Battleship.ship_array.every(s=>Battleship.ship_cells_by_name(room.boards[seat],s.name).length===s.length),'Place all five ships before confirming.');
    room.ready[seat]=true;
    if(room.ready.every(Boolean)) { room.phase='battle'; addEvent(room,'battle_ready',{boards:room.boards,turn:0}); }
  } else {
    assert(room.phase==='battle','The battle has not started.',409);
    assert(room.turn%2===seat,'Wait for your turn.',409);
    if(event==='shoot') {
      const [col,row]=point(data),board=room.boards[1-seat],cell=board[row][col]; assert(!cell.shot,'This cell has already been fired at.',409);
      const hit=Battleship.is_ship_here(cell),name=hit?cell.shipName:null;
      room.boards[1-seat]=Battleship.shoot_cell(board,[col,row]);
      const sunk_ship=name&&Battleship.is_ship_sunk_by_name(room.boards[1-seat],name)?name:null;
      const won=Battleship.has_player_won(room.boards[1-seat]);
      room.turn++; if(won) room.phase='finished';
      addEvent(room,'shot_result',{shooter_seat:seat,col,row,hit,sunk_ship,won,next_turn:room.turn});
    } else if(event==='sonar') {
      const [col,row]=point(data); assert(room.sonar[seat]>0,'No sonar scans remain.',409);
      room.sonar[seat]--; room.turn++; addEvent(room,'sonar_result',{shooter_seat:seat,col,row,next_turn:room.turn});
    } else if(event==='ghost_slide') {
      assert(room.ghost[seat]>0,'No Ghost Moves remain.',409);
      const name=String(data?.ship_name||''),direction=data?.direction,distance=data?.distance,board=room.boards[seat];
      assert(['up','down','left','right'].includes(direction)&&[1,2].includes(distance),'Choose a valid slide.');
      assert(Battleship.ship_cells_by_name(board,name).length>0&&Battleship.is_ship_damaged(board,name)&&!Battleship.is_ship_sunk_by_name(board,name),'Choose a damaged, surviving ship.');
      const moved=Battleship.ghost_slide(board,name,direction,distance); assert(moved!==board,'That move is blocked.');
      room.boards[seat]=moved; room.ghost[seat]--; room.turn++;
      addEvent(room,'ghost_slide_result',{shooter_seat:seat,ship_name:name,direction,distance,next_turn:room.turn,ghost_moves_left:room.ghost.slice()});
    } else if(event==='ghost_relocate') {
      assert(room.ghost[seat]>0,'No Ghost Moves remain.',409);
      const name=String(data?.ship_name||''),board=room.boards[seat],cells=Battleship.ship_cells_by_name(board,name);
      assert(cells.length>0&&!Battleship.is_ship_damaged(board,name),'Choose an undamaged ship.');
      const [col,row]=point({col:data?.anchor_col,row:data?.anchor_row}),orientation=data?.orientation==='vertical'?'vertical':'horizontal';
      const footprint=Battleship.relocate_footprint([col,row],cells.length,orientation);
      assert(Battleship.relocate_valid(board,footprint,name),'That move is blocked.');
      room.boards[seat]=Battleship.apply_ghost_relocate(board,name,footprint); room.ghost[seat]--; room.turn++;
      addEvent(room,'ghost_relocate_result',{shooter_seat:seat,ship_name:name,anchor_col:col,anchor_row:row,orientation,next_turn:room.turn,ghost_moves_left:room.ghost.slice()});
    } else throw new RoomError('Unknown game action.');
  }
  room.receipts.push(requestId); room.receipts=room.receipts.slice(-256); return true;
}
