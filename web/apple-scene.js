import { createFruitHalf, createSphere, createLeaf, createStem, createRing, SEED_POSITIONS } from './scene/geometry.js';
import { identity, multiply, translate, scale, rotateX, rotateY, rotateZ, inverse, normalMatrix, transformPoint, orthographic } from './scene/math.js';
import { createTextures, VERTEX_SHADER, FRAGMENT_SHADER } from './scene/materials.js';

const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const compose=(...matrices)=>matrices.reduce((a,b)=>multiply(a,b),identity());
const FRUIT_STYLES={
  apple:{skin:0,cut:1,texture:'apple',flesh:'flesh',seed:4,pocket:5,top:.88,stemHeight:1},
  lemon:{skin:9,cut:10,texture:'lemon',flesh:'citrus',seed:11,pocket:12,top:1.10,stemHeight:.50},
  watermelon:{skin:13,cut:14,texture:'watermelon',flesh:'melonFlesh',seed:15,pocket:16},
  orange:{skin:17,cut:18,texture:'orange',flesh:'orangeFlesh',seed:11,pocket:12,top:.97,stemHeight:.47},
  pear:{skin:19,cut:20,texture:'pear',flesh:'pearFlesh',seed:4,pocket:5,top:1.18,stemHeight:.56},
};

/**
 * Offline, dependency-free fruit scene. The controller owns gestures and state.
 * yaw/pitch are radians; split is 0..1; seed IDs are 0..4.
 * pickSeed uses viewport/client coordinates, calls onSeed(id), and returns id/null.
 * Render work happens only when state or canvas dimensions change.
 */
