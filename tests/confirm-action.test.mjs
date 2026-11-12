import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createActionConfirmation} from '../assets/games/battleship/confirm-action.js';

class Element {
  constructor(document, tag) { this.document=document;this.tagName=tag;this.children=[];this.attributes={};this.listeners=new Map();this.hidden=false;this.parentNode=null;this.disabled=false; }
  append(...elements) { for(const child of elements){child.parentNode=this;this.children.push(child);} }
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(fn);}
  removeEventListener(name,fn){this.listeners.set(name,(this.listeners.get(name)||[]).filter(value=>value!==fn));}
  emit(name,event={}){if(!('target' in event))event.target=this;for(const listener of this.listeners.get(name)||[])listener(event);}
  click(){this.emit('click');}
  focus(){this.document.activeElement=this;this.document.emit('focusin',{target:this});}
  contains(element){return element===this||this.children.some(child=>child.contains(element));}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
  get isConnected(){return this===this.document.body||Boolean(this.parentNode?.isConnected);}
}
class Document extends Element {
  constructor(){super(null,'document');this.document=this;this.body=new Element(this,'body');this.activeElement=this.body;}
  createElement(tag){return new Element(this,tag);}
  key(key,shiftKey=false){const event={key,shiftKey,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};this.emit('keydown',event);return event;}
}
function fixture(){const document=new Document();const previous=document.createElement('button');document.body.append(previous);previous.focus();const confirmation=createActionConfirmation({document});const root=document.body.children[1],panel=root.children[0],actions=panel.children[2];return{document,previous,confirmation,root,title:panel.children[0],message:panel.children[1],stay:actions.children[0],approve:actions.children[1]};}

test('cancel retains the game and restores focus; repeated taps cannot queue another approval',async()=>{
  const f=fixture();const result=f.confirmation.request({title:'Exit game?',message:'Your room will be left.'});
  assert.equal(f.confirmation.isOpen(),true);assert.equal(f.document.activeElement,f.stay);
  assert.equal(await f.confirmation.request({title:'Overwritten?'}),false);assert.equal(f.title.textContent,'Exit game?');
  f.stay.click();assert.equal(await result,false);assert.equal(f.confirmation.isOpen(),false);assert.equal(f.root.hidden,true);assert.equal(f.document.activeElement,f.previous);
});

test('approval resolves once and the same dialog is reused for the next independent action',async()=>{
  const f=fixture();let resolutions=0;const first=f.confirmation.request({title:'Leave room?',message:'Leave this room.',confirmLabel:'Leave room'}).then(value=>{resolutions++;return value;});
  f.approve.click();f.approve.click();assert.equal(await first,true);assert.equal(resolutions,1);
  const second=f.confirmation.request({title:'Return to menu?',message:'Keep or leave?',confirmLabel:'Return to menu'});
  assert.equal(f.document.body.children.length,2);assert.equal(f.approve.textContent,'Return to menu');f.confirmation.cancel();assert.equal(await second,false);
});

test('backdrop clicks do not exit, Tab stays inside, and Escape cancels without reaching other exit handlers',async()=>{
  const f=fixture();const pending=f.confirmation.request({title:'Exit?'});f.root.click();assert.equal(f.confirmation.isOpen(),true);
  f.approve.focus();assert.equal(f.document.key('Tab').prevented,true);assert.equal(f.document.activeElement,f.stay);
  assert.equal(f.document.key('Tab',true).prevented,true);assert.equal(f.document.activeElement,f.approve);
  f.previous.focus();assert.equal(f.document.activeElement,f.stay);
  const escape=f.document.key('Escape');assert.equal(escape.prevented,true);assert.equal(escape.stopped,true);assert.equal(await pending,false);
});

test('destroy cancels a pending action and removes modal listeners and DOM',async()=>{
  const f=fixture();const pending=f.confirmation.request({title:'Exit?'});f.confirmation.destroy();f.confirmation.destroy();
  assert.equal(await pending,false);assert.equal(f.root.isConnected,false);assert.equal(f.document.listeners.get('keydown').length,0);assert.equal(f.document.listeners.get('focusin').length,0);assert.equal(await f.confirmation.request({title:'Exit?'}),false);
});

test('child navigation waits for a matching parent approval, suppresses early disconnect and bypasses only one replayed click',async()=>{
  const code=await readFile(new URL('../assets/games/battleship/stage-entry.js',import.meta.url),'utf8');
  const documentListeners=new Map(),windowListeners=new Map(),posted=[];
  const document={documentElement:{classList:{add(){}},dataset:{}},addEventListener(type,listener){documentListeners.set(type,listener);}};
  const parent={document:{documentElement:{dataset:{gameRenderProfile:'mobile'}}},postMessage(message,origin){posted.push({message,origin});}};
  const window={parent,top:parent,addEventListener(type,listener){windowListeners.set(type,listener);}};window.self=window;
  const location={origin:'https://game.example',pathname:'/assets/games/battleship/online.html'};
  vm.runInNewContext(code,{document,parent,window,location,matchMedia:()=>({matches:false}),Date});
  let originalCalls=0;
  const target={isConnected:true,disabled:false,closest(){return this;},matches(selector){return selector==='.nav-home-btn';},click(){const event=clickEvent(this);documentListeners.get('click')(event);if(!event.stopped)originalCalls++;}};
  function clickEvent(target){return{target,prevented:false,stopped:false,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};}
  const first=clickEvent(target);documentListeners.get('click')(first);documentListeners.get('click')(clickEvent(target));
  assert.equal(first.prevented,true);assert.equal(first.stopped,true);assert.equal(originalCalls,0);assert.equal(posted.length,1);assert.equal(posted[0].message.kind,'menu');
  const requestId=posted[0].message.requestId;
  const answer=(overrides={})=>({source:parent,origin:location.origin,data:{type:'battleship:navigation-answer',requestId,approved:true},...overrides});
  windowListeners.get('message')(answer({origin:'https://other.example'}));windowListeners.get('message')(answer({source:{}}));assert.equal(originalCalls,0);
  windowListeners.get('message')(answer());windowListeners.get('message')(answer());assert.equal(originalCalls,1);
  documentListeners.get('click')(clickEvent(target));assert.equal(posted.length,2);
  windowListeners.get('message')(answer({data:{type:'battleship:navigation-answer',requestId:posted[1].message.requestId,approved:false}}));assert.equal(originalCalls,1);
  documentListeners.get('click')(clickEvent(target));windowListeners.get('pagehide')();windowListeners.get('message')(answer({data:{type:'battleship:navigation-answer',requestId:posted[2].message.requestId,approved:true}}));assert.equal(originalCalls,1);
  const ready=clickEvent({closest(){return null;}});documentListeners.get('click')(ready);assert.equal(ready.prevented,false);assert.equal(ready.stopped,false);
  const leave={...target,matches(){return false;}};documentListeners.get('click')(clickEvent(leave));assert.equal(posted[3].message.kind,'leave-room');
  windowListeners.get('message')(answer());assert.equal(originalCalls,1,'an old answer must not approve the new leave request');
  windowListeners.get('message')(answer({data:{type:'battleship:navigation-answer',requestId:posted[3].message.requestId,approved:true}}));assert.equal(originalCalls,2);
  assert.equal(document.documentElement.dataset.renderProfile,'mobile');
});
