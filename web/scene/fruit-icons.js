import { fruitSurface } from './geometry.js';

// The orchard, fruit picker and learning cards share the close-up character.
// Keep these colours in step with the painted textures in materials.js.
const characters={
  lemon:{skin:'#f5d968',blush:'#efba83'},
  apple:{skin:'#ed8b74',blush:'#f5b69c'},
  watermelon:{skin:'#9ac87c',blush:'#d1df94'},
  orange:{skin:'#f3aa63',blush:'#f2bba1'},
  pear:{skin:'#c4d982',blush:'#e9bb99'},
};
const centre={x:25,y:28},size=17.4;
const number=value=>Number(value.toFixed(3));
const point=([x,y])=>`${number(x)},${number(y)}`;
const project=([x,y])=>[centre.x+x*size,centre.y-y*size];
const surface=(fruit,theta,phi)=>project(fruitSurface(theta,phi,fruit));

function silhouette(fruit){
  const points=[];
  for(let i=0;i<=64;i++)points.push(surface(fruit,i/64*Math.PI,0));
  for(let i=63;i>0;i--)points.push(surface(fruit,i/64*Math.PI,Math.PI));
  return `M${points.map(point).join('L')}Z`;
}

// Texture coordinates are projected onto the same front-facing fruit surface,
// so the brush mark, rosy cheeks and smile sit where they do on the model.
function texturePoint(fruit,x,y){
  return surface(fruit,y/512*Math.PI,x/1024*Math.PI*2-Math.PI/2);
}

function characterFace(fruit,blush){
  const brush=[];
  for(let i=0;i<=16;i++){
    const t=i/16,s=1-t;
    brush.push(texturePoint(fruit,s*s*432+2*s*t*441+t*t*474,s*s*190+2*s*t*153+t*t*149));
  }
  const cheeks=[458,566].map(x=>{
    const [cx,cy]=texturePoint(fruit,x,286);
    return `<ellipse cx="${number(cx)}" cy="${number(cy)}" rx="1.7" ry=".8" fill="${blush}"/>`;
  }).join('');
  const eyes=[482,542].map(x=>{
    const [cx,cy]=texturePoint(fruit,x,267);
    return `<ellipse cx="${number(cx)}" cy="${number(cy)}" rx=".72" ry="1.05" fill="#3c5037"/>`;
  }).join('');
  const mouth=[];
  for(let i=0;i<=14;i++){
    const angle=.18+i/14*(Math.PI-.36);
    mouth.push(texturePoint(fruit,512+Math.cos(angle)*16,284+Math.sin(angle)*16));
  }
  return `<path d="M${brush.map(point).join('L')}" fill="none" stroke="#fff6cd" stroke-width="1.7" stroke-linecap="round"/>${cheeks}${eyes}<path d="M${mouth.map(point).join('L')}" fill="none" stroke="#3c5037" stroke-width=".72" stroke-linecap="round"/>`;
}

function stemAndLeaf(fruit){
  if(fruit==='watermelon')return '';
  const top={lemon:1.10,apple:.88,orange:.97,pear:1.18}[fruit];
  const [x,y]=project([.025,top]);
  const height={lemon:3.4,apple:6.3,orange:3.2,pear:3.8}[fruit];
  const small=fruit!=='apple',leafY=y-height+1.2,leafWidth=small?9.8:12.2;
  return `<path d="M${point([x,y+.6])}q-.2,${number(-height*.7)} 1,${number(-height)}" fill="none" stroke="#786044" stroke-width="${small?'1.15':'1.5'}" stroke-linecap="round"/><path d="M${point([x+.8,leafY])}q${number(leafWidth*.38)},-6 ${number(leafWidth)},-3.4q${number(-leafWidth*.32)},-.2 ${number(-leafWidth)},3.4Z" fill="#4d7136"/><path d="M${point([x+1.5,leafY-.35])}q${number(leafWidth*.35)},-2.3 ${number(leafWidth*.7)},-2.5" fill="none" stroke="#7b9458" stroke-width=".55" stroke-linecap="round"/>`;
}

function melonStripes(){
  const paths=[];
  for(let stripe=3;stripe<=7;stripe++){
    const points=[];
    for(const side of [-1,1]){
      for(let i=0;i<=64;i++){
        const t=side===-1?i/64:1-i/64,y=t*512;
        const wave=Math.sin(y/69+stripe*.61)*7+Math.sin(y/31+stripe)*2;
        const width=13+Math.sin(t*Math.PI)*8;
        const u=(stripe*102.4+wave+side*width)/1024;
        points.push(surface('watermelon',t*Math.PI,u*Math.PI*2-Math.PI/2));
      }
    }
    paths.push(`<path d="M${points.map(point).join('L')}Z" fill="#528b5c"/>`);
  }
  return paths.join('');
}

/** SVG symbol contents for a viewBox of "0 0 50 50"; no DOM or external assets. */
export function renderFruitSymbol(fruit){
  if(!Object.hasOwn(characters,fruit))throw new RangeError(`Unknown fruit icon: ${fruit}`);
  const character=characters[fruit];
  return `${stemAndLeaf(fruit)}<path d="${silhouette(fruit)}" fill="${character.skin}"/>${fruit==='watermelon'?melonStripes():''}${characterFace(fruit,character.blush)}`;
}
