// 오로라가 비치는 밤바다 배경 (WebGL).
// Aurora Tide(epic3/v3.glsl)의 방식을 폰에 맞게 줄여 재사용:
//  - 오로라: 하늘 위 여러 높이의 얇은 막을 겹쳐 커튼처럼 보이게 (원본 36겹 → 6~16겹)
//  - 바다: exp(sin) 물결을 겹쳐 뾰족한 물마루를 만들고, 물마루에 푸른 발광(바이오루미네선스)
//  - 물은 하늘·오로라를 프레넬 반사로 비춘다 (원본의 광선 행진 대신 평면 교차로 가볍게)
const VERT = 'attribute vec2 p;varying vec2 uv;void main(){uv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';

const frag = (steps, waves) => `
precision highp float;
varying vec2 uv;
uniform vec2 uRes;
uniform float uTime, uCamX, uCamY, uSurge, uPal, uWipe, uHorizon, uFade;
#define STEPS ${steps}
#define WAVES ${waves}
float hs1(float n){return fract(sin(n)*43758.5453123);}
float hs2(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise2(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);
  return mix(mix(hs2(i),hs2(i+vec2(1.0,0.0)),f.x),mix(hs2(i+vec2(0.0,1.0)),hs2(i+vec2(1.0,1.0)),f.x),f.y);}

// 두 세계의 색: k=0 빛의 바다(초록·보라 오로라), k=1 그림자 바다(분홍·남색 오로라)
vec3 palA(float k){return mix(vec3(0.08,1.0,0.42),vec3(1.0,0.22,0.62),k);}
vec3 palB(float k){return mix(vec3(0.55,0.2,0.95),vec3(0.16,0.32,1.0),k);}
vec3 palZen(float k){return mix(vec3(0.004,0.012,0.032),vec3(0.014,0.005,0.034),k);}
vec3 palHor(float k){return mix(vec3(0.03,0.10,0.14),vec3(0.10,0.045,0.16),k);}
vec3 palBio(float k){return mix(vec3(0.04,0.72,1.0),vec3(0.85,0.32,1.0),k);}
vec3 palDeep(float k){return mix(vec3(0.004,0.022,0.04),vec3(0.018,0.008,0.045),k);}

vec3 skyBase(vec3 rd,float k){
  float y=max(rd.y,0.0);
  vec3 col=mix(palHor(k),palZen(k),pow(y,0.42));
  // 수평선 가까이 옅은 빛띠
  col+=palA(k)*0.035*exp(-y*9.0)*(1.0+uSurge);
  return col;
}
vec3 aurora(vec3 rd,float k,float n){
  vec3 acc=vec3(0.0);
  if(rd.y<0.02) return acc;
  float dth=noise2(gl_FragCoord.xy*0.83)*0.6;
  float stp=36.0/n;
  for(int i=0;i<STEPS;i++){
    if(float(i)>=n) break;
    float fi=(float(i)+dth)*stp;
    float hgt=7.0+fi*0.43;
    vec3 pt=rd*(hgt/rd.y);
    pt.x+=uCamX*0.55;
    vec2 q=pt.xz*0.045+vec2(uTime*0.02,uTime*0.012);
    float warp=noise2(q*0.6+3.0)+0.5*noise2(q*1.3+9.0);
    float nl=noise2(q*vec2(1.0,2.2)+warp*1.9);
    float curt=pow(1.0-abs(nl*2.0-1.0),8.0);
    // 넓은 빈틈: 하늘 전체가 뿌옇지 않게, 커튼이 걸린 곳과 어두운 곳이 나뉜다
    curt*=smoothstep(0.24,0.62,noise2(q*0.33+vec2(7.3,uTime*0.008)));
    float rays=0.5+0.5*noise2(vec2((pt.x+pt.z)*0.9,3.0+uTime*0.2));
    vec3 c=mix(palA(k),palB(k),smoothstep(6.0,32.0,fi));
    acc+=c*curt*exp(-fi*0.078)*rays*exp(-length(pt.xz)*0.004);
  }
  return acc*0.085*stp*smoothstep(0.02,0.22,rd.y);
}
vec3 stars(vec3 rd){
  vec2 q=rd.xy/(rd.z+0.4)*46.0;
  vec2 id=floor(q);vec2 f=fract(q)-0.5;
  float h=hs2(id);
  float m=0.0;
  if(h>0.86){
    vec2 o=(vec2(hs2(id+1.3),hs2(id+2.7))-0.5)*0.6;
    m=smoothstep(0.11,0.0,length(f-o));
    m*=(0.35+pow(hs2(id+7.9),5.0)*3.0)*(1.0+0.5*sin(uTime*(1.5+4.0*h)+h*90.0));
  }
  return m*mix(vec3(1.0,0.8,0.62),vec3(0.66,0.8,1.0),hs2(id+5.5));
}
vec3 moonDir(){return normalize(vec3(0.34,0.3,1.0));}
vec3 skyFull(vec3 rd,float k){
  vec3 col=skyBase(rd,k);
  col+=stars(rd)*smoothstep(0.0,0.2,rd.y)*0.9;
  float md=max(dot(rd,moonDir()),0.0);
  col+=vec3(0.95,0.97,1.0)*(smoothstep(0.9987,0.9991,md)*0.9+pow(md,220.0)*0.25+pow(md,18.0)*0.035);
  col+=aurora(rd,k,float(STEPS))*(1.0+uSurge*1.4);
  return col;
}
float waveH(vec2 p,out vec2 grad){
  float h=0.0;float a=1.0;float f=0.42;float w=0.0;float sp=1.15;
  grad=vec2(0.0);
  for(int i=0;i<WAVES;i++){
    float an=(hs1(float(i)*3.71+0.5)-0.5)*2.6+0.5;
    vec2 d=vec2(sin(an),cos(an));
    float ph=dot(p,d)*f+uTime*sp+float(i)*1.7;
    float s=exp(sin(ph)-1.0);
    float ds=s*cos(ph);
    h+=a*s;w+=a;
    grad+=a*ds*f*d;
    p-=d*ds*a*0.55;
    a*=0.78;f*=1.27;sp*=1.07;
  }
  grad/=w;
  return h/w;
}
void main(){
  vec2 p=(uv-0.5)*vec2(uRes.x/uRes.y,1.0)*2.0;
  // 지나간 자리는 다른 세계의 색으로 (화면 뒤바뀜 연출)
  float edge=uWipe*1.5-0.25+0.03*sin(uv.y*17.0+uTime*3.0);
  float passed=smoothstep(edge+0.02,edge-0.06,uv.x)*step(0.001,uWipe);
  float k=mix(uPal,1.0-uPal,passed);
  float hz=(uHorizon-0.5)*2.0;
  vec3 ro=vec3(uCamX*0.12,2.1+uCamY*0.1,0.0);
  vec3 rd=normalize(vec3(p.x,p.y-hz,1.55));
  vec3 col;
  if(rd.y>-0.0005){
    col=skyFull(normalize(vec3(rd.x,max(rd.y,0.0006),rd.z)),k);
  }else{
    float t=ro.y/(-rd.y);
    vec2 pos=ro.xz+rd.xz*t;
    vec2 g;
    float hc=waveH(pos,g);
    float flat_=smoothstep(8.0,140.0,t);
    vec3 n=normalize(vec3(-g.x*2.4*(1.0-flat_*0.85),1.0,-g.y*2.4*(1.0-flat_*0.85)));
    float fres=0.03+0.97*pow(1.0-max(dot(n,-rd),0.0),5.0);
    vec3 R=reflect(rd,n);R.y=abs(R.y)+0.002;R=normalize(R);
    vec3 refl=skyBase(R,k)+aurora(R,k,float(STEPS)*0.5)*(1.0+uSurge*1.4);
    float md=max(dot(R,moonDir()),0.0);
    refl+=vec3(0.9,0.95,1.0)*(pow(md,160.0)*1.6+pow(md,24.0)*0.05);
    vec3 deep=palDeep(k);
    vec3 sss=mix(palA(k),palBio(k),0.5)*0.06*pow(hc,2.0);
    col=mix(deep+sss,refl,fres);
    // 물마루의 푸른 발광
    float crest=smoothstep(0.55,0.92,hc);
    float btex=noise2(pos*2.6+vec2(uTime*0.3,0.0))*0.6+noise2(pos*5.9-vec2(0.0,uTime*0.2))*0.4;
    vec3 bio=palBio(k)*crest*pow(btex,1.6)*5.5;
    vec2 sg=pos*5.0;vec2 si=floor(sg);vec2 sf=fract(sg)-0.5;
    float sh=hs2(si);
    float tw=pow(max(sin(uTime*(1.5+3.0*sh)+sh*40.0),0.0),8.0);
    bio+=mix(palBio(k),vec3(1.0),0.5)*smoothstep(0.16,0.0,length(sf-(vec2(hs2(si+1.7),hs2(si+5.3))-0.5)*0.6))*step(0.62,sh)*tw*smoothstep(0.3,0.8,hc)*6.0*smoothstep(50.0,3.0,t);
    col+=bio*(0.8+uSurge*1.2)*exp(-t*0.02);
    vec3 hor=skyBase(normalize(vec3(rd.x,0.012,rd.z)),k)+palA(k)*0.02;
    col=mix(col,hor,1.0-exp(-t*0.011));
  }
  // 뒤바뀜 경계의 빛줄기
  float band=exp(-pow((uv.x-edge)*16.0,2.0))*step(0.001,uWipe)*(1.0-smoothstep(0.85,1.0,uWipe));
  col+=mix(palA(k),vec3(1.0),0.6)*band*0.9;
  // 톤 정리
  col*=1.55;
  col=clamp((col*(2.51*col+0.03))/(col*(2.43*col+0.59)+0.14),0.0,1.0);
  col=pow(col,vec3(1.0/2.2));
  float l=dot(col,vec3(0.299,0.587,0.114));
  col=mix(vec3(l),col,1.15);
  vec2 dc=uv-0.5;
  col*=1.0-0.42*pow(length(dc*vec2(1.0,0.82))*1.25,2.2);
  col+=(hs2(uv*uRes+fract(uTime*7.13)*100.0)-0.5)*0.022;
  col*=1.0-uFade;
  gl_FragColor=vec4(col,1.0);
}`;

