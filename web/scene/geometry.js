import { cross, normalize, subtract } from './math.js';

export function fruitSurface(theta, phi, fruit='apple') {
  const s=Math.sin(theta),c=Math.cos(theta);
  if(fruit==='lemon') {
    const radius=.81*s*(1+.065*s)*(1+.015*Math.cos(9*phi)*s*s);
    // The small pointed ends make this recognisably a lemon from every angle.
    const y=1.14*c+.18*Math.sign(c)*Math.pow(Math.abs(c),14);
    return [radius*Math.cos(phi),y,radius*Math.sin(phi)];
  }
  const radius=s*(1.02+.11*s+.055*c)*(1+.035*Math.cos(5*phi)*s*s);
  const y=1.12*c-.20*Math.exp(-theta*theta/.10)+.075*Math.exp(-((theta-Math.PI)**2)/.08);
  return [radius*Math.cos(phi),y,radius*Math.sin(phi)];
}

// Skin and cut face are real, permanently present geometry. No clipping trick.
export function createFruitHalf(right, fruit='apple', vertical=48, around=48) {
  const positions=[],normals=[],uvs=[],skin=[],flesh=[];
  const start=right?-Math.PI/2:Math.PI/2;
  function add(p,n,uv){const i=positions.length/3;positions.push(...p);normals.push(...n);uvs.push(...uv);return i;}
  function normal(t,p){
    const u=subtract(fruitSurface(Math.min(Math.PI,t+.0001),p,fruit),fruitSurface(Math.max(0,t-.0001),p,fruit));
    const v=subtract(fruitSurface(t,p+.0001,fruit),fruitSurface(t,p-.0001,fruit));
    return normalize(cross(v,u));
  }
  const top=add(fruitSurface(0,start,fruit),[0,1,0],[.5,0]),rings=[];
  for(let j=1;j<vertical;j++){
    const t=j/vertical*Math.PI,ring=[];
    for(let k=0;k<=around;k++){
      const p=start+k/around*Math.PI;
      ring.push(add(fruitSurface(t,p,fruit),normal(t,p),[(p+Math.PI/2)/(2*Math.PI),t/Math.PI]));
    }rings.push(ring);
  }
  const bottom=add(fruitSurface(Math.PI,start,fruit),[0,-1,0],[.5,1]);
  for(let k=0;k<around;k++)skin.push(top,rings[0][k+1],rings[0][k]);
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<around;k++){
    const a=rings[j][k],b=rings[j+1][k],c=rings[j+1][k+1],d=rings[j][k+1];
    skin.push(a,c,b,a,d,c);
  }
  for(let k=0;k<around;k++)skin.push(rings.at(-1)[k],rings.at(-1)[k+1],bottom);
  const normalCut=[right?-1:1,0,0],center=add([0,0,0],normalCut,[.5,.5]);
  const outline=[top,...rings.map(r=>r[0]),bottom,...[...rings].reverse().map(r=>r[around])];
  const edge=outline.map(i=>{
    const p=positions.slice(i*3,i*3+3);return add(p,normalCut,[p[2]/2.8+.5,.5-p[1]/2.8]);
  });
  for(let i=0;i<edge.length;i++){
    const a=center,b=edge[i],c=edge[(i+1)%edge.length];
    const pa=positions.slice(a*3,a*3+3),pb=positions.slice(b*3,b*3+3),pc=positions.slice(c*3,c*3+3);
    const n=cross(subtract(pb,pa),subtract(pc,pa));
    if(n[0]*normalCut[0]<0)flesh.push(a,c,b);else flesh.push(a,b,c);
  }
  return {positions,normals,uvs,skin,flesh,indices:[...skin,...flesh]};
}

export function createSphere(rows=16,cols=24,seedShape=false) {
  const positions=[],normals=[],uvs=[],indices=[];
  for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){
    const t=j/rows*Math.PI,p=k/cols*Math.PI*2;
    const taper=seedShape?(.82+.18*(1-Math.cos(t))):1;
    const n=[Math.sin(t)*Math.cos(p),Math.cos(t),Math.sin(t)*Math.sin(p)];
    positions.push(n[0]*taper,n[1],n[2]*taper);normals.push(...n);uvs.push(k/cols,j/rows);
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
    const a=j*(cols+1)+k,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);
  }return{positions,normals,uvs,indices};
}

export function createLeaf() {
  const positions=[],normals=[],uvs=[],indices=[],rows=24,cols=8;
  for(let i=0;i<=rows;i++)for(let k=0;k<=cols;k++){
    const t=i/rows,s=k/cols*2-1,w=Math.sin(Math.PI*t)**.8;
    positions.push(t*.72,Math.sin(t*Math.PI)*.14+Math.abs(s)*w*.022,s*w*.20);
    normals.push(0,1,0);uvs.push(t,k/cols);
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
    const a=j*(cols+1)+k,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);
  }return{positions,normals,uvs,indices};
}

export function createStem() {
  const positions=[],normals=[],uvs=[],indices=[],rows=12,cols=12;
  for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){
    const t=j/rows,p=k/cols*Math.PI*2,r=.047*(1-.28*t);
    positions.push(.075*t*t+Math.cos(p)*r,t*.39,Math.sin(p)*r);
    normals.push(Math.cos(p),-.3*t,Math.sin(p));uvs.push(k/cols,t);
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
    const a=j*(cols+1)+k,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);
  }return{positions,normals,uvs,indices};
}

export function createRing() {
  const positions=[],normals=[],uvs=[],indices=[],rows=40,cols=8;
  for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){
    const t=j/rows*Math.PI*2,p=k/cols*Math.PI*2,r=1+Math.cos(p)*.055;
    positions.push(Math.sin(p)*.055,Math.cos(t)*r,Math.sin(t)*r);
    normals.push(Math.sin(p),Math.cos(t)*Math.cos(p),Math.sin(t)*Math.cos(p));uvs.push(j/rows,k/cols);
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
    const a=j*(cols+1)+k,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);
  }return{positions,normals,uvs,indices};
}

export const SEED_POSITIONS=[[-.29,-.10],[.02,-.19],[.29,-.09],[-.17,.16],[.20,.17]];
