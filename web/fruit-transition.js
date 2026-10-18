// Carry the picked illustration into the close-up without moving the page.
export function createFruitTransition(doc=document,win=window){
 let active=null;

 function cancel(){
  const previous=active;active=null;
  if(!previous)return;
  previous.animation?.cancel();
  previous.overlay.remove();
 }

 function start({sourceRect,sourceSvg,targetElement}={}){
  cancel();
  if(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches||
   !sourceSvg||!sourceRect||!targetElement||!doc.body)return false;
  const target=targetElement.getBoundingClientRect();
  if(![sourceRect.left,sourceRect.top,sourceRect.width,sourceRect.height,
   target.left,target.top,target.width,target.height].every(Number.isFinite)||
   sourceRect.width<=0||sourceRect.height<=0||target.width<=0||target.height<=0)return false;

  const overlay=doc.createElement('div');
  if(typeof overlay.animate!=='function')return false;
  overlay.className='fruit-journey';
  overlay.setAttribute('aria-hidden','true');
  Object.assign(overlay.style,{
   position:'fixed',left:`${sourceRect.left}px`,top:`${sourceRect.top}px`,
   width:`${sourceRect.width}px`,height:`${sourceRect.height}px`,
   margin:'0',padding:'0',pointerEvents:'none',zIndex:'30',
   transformOrigin:'50% 50%',willChange:'transform, opacity'
  });
  const illustration=sourceSvg.cloneNode(true);
  illustration.removeAttribute('id');
  illustration.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
  illustration.setAttribute('aria-hidden','true');
  illustration.setAttribute('focusable','false');
  Object.assign(illustration.style,{display:'block',width:'100%',height:'100%',overflow:'visible'});
  overlay.append(illustration);doc.body.append(overlay);

  const dx=target.left+target.width/2-sourceRect.left-sourceRect.width/2;
  const dy=target.top+target.height/2-sourceRect.top-sourceRect.height/2;
  const size=Math.min(target.width*.5,target.height*.65);
  const scale=size/Math.max(sourceRect.width,sourceRect.height);
  const transform=(x,y,s,rotation)=>`translate(${x}px, ${y}px) scale(${s}) rotate(${rotation}deg)`;
  const journey={overlay,animation:null};active=journey;
  try{
   journey.animation=overlay.animate([
    {transform:transform(0,0,1,-7),opacity:1,offset:0},
    {transform:transform(dx*.94,dy*.94-10,scale*.97,3),opacity:1,offset:.66},
    {transform:transform(dx,dy,scale*1.025,0),opacity:.8,offset:.82},
    {transform:transform(dx,dy,scale,0),opacity:0,offset:1}
   ],{duration:650,easing:'cubic-bezier(.2,.75,.3,1)',fill:'both'});
   const finish=()=>{
    overlay.remove();
    if(active===journey)active=null;
   };
   // Both cancellation and completion release the overlay; cancellation rejects finished.
   journey.animation.finished.then(finish,finish);
  }catch(error){
   overlay.remove();if(active===journey)active=null;
   return false;
  }
  return true;
 }

 return {start,cancel};
}