const TIERS = [ // 좋은 폰 → 느린 폰
  { width: 960, steps: 16, waves: 7 },
  { width: 760, steps: 12, waves: 6 },
  { width: 560, steps: 9, waves: 5 },
  { width: 400, steps: 6, waves: 4 },
];

export class Background {
  constructor(canvas) {
    this.canvas = canvas;
    this.tier = 1;
    this.ok = false;
    this.lost = false;
    this.frame = 0;
    this.u = { time: 0, camX: 0, camY: 0, surge: 0, pal: 0, wipe: 0, horizon: 0.5, fade: 0 };
    try {
      this.gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    } catch (e) { this.gl = null; }
    if (!this.gl) return;
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.ok = false; });
    canvas.addEventListener('webglcontextrestored', () => { this.lost = false; this.progs = {}; this._init(); });
    this.progs = {};
    this._init();
  }
  _init() {
    const gl = this.gl;
    this.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.ok = !!this._prog(this.tier);
    if (!this.ok) { // 가장 가벼운 설정으로 한 번 더
      this.tier = TIERS.length - 1;
      this.ok = !!this._prog(this.tier);
    }
  }
  _prog(tier) {
    if (this.progs[tier] !== undefined) return this.progs[tier];
    const gl = this.gl;
    const T = TIERS[tier];
    const mk = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[bg] shader', gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = mk(gl.VERTEX_SHADER, VERT), fs = mk(gl.FRAGMENT_SHADER, frag(T.steps, T.waves));
    if (!vs || !fs) { this.progs[tier] = null; return null; }
    const pr = gl.createProgram();
    gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { console.warn('[bg] link', gl.getProgramInfoLog(pr)); this.progs[tier] = null; return null; }
    const loc = {};
    for (const n of ['uRes', 'uTime', 'uCamX', 'uCamY', 'uSurge', 'uPal', 'uWipe', 'uHorizon', 'uFade']) loc[n] = gl.getUniformLocation(pr, n);
    const p = { pr, loc, a: gl.getAttribLocation(pr, 'p') };
    this.progs[tier] = p;
    return p;
  }
  setTier(t) {
    t = Math.max(0, Math.min(TIERS.length - 1, t));
    if (t === this.tier) return;
    if (this.gl && !this.lost && !this._prog(t)) return;
    this.tier = t;
    this._sized = null;
  }
  resize(cssW, cssH) { this.cssW = cssW; this.cssH = cssH; this._sized = null; }
  draw(skip = 1) {
    if (!this.ok || this.lost) return;
    this.frame++;
    if (skip > 1 && this.frame % skip) return; // 느린 폰에서는 배경을 한 프레임 걸러 그린다
    const gl = this.gl, T = TIERS[this.tier];
    const key = `${this.cssW}x${this.cssH}@${this.tier}`;
    if (this._sized !== key) {
      const w = Math.min(T.width, Math.round(this.cssW * 1.5));
      const h = Math.max(2, Math.round(w * this.cssH / Math.max(1, this.cssW)));
      this.canvas.width = w; this.canvas.height = h;
      this._sized = key;
    }
    const p = this._prog(this.tier);
    if (!p) return;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(p.pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.enableVertexAttribArray(p.a);
    gl.vertexAttribPointer(p.a, 2, gl.FLOAT, false, 0, 0);
    const u = this.u, L = p.loc;
    gl.uniform2f(L.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(L.uTime, u.time % 3600);
    gl.uniform1f(L.uCamX, u.camX); gl.uniform1f(L.uCamY, u.camY);
    gl.uniform1f(L.uSurge, u.surge); gl.uniform1f(L.uPal, u.pal); gl.uniform1f(L.uWipe, u.wipe);
    gl.uniform1f(L.uHorizon, u.horizon); gl.uniform1f(L.uFade, u.fade);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
