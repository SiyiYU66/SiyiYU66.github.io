import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Texture,HemisphereLight,SpotLight} from '../dist/vendor/three.module.js';
import {createRoomThemeState} from '../dist/night-room.js';
import Game from '../assets/games/battleship/BattleShip.js';

test('theme round trips restore the canonical night reflections and original light values',()=>{
  const scene=new Scene(),night=new Texture(),studio=new Texture(),intro=new Texture();scene.environment=night;
  const lamp=new SpotLight('#fff0d6',132),ambient=new HemisphereLight('#eee6d8','#2b2620',.29);scene.add(lamp,ambient);
  const originalColor=lamp.color.getHex(),state=createRoomThemeState(scene,{lightEnvironment:studio});
  for(let i=0;i<4;i++){state.apply(true);scene.environment=intro;state.apply(false);assert.equal(scene.environment,night);assert.equal(scene.environmentIntensity,1);assert.equal(lamp.intensity,132);assert.equal(lamp.color.getHex(),originalColor);assert.equal(ambient.intensity,.29);}
  state.setEnvironment(intro);state.apply(true);state.setEnvironment(night);state.apply(false);assert.equal(scene.environment,night);
});
test('the bundled browser game runs its original immutable placement and combat engine',()=>{
  const empty=Game.empty_board(),ship={name:'Destroyer',length:2,orientation:'horizontal'};
  const placed=Game.place_ship(empty,ship,1,1);assert.notEqual(placed,empty);assert.equal(empty[1][1].ship,false);
  assert.equal(Game.place_ship(placed,{...ship,name:'Other'},1,1),placed);
  const hit=Game.shoot_cell(placed,[1,1]);assert.equal(hit[1][1].shot,true);assert.equal(placed[1][1].shot,false);assert.equal(Game.shoot_cell(hit,[1,1]),hit);
  assert.equal(Game.has_player_won(hit),false);assert.equal(Game.has_player_won(Game.shoot_cell(hit,[2,1])),true);
});
