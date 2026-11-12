// One cancellable timeline owns the title and every field. New values commit
// together, so interrupted selections cannot mix data from different projects.
export function createProjectInfo({root,gsap,reducedMotion=false}){
  const title=root.querySelector('[data-project-title]');
  const rows=[...root.querySelectorAll('[data-project-field]')].map(row=>({
    key:row.dataset.projectField,value:row.querySelector('[data-field-value]'),
    label:row.querySelector('[data-field-label]'),rules:[...row.querySelectorAll('[data-field-rule]')]
  }));
  const values=rows.map(r=>r.value),labels=rows.map(r=>r.label),rules=rows.flatMap(r=>r.rules);
  let timeline=null,wanted=null,committed=null,generation=0;
  const fitTitle=()=>{
    if(typeof getComputedStyle==='undefined'||!title.textContent)return;
    title.style.fontSize='';
    const range=document.createRange();range.selectNodeContents(title);
    const natural=range.getBoundingClientRect().width,available=title.clientWidth;
    if(natural>available&&available>0)title.style.fontSize=`${parseFloat(getComputedStyle(title).fontSize)*available/natural}px`;
  };
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(fitTitle):null;resize?.observe(root);
  function show(project,{immediate=false,force=false}={}){
    if(wanted===project.id&&!force)return;
    wanted=project.id;const revision=++generation;timeline?.kill();
    root.dataset.infoTarget=project.id;root.dataset.infoPhase='exit';
    const commit=()=>{
      if(revision!==generation)return;
      title.textContent=project.galleryTitle||project.discTitle||project.name;title.setAttribute('title',project.name);rows.forEach(row=>{row.value.textContent=project[row.key];});
      fitTitle();
      committed=project.id;root.dataset.projectId=project.id;root.dataset.infoPhase='enter';
      gsap.set([title,...values],{y:0,yPercent:115});gsap.set(labels,{clipPath:'inset(0 100% 0 0)'});gsap.set(rules,{scaleX:0,transformOrigin:'left center'});
    };
    if(reducedMotion||immediate){commit();gsap.set([title,...values],{yPercent:0});gsap.set(labels,{clipPath:'inset(0 0% 0 0)'});gsap.set(rules,{scaleX:1});root.dataset.infoPhase='complete';return;}
    const start=committed===null?0:.18;
    timeline=gsap.timeline({onComplete(){if(revision===generation)root.dataset.infoPhase='complete';}});
    if(start){timeline.to([title,...values],{yPercent:-115,duration:.14,stagger:.01,ease:'power2.in'},0)
      .to(labels,{clipPath:'inset(0 100% 0 0)',duration:.12},0).to(rules,{scaleX:0,duration:.12},0);}
    timeline.call(commit,[],start).to(title,{yPercent:0,duration:.28,ease:'power3.out'},start);
    rows.forEach((row,index)=>{
      const at=start+.1+index*.09;
      timeline.to(row.value,{yPercent:0,duration:.28,ease:'power3.out'},at)
        .to(row.label,{clipPath:'inset(0 0% 0 0)',duration:.26,ease:'power2.out'},at)
        .to(row.rules,{scaleX:1,duration:.28,ease:'power2.out'},at);
    });
  }
  return {show,destroy(){generation++;timeline?.kill();resize?.disconnect();}};
}
