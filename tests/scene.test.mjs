import test from 'node:test';
import assert from 'node:assert/strict';
import { createFruitHalf, fruitSurface, SEED_POSITIONS } from '../web/scene/geometry.js';
import { multiply, translate, rotateX, rotateY, scale, inverse, transformPoint, rayTriangle } from '../web/scene/math.js';
import { createAppleScene } from '../web/apple-scene.js';

const close=(a,b,epsilon=1e-5)=>assert.ok(Math.abs(a-b)<epsilon,`${a} should equal ${b}`);

for(const fruit of ['apple','lemon'])for(const right of [false,true]){
  test(`${fruit} ${right?'right':'left'} half is finite, closed and consistently outward`,()=>{
    const m=createFruitHalf(right,fruit),welded=new Map(),ids=[],edges=new Map();
    for(let i=0;i<m.positions.length;i+=3){
      const p=m.positions.slice(i,i+3);assert.ok(p.every(Number.isFinite));
      assert.ok(right?p[0]>-1e-7:p[0]<1e-7);
      const key=p.map(x=>Math.round(x*1e6)).join(',');
      if(!welded.has(key))welded.set(key,welded.size);ids.push(welded.get(key));
      close(Math.hypot(...m.normals.slice(i,i+3)),1);
    }
    for(let i=0;i<m.indices.length;i+=3){
      const tri=m.indices.slice(i,i+3);assert.equal(new Set(tri.map(j=>ids[j])).size,3);
      const [a,b,c]=tri.map(j=>m.positions.slice(j*3,j*3+3));
      const u=b.map((v,j)=>v-a[j]),v=c.map((x,j)=>x-a[j]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const expected=m.normals.slice(tri[0]*3,tri[0]*3+3);
      assert.ok(n.reduce((sum,x,j)=>sum+x*expected[j],0)>0);
      for(let j=0;j<3;j++){
        const pair=[ids[tri[j]],ids[tri[(j+1)%3]]].sort((a,b)=>a-b).join(',');edges.set(pair,(edges.get(pair)||0)+1);
      }
    }
    assert.ok([...edges.values()].every(count=>count===2),'every physical edge belongs to exactly two faces');
    for(const i of m.flesh)close(m.positions[i*3],0);
  });
}

test('lemon and apple have different silhouettes and five stable seed identities',()=>{
  assert.ok(fruitSurface(0,0,'lemon')[1]>fruitSurface(0,0,'apple')[1]+.15);
  assert.ok(fruitSurface(Math.PI/2,0,'apple')[0]>fruitSurface(Math.PI/2,0,'lemon')[0]+.12);
  assert.equal(SEED_POSITIONS.length,5);assert.equal(new Set(SEED_POSITIONS.map(String)).size,5);
});

test('non-uniform seed transforms preserve ray positions through inverse',()=>{
  const m=multiply(translate(-1.2,.03,.4),multiply(rotateY(-1.07),multiply(rotateX(.2),scale(.044,.125,.076))));
  for(const p of [[0,0,0],[1,1,1],[-.2,.7,-.4]]){
    const roundtrip=transformPoint(inverse(m),transformPoint(m,p));roundtrip.forEach((v,i)=>close(v,p[i]));
  }
});

test('occlusion ray checks reject misses and return positive near intersections',()=>{
  close(rayTriangle([0,0,7],[0,0,-1],[-1,-1,0],[1,-1,0],[0,1,0]),7);
  assert.equal(rayTriangle([5,0,7],[0,0,-1],[-1,-1,0],[1,-1,0],[0,1,0]),Infinity);
  assert.equal(rayTriangle([0,0,7],[1,0,0],[-1,-1,0],[1,-1,0],[0,1,0]),Infinity);
});

// Stub GPU calls only: exercise the renderer's real CPU transforms, occlusion and
// picking without pretending this is a browser/shader rendering test.
function pickingFixture(onSeed,inspectCanvas){
  const noop=()=>{};
  const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,p)=>p in o?o[p]:noop,set:(o,p,v)=>(o[p]=v,true)});
  let nextEnum=1;
  const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>({})},
    {get:(o,p)=>{if(p in o)return o[p];if(p.toUpperCase()===p)return o[p]=nextEnum++;return o[p]=()=>({});}});
  const win={requestAnimationFrame:()=>1,cancelAnimationFrame:noop,devicePixelRatio:1,addEventListener:noop,removeEventListener:noop};
  const canvas={getContext:()=>gl,ownerDocument:{defaultView:win,createElement:()=>({getContext:()=>ctx})},
    getBoundingClientRect:()=>({left:10,top:25,width:600,height:500}),addEventListener:noop,removeEventListener:noop,dataset:{}};
  canvas.clientWidth=600;canvas.clientHeight=500;
  const scene=createAppleScene(canvas,{onSeed});inspectCanvas?.(canvas,scene);return scene;
}

test('both fruits expose all five front seeds when open, and no seeds through the back',()=>{
  const hits=[],scene=pickingFixture(id=>hits.push(id));
  assert.ok(scene.getSeedTargets().every(t=>!t.visible));
  for(const fruit of ['apple','lemon']){
    scene.setState({fruit,split:1,yaw:0,pitch:0});
    const targets=scene.getSeedTargets();assert.equal(targets.filter(t=>t.visible).length,5);
    for(const t of targets)assert.equal(scene.pickSeed(t.clientX,t.clientY),t.id);
    scene.setState({yaw:Math.PI});
    for(const t of scene.getSeedTargets()){
      assert.equal(t.visible,false);assert.equal(scene.pickSeed(t.clientX,t.clientY),null);
    }
  }
  assert.deepEqual(hits,[0,1,2,3,4,0,1,2,3,4]);scene.destroy();
});

test('switching fruit clears discovery state and closed fruit cannot be picked',()=>{
  const scene=pickingFixture();scene.setState({split:1,foundSeeds:new Set([0,1,2,3,4])});
  assert.ok(scene.getSeedTargets().every(t=>t.found));scene.setFruit('lemon');
  assert.ok(scene.getSeedTargets().every(t=>!t.found));scene.setState({split:0});
  for(const t of scene.getSeedTargets())assert.equal(scene.pickSeed(t.clientX,t.clientY),null);
  scene.destroy();
});

test('CSS entrance scaling cannot shrink the WebGL drawing buffer',()=>{
 const scene=pickingFixture(undefined,(canvas,renderer)=>{
 canvas.getBoundingClientRect=()=>({left:10,top:25,width:90,height:75});
 renderer.resize();assert.equal(canvas.width,600);assert.equal(canvas.height,500);
 });scene.destroy();
});
