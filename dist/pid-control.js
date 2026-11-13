const make=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text)node.textContent=text;
  return node;
};
function gain(symbol){
  const node=make('span','pid-gain');
  node.append(document.createTextNode('K'),make('sub','',symbol));
  return node;
}
function equation(){
  const formula=make('div','pid-equation');
  formula.setAttribute('role','math');
  formula.setAttribute('aria-label','Motor command u equals K p times error plus K i times integral minus K d times angular rate.');
  const label=make('span','case-label','The motor command');
  const visual=make('div','pid-equation-line');visual.setAttribute('aria-hidden','true');
  visual.append(make('span','pid-equation-output','u ='));
  for(const [sign,symbol,meaning] of [['','p','error'],['+','i','integral'],['−','d','rate']]){
    const term=make('span','pid-equation-term');
    if(sign)term.append(make('span','pid-equation-sign',sign));
    term.append(gain(symbol),make('span','pid-equation-times','×'),make('span','pid-equation-variable',meaning));
    visual.append(term);
  }
  const explanation=make('p','pid-equation-caption','Error is the difference from upright. Integral accumulates that error; rate is measured by the gyroscope.');
  formula.append(label,visual,explanation);
  return formula;
}

// The shared figure factory keeps native video controls and global pause-on-exit.
// This component does not start playback or create another media controller.
export function renderPIDControl({terms,tuning,video},renderFigure){
  const root=make('div','pid-control');
  root.append(equation());
  const layout=make('div','pid-layout');
  const cards=make('section','pid-terms');cards.setAttribute('aria-label','The three PID gains');
  for(const {term,name,gain:symbol,meaning,excess} of terms){
    const card=make('article','pid-term');card.dataset.term=term;
    const heading=make('header','pid-term-heading');
    const title=make('h4','pid-term-name',name);
    const symbolLabel=make('span','pid-term-symbol');symbolLabel.append(gain(symbol));
    heading.append(title,symbolLabel);
    card.append(heading,make('p','pid-term-meaning',meaning),make('p','pid-term-excess',excess));
    cards.append(card);
  }
  const study=make('aside','pid-tuning');study.setAttribute('aria-label','Testing and tuning');
  const copy=make('div','pid-tuning-copy');
  copy.append(make('span','case-label','Testing & tuning'),make('h4','pid-tuning-title',tuning.title),make('p','pid-tuning-intro',tuning.text));
  study.append(copy);
  if(video)study.append(renderFigure(video));
  study.append(make('p','pid-rate-note',tuning.rateNote));
  layout.append(cards,study);root.append(layout);
  return root;
}
