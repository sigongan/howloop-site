// Small, short-lived rewards that never move the stage or intercept a child's touch.
export function createPlayEffects({world,win=window,doc=document}={}){
 const MAX_PARTICLES=72;
 const particles=new Set(),layers=new Map();
 const motion=win.matchMedia?.('(prefers-reduced-motion: reduce)');
 const colours=['#f4d568','#e9a18b','#9dbd7b','#fff8d9','#b9d6ba'];
 let destroyed=false;

 function allowed(){return !destroyed&&!doc.hidden&&!motion?.matches&&Boolean(world);}
 function bounds(element){
  const rect=element?.getBoundingClientRect?.();
  return rect&&[rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)&&rect.width>0&&rect.height>0?rect:null;
 }
 function layerFor(host){
  if(layers.has(host))return layers.get(host);
  const layer=doc.createElement('div');
  if(typeof layer.animate!=='function')return null;
  layer.className='play-fx-layer';layer.setAttribute('aria-hidden','true');
  Object.assign(layer.style,{position:'absolute',inset:'0',overflow:'hidden',pointerEvents:'none',borderRadius:'inherit',zIndex:'5',contain:'strict'});
  host.append(layer);layers.set(host,layer);return layer;
 }
 function release(record){
  if(!particles.delete(record))return;
  win.clearTimeout(record.timer);record.node.remove();
  if(![...particles].some(item=>item.layer===record.layer)){
   record.layer.remove();layers.delete(record.host);
  }
 }
 function clear(){
  for(const record of [...particles]){
   record.animation?.cancel();release(record);
  }
  for(const layer of layers.values())layer.remove();
  layers.clear();
 }
 function particle(host,{x,y,size=10,colour='#f4d568',shape='dot',frames,duration=850,delay=0}){
  if(!allowed()||particles.size>=MAX_PARTICLES||![x,y,size].every(Number.isFinite))return false;
  const layer=layerFor(host);if(!layer)return false;
  const node=doc.createElement('i');
  node.className=`play-fx-particle play-fx-${shape}`;node.setAttribute('aria-hidden','true');
  Object.assign(node.style,{position:'absolute',left:`${x-size/2}px`,top:`${y-size/2}px`,width:`${size}px`,height:`${size}px`,background:colour,display:'block',pointerEvents:'none',borderRadius:shape==='leaf'?'85% 0 85% 0':'50%',willChange:'transform, opacity'});
  if(shape==='star')node.style.clipPath='polygon(50% 0,61% 35%,98% 35%,68% 58%,79% 94%,50% 72%,21% 94%,32% 58%,2% 35%,39% 35%)';
  layer.append(node);
  const record={host,layer,node,animation:null,timer:null};particles.add(record);
  try{
   record.animation=node.animate(frames,{duration,delay,easing:'cubic-bezier(.18,.65,.35,1)',fill:'both'});
   record.animation.finished.then(()=>release(record),()=>release(record));
   // Also release when a browser stops reporting animation completion in a hidden tab.
   record.timer=win.setTimeout(()=>{record.animation?.cancel();release(record);},duration+delay+160);
   return true;
  }catch(error){release(record);return false;}
 }
 const transform=(x,y,rotation=0,scale=1)=>`translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;

 function burst({x,y,kind='seed',count=10}={}){
  const rect=bounds(world);if(!allowed()||!rect||!Number.isFinite(x)||!Number.isFinite(y))return 0;
  let created=0;
  const total=Math.max(0,Math.min(18,Math.round(Number(count)||0)));
  for(let i=0;i<total;i++){
   const angle=Math.PI*2*(i/Math.max(total,1))-.5;
   const distance=30+Math.random()*32;
   const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;
   const star=kind==='seed'&&i%3!==1;
   created+=Number(particle(world,{x:x-rect.left,y:y-rect.top,size:star?10+Math.random()*5:5+Math.random()*3,shape:star?'star':'dot',colour:colours[i%colours.length],duration:650+Math.random()*180,frames:[
    {transform:transform(0,0,0,.2),opacity:0,offset:0},
    {transform:transform(dx*.48,dy*.48-7,30,1.12),opacity:1,offset:.25},
    {transform:transform(dx,dy+14,100,.4),opacity:0,offset:1}
   ]}));
  }
  return created;
 }

 function leaves(strength=1){
  const rect=bounds(world);if(!allowed()||!rect)return 0;
  const level=Math.max(1,Math.min(4,Number(strength)||1));
  let created=0;
  for(let i=0;i<8+level*2;i++){
   const dx=(Math.random()-.5)*(45+level*20),dy=55+Math.random()*70;
   created+=Number(particle(world,{x:rect.width*(.3+Math.random()*.4),y:rect.height*(.22+Math.random()*.27),size:7+Math.random()*6,shape:'leaf',colour:i%2?'#b2ca8b':'#87aa6e',duration:900+Math.random()*400,delay:i*16,frames:[
    {transform:transform(0,0,-25,.7),opacity:0,offset:0},
    {transform:transform(dx*.55,dy*.15,35,1),opacity:.85,offset:.2},
    {transform:transform(dx-12,dy*.6,-35,.9),opacity:.7,offset:.65},
    {transform:transform(dx,dy,70,.5),opacity:0,offset:1}
   ]}));
  }
  return created;
 }

 function landing(element){
  const rect=bounds(world),target=bounds(element);if(!allowed()||!rect||!target)return 0;
  let created=0;
  for(let i=0;i<8;i++){
   const side=i%2?-1:1,dx=side*(16+Math.random()*24),dy=-8-Math.random()*12;
   created+=Number(particle(world,{x:target.left+target.width/2-rect.left,y:target.bottom-rect.top-5,size:5+Math.random()*8,colour:i%3?'#e2dcb8':'#fff8dc',duration:520+Math.random()*130,frames:[
    {transform:transform(0,0,0,.2),opacity:0,offset:0},
    {transform:transform(dx*.55,dy,0,1.2),opacity:.75,offset:.35},
    {transform:transform(dx,dy+6,0,.4),opacity:0,offset:1}
   ]}));
  }
  return created;
 }

 function celebrate(element){
  const rect=bounds(element);if(!allowed()||!rect)return 0;
  let created=0;
  for(let i=0;i<26;i++){
   const side=i%2?-1:1,dx=side*(28+Math.random()*rect.width*.35),height=50+Math.random()*70;
   created+=Number(particle(element,{x:rect.width*.5,y:rect.height*.38,size:7+Math.random()*7,shape:i%3===0?'star':'dot',colour:colours[i%colours.length],duration:1000+Math.random()*250,delay:Math.floor(i/7)*60,frames:[
    {transform:transform(0,0,0,.3),opacity:0,offset:0},
    {transform:transform(dx*.65,-height,i*20,1),opacity:.95,offset:.3},
    {transform:transform(dx,height*.8,i*35,.6),opacity:0,offset:1}
   ]}));
  }
  return created;
 }

 const onVisibility=()=>{if(doc.hidden)clear();};
 const onMotion=()=>{if(motion.matches)clear();};
 doc.addEventListener('visibilitychange',onVisibility);
 motion?.addEventListener?.('change',onMotion);
 function destroy(){
  destroyed=true;clear();doc.removeEventListener('visibilitychange',onVisibility);motion?.removeEventListener?.('change',onMotion);
 }
 return {burst,leaves,landing,celebrate,clear,destroy};
}
