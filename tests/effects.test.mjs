import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayEffects} from '../web/play-effects.js';

function environment({reduced=false,animated=true}={}){
 const animations=[],timers=new Map(),events=new Map(),motionEvents=new Map();let nextTimer=1;
 const motion={matches:reduced,addEventListener(name,fn){motionEvents.set(name,fn);},removeEventListener(name){motionEvents.delete(name);}};
 class Element{
  constructor(rect={left:10,top:20,width:360,height:340}){this.rect=rect;this.children=[];this.style={};this.attributes={};this.parent=null;if(!animated)this.animate=undefined;}
  getBoundingClientRect(){return {...this.rect,bottom:this.rect.top+this.rect.height,right:this.rect.left+this.rect.width};}
  setAttribute(name,value){this.attributes[name]=value;}
  append(child){child.parent=this;this.children.push(child);}
  remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}
  animate(frames,options){
   let finish,reject;const finished=new Promise((resolve,fail)=>{finish=resolve;reject=fail;});
   const animation={frames,options,finished,cancelled:false,cancel(){this.cancelled=true;reject(new Error('cancelled'));},finish};animations.push(animation);return animation;
  }
 }
 const doc={hidden:false,createElement(){return new Element();},addEventListener(name,fn){events.set(name,fn);},removeEventListener(name){events.delete(name);}};
 const win={matchMedia(){return motion;},setTimeout(fn){const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout(id){timers.delete(id);}};
 const world=new Element(),dialog=new Element({left:30,top:100,width:320,height:420});
 const effects=createPlayEffects({world,win,doc});
 return {effects,world,dialog,animations,timers,events,motionEvents,motion,doc};
}

test('feedback is decorative and leaves the stage geometry unchanged',async()=>{
 const env=environment(),before=env.world.getBoundingClientRect();
 assert.equal(env.effects.burst({x:140,y:210}),10);
 const layer=env.world.children[0];
 assert.equal(layer.attributes['aria-hidden'],'true');
 assert.equal(layer.style.pointerEvents,'none');
 assert.ok(layer.children.every(node=>node.style.pointerEvents==='none'));
 assert.deepEqual(env.world.getBoundingClientRect(),before);
 for(const animation of env.animations)animation.finish();
 await Promise.resolve();
 assert.equal(env.world.children.length,0);
 assert.equal(env.timers.size,0);
});

test('rapid gestures have a global particle budget and clearing releases every host',async()=>{
 const env=environment();
 for(let i=0;i<30;i++)env.effects.burst({x:100,y:100,count:18});
 assert.equal(env.world.children[0].children.length,72);
 assert.equal(env.effects.celebrate(env.dialog),0);
 env.effects.clear();
 assert.equal(env.world.children.length,0);
 assert.equal(env.timers.size,0);
 assert.ok(env.animations.every(animation=>animation.cancelled));
 assert.equal(env.effects.celebrate(env.dialog),26);
 assert.equal(env.dialog.children.length,1);
 for(const callback of [...env.timers.values()])callback();
 await Promise.resolve();
 assert.equal(env.dialog.children.length,0);
 assert.equal(env.timers.size,0);
});

test('reduced motion, unsupported animation, and hidden pages stay particle-free',()=>{
 for(const config of [{reduced:true},{animated:false}]){
  const env=environment(config);
  assert.equal(env.effects.burst({x:50,y:50}),0);
  assert.equal(env.effects.leaves(3),0);
  assert.equal(env.effects.landing(env.world),0);
  assert.equal(env.effects.celebrate(env.dialog),0);
  assert.equal(env.world.children.length,0);
  assert.equal(env.dialog.children.length,0);
 }
 const env=environment();env.doc.hidden=true;
 assert.equal(env.effects.burst({x:50,y:50}),0);
 assert.equal(env.world.children.length,0);
});

test('backgrounding and changing motion preferences cancel active effects, destruction removes listeners',()=>{
 const env=environment();env.effects.leaves(4);
 assert.ok(env.world.children.length);
 env.doc.hidden=true;env.events.get('visibilitychange')();
 assert.equal(env.world.children.length,0);
 env.doc.hidden=false;env.effects.landing(env.world);
 env.motion.matches=true;env.motionEvents.get('change')();
 assert.equal(env.world.children.length,0);
 env.effects.destroy();
 assert.equal(env.events.size,0);
 assert.equal(env.motionEvents.size,0);
 env.motion.matches=false;
 assert.equal(env.effects.burst({x:50,y:50}),0);
});
