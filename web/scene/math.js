// Small column-major transform helpers, kept independent of the browser.
export const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1]
      + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
  }
  return out;
}
export function translate(x=0,y=0,z=0) { const m=identity(); m[12]=x;m[13]=y;m[14]=z;return m; }
export function scale(x=1,y=x,z=x) { const m=identity();m[0]=x;m[5]=y;m[10]=z;return m; }
export function rotateX(a=0) { const m=identity(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m; }
export function rotateY(a=0) { const m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m; }
export function rotateZ(a=0) { const m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m; }
export function transformPoint(m,p,w=1) {
  return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w,
    m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w,
    m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w];
}
export function inverse(m) {
  const a00=m[0],a01=m[1],a02=m[2],a03=m[3],a10=m[4],a11=m[5],a12=m[6],a13=m[7];
  const a20=m[8],a21=m[9],a22=m[10],a23=m[11],a30=m[12],a31=m[13],a32=m[14],a33=m[15];
  const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11;
  const b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30;
  const b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
  const d=1/(b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06);
  return new Float32Array([
    (a11*b11-a12*b10+a13*b09)*d, (a02*b10-a01*b11-a03*b09)*d,
    (a31*b05-a32*b04+a33*b03)*d, (a22*b04-a21*b05-a23*b03)*d,
    (a12*b08-a10*b11-a13*b07)*d, (a00*b11-a02*b08+a03*b07)*d,
    (a32*b02-a30*b05-a33*b01)*d, (a20*b05-a22*b02+a23*b01)*d,
    (a10*b10-a11*b08+a13*b06)*d, (a01*b08-a00*b10-a03*b06)*d,
    (a30*b04-a31*b02+a33*b00)*d, (a21*b02-a20*b04-a23*b00)*d,
    (a11*b07-a10*b09-a12*b06)*d, (a00*b09-a01*b07+a02*b06)*d,
    (a31*b01-a30*b03-a32*b00)*d, (a20*b03-a21*b01+a22*b00)*d
  ]);
}
export function normalMatrix(m) {
  const v=inverse(m); return new Float32Array([v[0],v[4],v[8],v[1],v[5],v[9],v[2],v[6],v[10]]);
}
export function orthographic(left,right,bottom,top,near,far) {
  const m=identity();m[0]=2/(right-left);m[5]=2/(top-bottom);m[10]=-2/(far-near);
  m[12]=-(right+left)/(right-left);m[13]=-(top+bottom)/(top-bottom);m[14]=-(far+near)/(far-near);return m;
}
export function normalize(a) { const l=Math.hypot(...a)||1;return a.map(v=>v/l); }
export function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
export const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);

// Returns a ray parameter, preserving its meaning after affine transforms.
export function rayTriangle(origin, direction, a, b, c) {
  const e1=subtract(b,a),e2=subtract(c,a),h=cross(direction,e2),det=dot(e1,h);
  if (Math.abs(det)<1e-8) return Infinity;
  const inv=1/det,s=subtract(origin,a),u=inv*dot(s,h);
  if(u<0||u>1)return Infinity;
  const q=cross(s,e1),v=inv*dot(direction,q);
  if(v<0||u+v>1)return Infinity;
  const t=inv*dot(e2,q);return t>1e-6?t:Infinity;
}