export function createAppleScene(canvas,{onSeed,fruit='apple'}={}) {
  if(!canvas?.getContext)throw new Error('A canvas is required for the fruit explorer.');
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'})
    ||canvas.getContext('experimental-webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)throw new Error('3D is unavailable in this browser. The picture explorer is still available.');
  const win=canvas.ownerDocument.defaultView;
  const state={fruit:Object.hasOwn(FRUIT_STYLES,fruit)?fruit:'apple',yaw:0,pitch:-.08,split:0,foundSeeds:new Set()};
  let destroyed=false,lost=false,frame=0,halfWidth=2,halfHeight=1.6,projectionView=identity();
  let bodies=[],seedTargets=[],items=[],fruitMeshes=[],allMeshes=[];
  const shaders=[],textures=[];

  function shader(type,source){
    const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){
      const detail=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(`The 3D shader could not start: ${detail}`);
    }shaders.push(s);return s;
  }
  const program=gl.createProgram();
  gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX_SHADER));
  gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT_SHADER));gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('The 3D renderer could not start.');
  const attrib={position:gl.getAttribLocation(program,'aPosition'),normal:gl.getAttribLocation(program,'aNormal'),uv:gl.getAttribLocation(program,'aUV')};
  const uniform=Object.fromEntries(['uModel','uProjectionView','uNormalMatrix','uTexture','uMaterial'].map(n=>[n,gl.getUniformLocation(program,n)]));
  gl.useProgram(program);gl.uniform1i(uniform.uTexture,0);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
  const drawn=createTextures(canvas.ownerDocument),textureMap={};
  for(const [name,image] of Object.entries(drawn)){
    const t=gl.createTexture();textures.push(t);textureMap[name]=t;gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }
  function mesh(data,indices=data.indices){
    const buffers=[];
    function buffer(target,values){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(target,b);gl.bufferData(target,values,gl.STATIC_DRAW);return b;}
    const result={
      position:buffer(gl.ARRAY_BUFFER,new Float32Array(data.positions)),
      normal:buffer(gl.ARRAY_BUFFER,new Float32Array(data.normals)),
      uv:buffer(gl.ARRAY_BUFFER,new Float32Array(data.uvs)),
      index:buffer(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices)),count:indices.length,buffers
    };allMeshes.push(result);return result;
  }
  function deleteMesh(m){for(const b of m.buffers)gl.deleteBuffer(b);allMeshes=allMeshes.filter(x=>x!==m);}
  const sphere=mesh(createSphere()),seedMesh=mesh(createSphere(18,24,true)),stem=mesh(createStem()),leaf=mesh(createLeaf()),ring=mesh(createRing());
  const shadow=mesh({positions:[-1,-1,0,1,-1,0,1,1,0,-1,1,0],normals:[0,0,1,0,0,1,0,0,1,0,0,1],uvs:[0,0,1,0,1,1,0,1],indices:[0,1,2,0,2,3]});

  function rebuildFruit(){
    for(const m of fruitMeshes)deleteMesh(m);fruitMeshes=[];bodies=[];
    for(const right of [false,true]){
      const data=createFruitHalf(right,state.fruit),skin=mesh(data,data.skin),cut=mesh(data,data.flesh);
      fruitMeshes.push(skin,cut);bodies.push({right,data,skin,cut,model:identity(),inverse:identity()});
    }
  }
  function buildItems(){
    const root=compose(rotateY(state.yaw),rotateX(state.pitch));items=[];seedTargets=[];
    const style=FRUIT_STYLES[state.fruit];
    for(const body of bodies){
      const direction=body.right?1:-1;
      body.model=compose(root,translate(direction*state.split*1.16,0,0),rotateY(direction*state.split*1.07));
      body.inverse=inverse(body.model);
      items.push({mesh:body.skin,model:body.model,material:style.skin,texture:style.texture});
      items.push({mesh:body.cut,model:body.model,material:style.cut,texture:style.flesh});
      if(body.right&&style.stemHeight){
        const small=state.fruit!=='apple',top=style.top;
        items.push({mesh:stem,model:compose(body.model,translate(.025,top,0),rotateZ(-.12),scale(small?.65:1,style.stemHeight,small?.65:1)),material:2});
        items.push({mesh:leaf,model:compose(body.model,translate(.055,top+(state.fruit==='lemon'?.13:style.stemHeight*.27),0),rotateZ(.30),rotateX(.36),scale(small?.74:1)),material:3});
      }
    }
    for(let id=0;id<5;id++){
      const body=bodies[id<3?0:1],dir=id<3?1:-1,[y,z]=SEED_POSITIONS[id];
      const found=state.foundSeeds.has(id),size=found?1.20:1;
      const pocket=compose(body.model,translate(dir*.009,y,z),rotateX(id%2?.25:-.25),scale(.011,.155,.112));
      items.push({mesh:sphere,model:pocket,material:style.pocket});
      const model=compose(body.model,translate(dir*.040,y,z),rotateX(id%2?.25:-.25),scale(.044*size,.125*size,.076*size));
      items.push({mesh:seedMesh,model,material:found?6:style.seed});
      seedTargets.push({id,model,inverse:inverse(model),center:transformPoint(model,[0,0,0]),found});
      if(found){
        items.push({mesh:ring,model:compose(body.model,translate(dir*.055,y,z),rotateX(id%2?.25:-.25),scale(.17,.18,.14)),material:7});
      }
    }
  }
  function drawItem(item){
    const m=item.mesh;
    gl.bindBuffer(gl.ARRAY_BUFFER,m.position);gl.vertexAttribPointer(attrib.position,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrib.position);
    gl.bindBuffer(gl.ARRAY_BUFFER,m.normal);gl.vertexAttribPointer(attrib.normal,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrib.normal);
    gl.bindBuffer(gl.ARRAY_BUFFER,m.uv);gl.vertexAttribPointer(attrib.uv,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(attrib.uv);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.index);
    gl.uniformMatrix4fv(uniform.uModel,false,item.model);gl.uniformMatrix3fv(uniform.uNormalMatrix,false,normalMatrix(item.model));
    gl.uniform1i(uniform.uMaterial,item.material);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,textureMap[item.texture||'apple']);
    gl.drawElements(gl.TRIANGLES,m.count,gl.UNSIGNED_SHORT,0);
  }
  function camera(){
    const aspect=canvas.width/Math.max(1,canvas.height);
    halfHeight=Math.max(1.72,(1.32+state.split*1.15)/aspect);halfWidth=halfHeight*aspect;
    projectionView=multiply(orthographic(-halfWidth,halfWidth,-halfHeight,halfHeight,.1,20),translate(0,-.10,-7));
  }
  function render(){
    frame=0;if(destroyed||lost)return;
    camera();buildItems();gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
    gl.uniformMatrix4fv(uniform.uProjectionView,false,projectionView);
    // Static soft shadows provide depth without animation or a continuous loop.
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    for(const dir of [-1,1])drawItem({mesh:shadow,model:compose(translate(dir*state.split*.86,-1.13,-1.7),scale(.95,.21,1)),material:8});
    gl.depthMask(true);gl.disable(gl.BLEND);
    for(const item of items)drawItem(item);
  }
  function requestRender(){if(!frame&&!destroyed&&!lost)frame=win.requestAnimationFrame(render);}
  function resize(){
    if(destroyed)return;
    const rect=canvas.getBoundingClientRect(),ratio=Math.min(win.devicePixelRatio||1,2);
    const width=Math.max(1,Math.round((canvas.clientWidth||rect.width)*ratio)),height=Math.max(1,Math.round((canvas.clientHeight||rect.height)*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    requestRender();
  }
  function setState(next={}){
    if(destroyed)return;
    if(next.fruit!==undefined&&Object.hasOwn(FRUIT_STYLES,next.fruit)&&next.fruit!==state.fruit){
      state.fruit=next.fruit;state.foundSeeds=new Set();rebuildFruit();
    }
    if(Number.isFinite(next.yaw))state.yaw=next.yaw%(Math.PI*2);
    if(Number.isFinite(next.pitch))state.pitch=clamp(next.pitch,-1.4,1.4);
    if(Number.isFinite(next.split))state.split=clamp(next.split,0,1);
    if(next.foundSeeds instanceof Set||Array.isArray(next.foundSeeds))state.foundSeeds=new Set([...next.foundSeeds].filter(id=>Number.isInteger(id)&&id>=0&&id<5));
    requestRender();
  }
  function rayFor(clientX,clientY){
    const rect=canvas.getBoundingClientRect();
    return {origin:[((clientX-rect.left)/rect.width*2-1)*halfWidth,(1-(clientY-rect.top)/rect.height*2)*halfHeight+.10,7],direction:[0,0,-1]};
  }
  function sphereHit(target,ray){
    const o=transformPoint(target.inverse,ray.origin),d=transformPoint(target.inverse,ray.direction,0);
    const a=d[0]*d[0]+d[1]*d[1]+d[2]*d[2],b=2*(o[0]*d[0]+o[1]*d[1]+o[2]*d[2]),c=o[0]*o[0]+o[1]*o[1]+o[2]*o[2]-1;
    const disc=b*b-4*a*c;if(disc<0)return Infinity;const t=(-b-Math.sqrt(disc))/(2*a);return t>0?t:Infinity;
  }
  function bodyHit(body,ray,limit){
    const o=transformPoint(body.inverse,ray.origin),d=transformPoint(body.inverse,ray.direction,0),p=body.data.positions,ix=body.data.indices;
    for(let i=0;i<ix.length;i+=3){
      const a=ix[i]*3,b=ix[i+1]*3,c=ix[i+2]*3;
      const ex=p[b]-p[a],ey=p[b+1]-p[a+1],ez=p[b+2]-p[a+2],fx=p[c]-p[a],fy=p[c+1]-p[a+1],fz=p[c+2]-p[a+2];
      const hx=d[1]*fz-d[2]*fy,hy=d[2]*fx-d[0]*fz,hz=d[0]*fy-d[1]*fx,det=ex*hx+ey*hy+ez*hz;
      if(Math.abs(det)<1e-8)continue;
      const inv=1/det,sx=o[0]-p[a],sy=o[1]-p[a+1],sz=o[2]-p[a+2],u=inv*(sx*hx+sy*hy+sz*hz);
      if(u<0||u>1)continue;
      const qx=sy*ez-sz*ey,qy=sz*ex-sx*ez,qz=sx*ey-sy*ex,v=inv*(d[0]*qx+d[1]*qy+d[2]*qz);
      if(v<0||u+v>1)continue;
      const t=inv*(fx*qx+fy*qy+fz*qz);if(t>0&&t<limit)return true;
    }return false;
  }
  function unobscured(ray,t){return !bodies.some(b=>bodyHit(b,ray,t-.012));}
  function projected(target){
    const rect=canvas.getBoundingClientRect(),p=target.center;
    const clientX=rect.left+(p[0]/halfWidth+1)*rect.width/2,clientY=rect.top+(1-(p[1]-.10)/halfHeight)*rect.height/2;
    const ray=rayFor(clientX,clientY),t=sphereHit(target,ray);
    return{id:target.id,clientX,clientY,x:clientX-rect.left,y:clientY-rect.top,visible:state.split>.12&&Number.isFinite(t)&&unobscured(ray,t),found:target.found};
  }
  function getSeedTargets(){if(frame){win.cancelAnimationFrame(frame);render();}return seedTargets.map(projected);}
  function pickSeed(clientX,clientY){
    if(destroyed||lost||state.split<=.12||!Number.isFinite(clientX)||!Number.isFinite(clientY))return null;
    if(frame){win.cancelAnimationFrame(frame);render();}
    const ray=rayFor(clientX,clientY),candidates=[];
    for(const target of seedTargets){
      const t=sphereHit(target,ray);
      if(Number.isFinite(t)&&unobscured(ray,t))candidates.push({id:target.id,distance:0,depth:t});
    }
    // A small touch allowance helps little fingers; hidden seeds remain unpickable.
    if(!candidates.length)for(const target of seedTargets){
      const p=projected(target),distance=Math.hypot(clientX-p.clientX,clientY-p.clientY);
      if(p.visible&&distance<=21)candidates.push({id:target.id,distance,depth:7-target.center[2]});
    }
    candidates.sort((a,b)=>a.distance-b.distance||a.depth-b.depth);
    const id=candidates[0]?.id??null;if(id!==null&&typeof onSeed==='function')onSeed(id);return id;
  }
  function contextLost(event){event.preventDefault();lost=true;canvas.dataset.rendererStatus='unavailable';}
  canvas.addEventListener('webglcontextlost',contextLost);
  const observer=typeof win.ResizeObserver==='function'?new win.ResizeObserver(resize):null;
  observer?.observe(canvas);win.addEventListener('resize',resize,{passive:true});
  rebuildFruit();resize();if(frame)win.cancelAnimationFrame(frame);render();canvas.dataset.rendererStatus='ready';
  return {
    setState,setFruit(next){setState({fruit:next});},resize,pickSeed,getSeedTargets,
    destroy(){
      if(destroyed)return;destroyed=true;if(frame)win.cancelAnimationFrame(frame);observer?.disconnect();
      win.removeEventListener('resize',resize);canvas.removeEventListener('webglcontextlost',contextLost);
      for(const m of [...allMeshes])deleteMesh(m);for(const t of textures)gl.deleteTexture(t);
      for(const s of shaders)gl.deleteShader(s);gl.deleteProgram(program);canvas.dataset.rendererStatus='destroyed';
    }
  };
}

export default createAppleScene;
