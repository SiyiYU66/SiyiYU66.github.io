import test from 'node:test';
import assert from 'node:assert/strict';
import {fitArena, gameScreen, needsLandscape, GAME_WIDTH, GAME_HEIGHT} from '../assets/games/battleship/arena-layout.js';

test('narrow desktop windows stay upright while portrait touchscreens use landscape play', () => {
  assert.equal(needsLandscape(319,693,false),false);
  assert.equal(needsLandscape(390,844,true),true);
  assert.equal(needsLandscape(844,390,true),false);
});

test('a touch keyboard resizing the viewport cannot flip the game while entering a room code', () => {
  assert.equal(needsLandscape(844,200,true),false);
  assert.equal(fitArena(844,200).angle,0);
});

test('the complete landscape stage fits short phones, tablets and desktop screens without cropping', () => {
  for (const [width,height] of [[568,320],[667,375],[844,390],[932,430],[1024,768],[1280,720],[1920,1080],[2560,1080]]) {
    const fit = fitArena(width,height);
    assert.ok(fit.width <= width + .001);
    assert.ok(fit.height <= height + .001);
    assert.ok(Math.abs(fit.width / fit.height - 5/3) < .0001);
    assert.equal(fit.angle,0);
    assert.ok(fit.scale > 0);
  }
});

test('portrait touch play waits for physical landscape without rotating an interactive iframe', () => {
  for (const [width,height] of [[320,568],[375,667],[390,844],[430,932],[768,1024]]) {
    const portrait = fitArena(width,height);
    assert.ok(portrait.width <= width + .001);
    assert.ok(portrait.height <= height + .001);
    assert.equal(needsLandscape(width,height,true),true);
    assert.equal(portrait.angle,0);
    assert.equal(GAME_WIDTH,1280);
    assert.equal(GAME_HEIGHT,720);
  }
});

test('direct links can only open a known local game screen', () => {
  assert.equal(gameScreen('Human_VS_Human.html'),'Human_VS_Human');
  assert.equal(gameScreen('/assets/games/battleship/online'),'online');
  assert.equal(gameScreen('https://example.com/other.html'),'index');
  assert.equal(gameScreen('online?token=untrusted'),'index');
  assert.equal(gameScreen(null),'index');
});
