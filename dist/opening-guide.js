// The two reading holds start after real flap completion, never while tiles fall.
export function createOpeningGuide({schedule,onPortfolio,onComplete}){
  let phase='name-entering',cancel=null;
  const clear=()=>{cancel?.();cancel=null;};
  function requestPortfolio(){
    if(!['name-entering','name'].includes(phase))return;
    clear();phase='portfolio-entering';onPortfolio();
  }
  function settled(word){
    if(word==='name'&&phase==='name-entering'){
      phase='name';cancel=schedule(2,requestPortfolio);
    }else if(word==='portfolio'&&phase==='portfolio-entering'){
      phase='portfolio';cancel=schedule(2,()=>{cancel=null;phase='complete';onComplete();});
    }
  }
  return {requestPortfolio,settled,get phase(){return phase;},destroy(){clear();phase='destroyed';}};
}
