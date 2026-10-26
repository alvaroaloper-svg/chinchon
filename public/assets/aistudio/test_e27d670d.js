// Prueba rápida: node server.js (otra terminal) y luego node test.js
const URL='ws://localhost:'+(process.env.PORT||3000);
const mk=()=>new Promise(r=>{const w=new WebSocket(URL);w.s=null;w.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='state')w.s=m;if(m.t==='err')w.err=m.m;if(m.t==='joined')w.j=m};w.onopen=()=>r(w)});
const sl=ms=>new Promise(r=>setTimeout(r,ms)),ok=(c,t)=>{console.log(c?'OK  ':'FALLA',t);if(!c)process.exitCode=1};
(async()=>{
 const a=await mk(),b=await mk(),c=await mk();
 a.send(JSON.stringify({t:'create',name:'Ana'}));await sl(150);const code=a.j.code;
 ok(/^[A-Z2-9]{6}$/.test(code),'código '+code);
 b.send(JSON.stringify({t:'join',code:'ZZZZZZ',name:'Bea'}));await sl(100);ok(b.err==='Esa partida no existe','código inexistente');
 b.send(JSON.stringify({t:'join',code,name:'Bea'}));await sl(100);
 c.send(JSON.stringify({t:'join',code:code.toLowerCase(),name:'Ana'}));await sl(100);ok(c.err==='Ese nombre ya está en uso','nombre duplicado');
 b.send(JSON.stringify({t:'start'}));await sl(100);ok(b.err&&b.s.phase==='lobby','solo el creador inicia');
 a.send(JSON.stringify({t:'start'}));await sl(150);
 ok(a.s.hand.length===7&&b.s.hand.length===7,'7 cartas cada uno');
 ok(!a.s.hand.some(x=>b.s.hand.includes(x)),'sin cartas duplicadas');
 ok(JSON.stringify(a.s).indexOf(JSON.stringify(b.s.hand))<0,'no se filtran cartas ajenas');
 const [w,l]=a.s.turn===a.s.you?[a,b]:[b,a];
 l.err=0;l.send(JSON.stringify({t:'draw',from:'deck'}));await sl(100);ok(l.err==='No es tu turno','robar fuera de turno rechazado');
 w.send(JSON.stringify({t:'discard',id:w.s.hand[0]}));await sl(100);ok(w.err==='Primero roba una carta','descartar sin robar rechazado');
 w.send(JSON.stringify({t:'draw',from:'deck'}));await sl(100);ok(w.s.hand.length===8,'roba -> 8 cartas');
 w.send(JSON.stringify({t:'discard',id:w.s.hand[0]}));await sl(100);ok(w.s.hand.length===7&&w.s.turn!==w.s.you,'descarta -> 7 cartas y pasa turno');
 console.log('Fin');process.exit();
})();
