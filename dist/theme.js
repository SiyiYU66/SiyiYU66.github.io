const root=document.documentElement;
export const isLight=()=>root.dataset.theme==='light';
export function mountThemeToggle(){
  const button=document.getElementById('theme-toggle');
  const update=()=>{const light=isLight();button.textContent=light?'Dark mode ◐':'Light mode ◑';button.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');button.setAttribute('aria-pressed',String(light));document.querySelector('meta[name="theme-color"]').content=light?'#f2f2f2':'#171512';};
  button.addEventListener('click',()=>{root.dataset.theme=isLight()?'dark':'light';try{localStorage.setItem('lr-theme',root.dataset.theme);}catch{}update();});update();
}
