// All textures are original, deterministic drawings. No image fetches or trackers.
export function createTextures(document) {
  let seed=314159;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const make=(width,height)=>{const c=document.createElement('canvas');c.width=width;c.height=height;return[c,c.getContext('2d')];};
  const [apple,ac]=make(1024,512);
  // Painted characters: flat colour, a cream brush mark and a tiny smile.
  function paintCharacter(ctx,blush){
    ctx.strokeStyle='#fff6cd';ctx.lineWidth=18;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(432,190);ctx.quadraticCurveTo(441,153,474,149);ctx.stroke();
    ctx.fillStyle=blush;
    for(const x of [458,566]){ctx.beginPath();ctx.ellipse(x,286,17,9,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle='#3c5037';
    for(const x of [482,542]){ctx.beginPath();ctx.ellipse(x,267,6,9,0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#3c5037';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(512,284,16,.18,Math.PI-.18);ctx.stroke();
  }
  function paintFruit(ctx,colour,blush){
    ctx.fillStyle=colour;ctx.fillRect(0,0,1024,512);paintCharacter(ctx,blush);
  }
  paintFruit(ac,'#ed8b74','#f5b69c');
  const [flesh,fc]=make(768,768);fc.fillStyle='#f7e9c8';fc.fillRect(0,0,768,768);
  const wash=fc.createRadialGradient(384,380,20,384,380,400);
  wash.addColorStop(0,'rgba(224,199,145,.30)');wash.addColorStop(.66,'rgba(255,255,238,.12)');wash.addColorStop(1,'rgba(233,202,142,.24)');
  fc.fillStyle=wash;fc.fillRect(0,0,768,768);
  fc.fillStyle='rgba(191,158,93,.20)';fc.beginPath();fc.moveTo(384,112);
  fc.bezierCurveTo(307,270,314,510,384,657);fc.bezierCurveTo(452,510,462,270,384,112);fc.fill();
  for(let i=0;i<50;i++){
    const dx=random()*64-32;fc.strokeStyle=`rgba(133,103,53,${.025+random()*.045})`;
    fc.lineWidth=.5+random();fc.beginPath();fc.moveTo(384+dx*.15,127);
    fc.bezierCurveTo(384+dx,300,384+dx,480,384+dx*.15,641);fc.stroke();
  }
  const [lemon,lc]=make(1024,512);paintFruit(lc,'#f5d968','#efba83');
  const [citrus,cc]=make(768,768);cc.fillStyle='#fff7d2';cc.fillRect(0,0,768,768);
  cc.save();cc.translate(384,384);cc.scale(.95/1.4,1.12/1.4);
  const circle=(r,color)=>{cc.beginPath();cc.arc(0,0,r,0,Math.PI*2);cc.fillStyle=color;cc.fill();};
  // Leave a clear ivory pith band between the yellow peel and juicy segments.
  circle(386,'#e9bd23');circle(375,'#fffcef');circle(326,'#f9d759');
  for(let s=0;s<10;s++){
    const a=s/10*Math.PI*2+.035,b=(s+1)/10*Math.PI*2-.035;
    cc.beginPath();cc.moveTo(Math.cos(a)*39,Math.sin(a)*39);
    cc.arc(0,0,314,a,b);cc.lineTo(Math.cos(b)*39,Math.sin(b)*39);cc.closePath();
    const gradient=cc.createRadialGradient(0,0,30,0,0,325);
    gradient.addColorStop(0,s%2?'#f9df83':'#ffe896');gradient.addColorStop(.68,s%2?'#f4cb43':'#f8d65c');gradient.addColorStop(1,'#fff1b1');
    cc.fillStyle=gradient;cc.fill();cc.strokeStyle='rgba(255,251,221,.85)';cc.lineWidth=8;cc.stroke();
    // Fine juice-vesicle threads, each confined to its own wedge.
    cc.save();cc.clip();
    cc.restore();
  }
  circle(33,'#fff7d6');cc.restore();
  const [watermelon,wc]=make(1024,512);
  wc.fillStyle='#9ac87c';wc.fillRect(0,0,1024,512);
  // Wobbly painted stripes run from end to end. Their edges stay soft and
  // simple so the melon belongs to the same illustrated family as its friends.
  wc.fillStyle='#528b5c';
  for(let stripe=-1;stripe<11;stripe++){
    const center=stripe*102.4;
    wc.beginPath();
    for(let y=0;y<=512;y+=8){
      const wave=Math.sin(y/69+stripe*.61)*7+Math.sin(y/31+stripe)*2;
      const width=13+Math.sin(y/512*Math.PI)*8;
      const x=center+wave-width;
      if(y===0)wc.moveTo(x,y);else wc.lineTo(x,y);
    }
    for(let y=512;y>=0;y-=8){
      const wave=Math.sin(y/69+stripe*.61)*7+Math.sin(y/31+stripe)*2;
      const width=13+Math.sin(y/512*Math.PI)*8;
      wc.lineTo(center+wave+width,y);
    }
    wc.closePath();wc.fill();
  }
  paintCharacter(wc,'#d1df94');
  const [melonFlesh,mc]=make(768,768);
  mc.fillStyle='#91bd73';mc.fillRect(0,0,768,768);
  mc.save();mc.translate(384,384);mc.scale(1.09/1.4,1.02/1.4);
  const melonCircle=(r,color)=>{mc.beginPath();mc.arc(0,0,r,0,Math.PI*2);mc.fillStyle=color;mc.fill();};
  melonCircle(386,'#7cab63');melonCircle(371,'#f2efd1');melonCircle(340,'#ed8c8b');
  // A gentle watermelon-pink wash, with no glossy highlight or baked-in seeds:
  // the five seeds are separate objects that children can discover by touch.
  melonCircle(325,'#f29a96');
  mc.strokeStyle='#f9b3a8';mc.lineWidth=7;mc.lineCap='round';
  for(const [angle,radius] of [[-.9,240],[.6,210],[2.4,250]]){
    mc.beginPath();mc.arc(0,0,radius,angle,angle+.35);mc.stroke();
  }
  mc.restore();
  return {apple,flesh,lemon,citrus,watermelon,melonFlesh};
}

export const VERTEX_SHADER=`
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;
uniform mat4 uModel;
uniform mat4 uProjectionView;
uniform mat3 uNormalMatrix;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUV;
void main(){
  vec4 world=uModel*vec4(aPosition,1.0);
  vWorld=world.xyz;vNormal=normalize(uNormalMatrix*aNormal);vUV=aUV;
  gl_Position=uProjectionView*world;
}`;

export const FRAGMENT_SHADER=`
precision mediump float;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec2 vUV;
uniform sampler2D uTexture;
uniform int uMaterial;
void main(){
  if(uMaterial==8){
    vec2 p=(vUV-.5)*2.0;
    float alpha=exp(-dot(p,p)*3.8)*.20;
    gl_FragColor=vec4(.12,.21,.12,alpha);return;
  }
  vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;
  vec3 L=normalize(vec3(-3.0,4.5,6.0)-vWorld);
  vec3 F=normalize(vec3(4.0,1.0,2.5)-vWorld);
  vec3 V=normalize(vec3(0.0,.12,7.0)-vWorld);
  float key=max(dot(N,L),0.0),fill=max(dot(N,F),0.0);
  vec3 H=normalize(L+V);
  float gloss=pow(max(dot(N,H),0.0),44.0);
  vec3 base;float specular=.10;
  if(uMaterial==0||uMaterial==1||uMaterial==9||uMaterial==10||uMaterial==13||uMaterial==14){base=texture2D(uTexture,vUV).rgb;}
  else if(uMaterial==2){
    float grain=sin(vUV.x*78.0+sin(vUV.y*14.0))*.035;
    base=vec3(.28+grain,.15+grain*.7,.062);specular=.045;
  }else if(uMaterial==3){
    float center=1.0-smoothstep(.010,.032,abs(vUV.y-.5));
    float vein=1.0-smoothstep(.018,.045,abs(fract(vUV.x*9.0-abs(vUV.y-.5)*2.0)-.5));
    base=mix(vec3(.20,.39,.095),vec3(.44,.58,.18),max(center*.65,vein*.28));specular=.08;
  }else if(uMaterial==4){base=vec3(.28,.105,.036);specular=.22;}
  else if(uMaterial==5){base=vec3(.55,.37,.15);specular=.015;}
  else if(uMaterial==6){base=vec3(.77,.40,.055);specular=.26;}
  else if(uMaterial==11){base=vec3(.94,.89,.69);specular=.15;}
  else if(uMaterial==12){base=vec3(.72,.62,.28);specular=.015;}
  else if(uMaterial==15){base=vec3(.22,.25,.19);specular=.015;}
  else if(uMaterial==16){base=vec3(.80,.38,.37);specular=.015;}
  else{base=vec3(1.0,.76,.18);specular=.13;}
  vec3 color=base*(.82+.14*key+.04*fill);specular=.015;
  if(uMaterial==1||uMaterial==10||uMaterial==14){color=base*(.78+.18*key+.07*fill);specular=.025;}
  if(uMaterial==0){color=base*(.93+.07*key);specular=0.0;}
  if(uMaterial==9){color=base*(.93+.07*key);specular=0.0;}
  if(uMaterial==13){color=base*(.93+.07*key);specular=0.0;}
  if(uMaterial==7){color=base*.95;}
  color+=vec3(1.0,.95,.84)*gloss*specular;
  float rim=pow(1.0-max(dot(N,V),0.0),3.0)*max(N.y*.5+.5,0.0);
  // Painted rind keeps the same soft colour at the silhouette.
  gl_FragColor=vec4(color,1.0);
}`;
