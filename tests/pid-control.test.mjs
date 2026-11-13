import test from 'node:test';
import assert from 'node:assert/strict';
import {segwayProject} from '../dist/segway-study.js';
import {renderProjectCaseStudy} from '../dist/project-case-study.js';
import {coverImagePlacement} from '../dist/project-media.js';

class Element extends EventTarget{
  constructor(tag){super();this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.className='';this.pauses=0;this.style={setProperty(){}};this._text='';this.classList={add:name=>{this.className+=' '+name;}};}
  append(...nodes){for(const node of nodes){if(node.tagName==='#FRAGMENT')this.append(...node.children);else this.children.push(node);}}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(name,value){this.attributes[name]=value;}
  removeAttribute(name){delete this.attributes[name];}
  get textContent(){return this._text+this.children.map(node=>node.textContent).join('');}
  set textContent(value){this._text=value;this.children=[];}
  querySelectorAll(selector){return descendants(this).filter(node=>node.tagName===selector.toUpperCase());}
  pause(){this.pauses++;}
}
function descendants(root){return root.children.flatMap(child=>[child,...descendants(child)]);}
function hasClass(node,name){return node.className.split(' ').includes(name);}
function render(){
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  const document=new EventTarget();document.hidden=false;
  document.createElement=tag=>new Element(tag);
  document.createDocumentFragment=()=>new Element('#fragment');
  document.createTextNode=text=>{const node=new Element('#text');node.textContent=text;return node;};
  Object.defineProperty(globalThis,'document',{value:document,configurable:true});
  const host=new Element('div');
  const dispose=renderProjectCaseStudy(host,segwayProject.caseStudy,{scroller:host,reducedMotion:true});
  return {host,dispose,restore(){dispose();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}};
}

test('Segway keeps the hardware disc and uses the supplied tabletop photograph for its hero',()=>{
  assert.ok(segwayProject.cover.endsWith('/pybench.webp'));
  assert.ok(segwayProject.hero.endsWith('/balancing-tabletop.png'));
  assert.equal(segwayProject.coverInk,'#202320');
  const p=coverImagePlacement(1000,848,1024,segwayProject.coverCrop);
  assert.ok(Math.hypot(p.x-512,p.y-512)<512);
  assert.ok(Math.hypot(p.x+p.width-512,p.y+p.height-512)<512);
  const figures=segwayProject.caseStudy.chapters.flatMap(chapter=>chapter.figures||[]);
  assert.ok(figures.every(figure=>!figure.src.endsWith('/control-loop.svg')));
  const hardware=figures.find(figure=>figure.src.endsWith('/pybench.webp'));
  assert.equal(hardware.height,848);assert.equal(hardware.background,'transparent');assert.equal(hardware.borderless,true);
});

test('PID rendering keeps true gain subscripts, distinct excess effects and one native video',()=>{
  const h=render();
  try{
    const nodes=descendants(h.host);
    const equation=nodes.find(node=>hasClass(node,'pid-equation'));
    assert.equal(equation.attributes.role,'math');
    assert.deepEqual(descendants(equation).filter(node=>node.tagName==='SUB').map(node=>node.textContent),['p','i','d']);
    const terms=nodes.filter(node=>hasClass(node,'pid-term'));
    assert.deepEqual(terms.map(term=>term.dataset.term),['P','I','D']);
    for(const [index,term] of terms.entries()){
      assert.equal(descendants(term).filter(node=>node.tagName==='SUB').length,1);
      assert.ok(term.textContent.includes(['Proportional','Integral','Derivative'][index]));
      assert.ok(term.textContent.includes(`Too much ${['P','I','D'][index]}`));
    }
    assert.ok(terms[0].textContent.includes('oscillate'));
    assert.ok(terms[1].textContent.includes('wind-up'));
    assert.ok(terms[2].textContent.includes('sensor noise'));
    const videos=nodes.filter(node=>node.tagName==='VIDEO');
    assert.equal(videos.length,1);
    assert.equal(videos[0].controls,true);assert.equal(videos[0].playsInline,true);assert.equal(videos[0].preload,'none');
    assert.equal(videos[0].src,'/media/balancing-segway.mp4');
    assert.equal(videos[0].autoplay,undefined);
    const tuning=nodes.find(node=>hasClass(node,'pid-tuning'));
    assert.ok(descendants(tuning).includes(videos[0]));
    assert.ok(tuning.textContent.includes('elastic cord'));
    assert.equal(h.host.querySelectorAll('img').length,1,'Only the genuine transparent PyBench image is illustrated');
    assert.ok(nodes.some(node=>hasClass(node,'case-figure--floating')));
    h.dispose();assert.equal(videos[0].pauses,1);h.dispose();assert.equal(videos[0].pauses,1);
  }finally{h.restore();}
});
