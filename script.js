/* Приглашение, полноэкранные сцены и рисование SVG с кончиком пера на canvas. */
(() => {
'use strict';
const body=document.body,proposal=document.getElementById('proposal'),journey=document.getElementById('journey');
const yes=document.getElementById('yes'),no=document.getElementById('no'),note=document.getElementById('playful-note');
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)'),motion=document.getElementById('motion');
let reduced=reducedQuery.matches,accepted=false,moving=false,lastDodge=-1000,noCount=0;
const scenes=[...document.querySelectorAll('.scene')],nav=[...document.querySelectorAll('.chapter-nav a')];
const drawings=new Map();
// Равномерный по фазам пульс: слева → сердце → вправо → мягкое исчезновение.
const pulseSVG=document.getElementById('heart-pulse'),pulseLine=document.getElementById('pulse-line'),pulseTip=document.getElementById('pulse-tip');
let pulseFrame=0,pulseStart=0,pulseWidth=600,pulseLength=0,pulseLead=0,pulseHeartLength=0;
function configurePulse(){
 const width=pulseSVG.getBoundingClientRect().width||innerWidth;
 pulseWidth=width;const c=width/2;
 pulseSVG.setAttribute('viewBox',`0 0 ${width} 110`);
 pulseLine.setAttribute('d',`M-8 94H${c}C${c-15} 80 ${c-47} 49 ${c-37} 29C${c-30} 12 ${c-8} 16 ${c} 38C${c+8} 16 ${c+30} 12 ${c+37} 29C${c+47} 49 ${c+15} 80 ${c} 94H${width+8}`);
 pulseLength=pulseLine.getTotalLength();pulseLead=c+8;pulseHeartLength=pulseLength-width-16;
 pulseLine.style.strokeDasharray=String(pulseLength);
 pulseLine.style.strokeDashoffset=reduced?'0':String(pulseLength);
 pulseLine.style.opacity='1';pulseTip.style.opacity='0';
}
function stopPulse(){cancelAnimationFrame(pulseFrame);pulseFrame=0;pulseTip.style.opacity='0';if(reduced){pulseLine.style.strokeDashoffset='0';pulseLine.style.opacity='1';}}
function pulseDistance(t,lead,heart,total){
 if(t<.26)return lead*t/.26;
 if(t<.70)return lead+heart*(t-.26)/.44;
 if(t<.93)return lead+heart+(total-lead-heart)*(t-.70)/.23;
 return total;
}
function tickPulse(now){
 if(reduced||document.hidden||!accepted||!document.getElementById('together').classList.contains('active')){stopPulse();return;}
 const t=((now-pulseStart)%6400)/6400, distance=pulseDistance(t,pulseLead,pulseHeartLength,pulseLength);
 const opacity=t<.93?1:Math.max(0,1-(t-.93)/.07);
 pulseLine.style.strokeDashoffset=String(pulseLength-distance);pulseLine.style.opacity=String(opacity);
 const point=pulseLine.getPointAtLength(distance);pulseTip.setAttribute('cx',String(point.x));pulseTip.setAttribute('cy',String(point.y));pulseTip.style.opacity=t<.93?String(opacity):'0';
 pulseFrame=requestAnimationFrame(tickPulse);
}
function startPulse(){
 if(pulseFrame)return;configurePulse();if(reduced||document.hidden)return;
 pulseStart=performance.now();pulseFrame=requestAnimationFrame(tickPulse);
}

// Выбираем точку внутри видимой области и вдали от «Да» и заголовка.
function pickPosition(bounds,size,blocked,pointer,random=Math.random){
 const pad=18,minY=85,maxX=Math.max(pad,bounds.width-size.width-pad),maxY=Math.max(minY,bounds.height-size.height-63);
 let best=null,bestScore=-Infinity;
 for(let i=0;i<100;i++){
  const x=pad+random()*(maxX-pad),y=minY+random()*(maxY-minY);
  const overlap=blocked.some(r=>x<r.right+15&&x+size.width>r.left-15&&y<r.bottom+15&&y+size.height>r.top-15);
  const distance=pointer?Math.hypot(x+size.width/2-pointer.x,y+size.height/2-pointer.y):100;
  const score=(overlap?-10000:0)+distance;
  if(score>bestScore){bestScore=score;best={x,y};}
 }
 return best;
}
function dodge(event){
 if(accepted)return;
 const now=performance.now();if(now-lastDodge<120)return;lastDodge=now;
 const box=proposal.getBoundingClientRect(),rect=no.getBoundingClientRect();
 const blocked=[yes,document.getElementById('question')].map(el=>{const r=el.getBoundingClientRect();return{left:r.left-box.left,right:r.right-box.left,top:r.top-box.top,bottom:r.bottom-box.top};});
 const pointer=event&&Number.isFinite(event.clientX)?{x:event.clientX-box.left,y:event.clientY-box.top}:null;
 const bounds={width:box.width,height:Math.min(box.height,innerHeight-box.top)};
 const point=pickPosition(bounds,{width:rect.width,height:rect.height},blocked,pointer);
 if(no.parentElement!==proposal)proposal.append(no);
 no.classList.add('escaped');no.classList.toggle('touch-escape',event?.pointerType==='touch');
 no.style.left=point.x+'px';no.style.top=point.y+'px';noCount++;
 note.textContent=['Кажется, у кнопки «Нет» другие планы…','Ой. Она снова куда-то убежала.','Даже кнопка хочет, чтобы мы пошли вместе.','Поймать её — отдельное приключение ♡'][Math.min(noCount,3)];
}
no.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')dodge(e);});
no.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){e.preventDefault();dodge(e);}});
no.addEventListener('click',e=>{e.preventDefault();dodge(e);});
proposal.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||accepted)return;const r=no.getBoundingClientRect();if(e.clientX>r.left-35&&e.clientX<r.right+35&&e.clientY>r.top-30&&e.clientY<r.bottom+30)dodge(e);},{passive:true});
function stopDrawing(d){if(d.frame)cancelAnimationFrame(d.frame);d.frame=0;if(d.ctx)d.ctx.clearRect(0,0,d.width,d.height);}
function sizeDrawing(d){const rect=d.canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2);d.width=rect.width;d.height=rect.height;d.canvas.width=Math.max(1,Math.round(rect.width*ratio));d.canvas.height=Math.max(1,Math.round(rect.height*ratio));if(d.ctx)d.ctx.setTransform(ratio,0,0,ratio,0,0);}
function drawTip(d,now){
 if(reduced||!d.scene.classList.contains('active')||document.hidden){stopDrawing(d);return;}
 const time=(now-d.started)/1000;d.ctx.clearRect(0,0,d.width,d.height);let pending=false;
 for(const item of d.paths){
  if(time<item.start+item.duration)pending=true;
  if(time<item.start||time>=item.start+item.duration)continue;
  const p=item.el.getPointAtLength(Math.max(0,Math.min(1,(time-item.start)/item.duration))*item.length);
  const matrix=item.el.getScreenCTM();if(!matrix)continue;
  const screen=d.svg.createSVGPoint();screen.x=p.x;screen.y=p.y;const point=screen.matrixTransform(matrix),bounds=d.canvas.getBoundingClientRect();
  const x=point.x-bounds.left,y=point.y-bounds.top;
  d.ctx.beginPath();d.ctx.arc(x,y,3,0,Math.PI*2);d.ctx.fillStyle='rgba(190,133,156,.55)';d.ctx.shadowColor='rgba(224,167,190,.55)';d.ctx.shadowBlur=10;d.ctx.fill();d.ctx.shadowBlur=0;
 }
 if(pending)d.frame=requestAnimationFrame(t=>drawTip(d,t));else stopDrawing(d);
}
function startDrawing(scene,replay=false){
 const d=drawings.get(scene.id);if(!d)return;
 if(replay){stopDrawing(d);scene.classList.remove('drawn');void scene.offsetWidth;}
 if(scene.classList.contains('drawn'))return;
 scene.classList.add('drawn');d.started=performance.now();sizeDrawing(d);
 if(!reduced&&d.ctx)d.frame=requestAnimationFrame(t=>drawTip(d,t));
}
for(const art of document.querySelectorAll('.art')){
 const svg=art.querySelector('svg'),canvas=art.querySelector('canvas'),scene=art.closest('.scene');
 const paths=[...svg.querySelectorAll('.stroke')].map(el=>{let length=0;try{length=el.getTotalLength();}catch{}const start=Number(el.dataset.start||0),duration=Number(el.dataset.duration||1.8);el.style.setProperty('--length',String(length||2000));el.style.setProperty('--delay',start+'s');el.style.setProperty('--duration',duration+'s');return{el,length,start,duration};}).filter(p=>p.length>0);
 drawings.set(scene.id,{svg,canvas,scene,paths,ctx:canvas.getContext('2d'),frame:0,width:0,height:0});
}
function activate(scene){
 scenes.forEach(s=>{s.classList.toggle('active',s===scene);if(s!==scene&&drawings.has(s.id))stopDrawing(drawings.get(s.id));});
 nav.forEach(a=>{if(a.hash==='#'+scene.id)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
 startDrawing(scene);
 if(scene.id==='together')startPulse();else stopPulse();
}
function go(id){const scene=document.getElementById(id);if(!scene)return;journey.scrollTo({top:scene.offsetTop,behavior:reduced?'instant':'smooth'});}
let observer;
if('IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{if(!accepted)return;for(const e of entries)if(e.isIntersecting&&e.intersectionRatio>=.55)activate(e.target);},{root:journey,threshold:[.55,.8]});scenes.forEach(s=>observer.observe(s));}
else journey.addEventListener('scroll',()=>{if(!accepted)return;let scene=scenes.reduce((a,b)=>Math.abs(a.offsetTop-journey.scrollTop)<Math.abs(b.offsetTop-journey.scrollTop)?a:b);activate(scene);},{passive:true});
yes.addEventListener('click',e=>{
 e.preventDefault();if(moving||accepted)return;moving=true;accepted=true;proposal.classList.add('leaving');
 setTimeout(()=>{proposal.hidden=true;journey.hidden=false;journey.scrollTop=0;activate(scenes[0]);document.getElementById('park-title').tabIndex=-1;document.getElementById('park-title').focus({preventScroll:true});document.getElementById('status').textContent='Тогда начнём с парка. Листай вниз, чтобы увидеть весь план.';moving=false;},reduced?0:650);
});
journey.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();if(a.id==='back')return;go(a.hash.slice(1));}));
document.getElementById('back').addEventListener('click',e=>{e.preventDefault();if(moving)return;accepted=false;stopPulse();drawings.forEach(stopDrawing);journey.hidden=true;proposal.hidden=false;proposal.classList.remove('leaving');no.classList.remove('escaped','touch-escape');document.querySelector('.no-slot').append(no);no.style.left='';no.style.top='';yes.focus({preventScroll:true});});
document.querySelectorAll('[data-replay]').forEach(button=>button.addEventListener('click',()=>startDrawing(document.getElementById(button.dataset.replay),true)));
function setMotion(){body.classList.toggle('reduced',reduced);motion.setAttribute('aria-pressed',String(reduced));motion.setAttribute('aria-label',reduced?'Включить анимации':'Приостановить анимации');motion.textContent=reduced?'▷':'Ⅱ';if(reduced){drawings.forEach(stopDrawing);stopPulse();}else if(accepted&&document.getElementById('together').classList.contains('active'))startPulse();}
motion.addEventListener('click',()=>{reduced=!reduced;setMotion();});reducedQuery.addEventListener('change',e=>{reduced=e.matches;setMotion();});
addEventListener('resize',()=>{stopPulse();configurePulse();if(accepted&&document.getElementById('together').classList.contains('active'))startPulse();drawings.forEach(sizeDrawing);if(no.classList.contains('escaped')&&!accepted){lastDodge=-1000;dodge();}},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){drawings.forEach(stopDrawing);stopPulse();}else if(accepted&&document.getElementById('together').classList.contains('active'))startPulse();});
body.classList.add('js');journey.hidden=true;motion.hidden=false;configurePulse();setMotion();
})();
