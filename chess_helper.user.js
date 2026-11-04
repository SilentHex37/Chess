// ==UserScript==
// @name         DonutSurge Chess Helper
// @namespace    https://github.com/SilentHex37/Chess
// @version      0.5.0
// @description  Standalone chess helper panel with optional cached Stockfish.js analysis.
// @match        *://donutsurge.com/games/chess*
// @match        *://*.donutsurge.com/games/chess*
// @grant        GM_getResourceText
// @resource     STOCKFISH https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js@v19.0.1/src/stockfish-19-asm.js
// @require      https://cdn.jsdelivr.net/npm/chess.js@0.13.4/chess.js
// @run-at       document-idle
// ==/UserScript==

/*
 * UI is created before optional libraries are checked, so an unavailable
 * @require can no longer make the entire panel silently disappear. The
 * JavaScript Stockfish.js build is cached by the userscript manager at install
 * or update; it is not downloaded when the analysis button is clicked.
 * Stockfish.js is GPL-3.0: https://github.com/nmrugg/stockfish.js.
 * This script only displays analysis and does not make moves on the site.
 */
(() => {
  'use strict';

  const HOST_ID = 'dsch-helper-host';
  const PANEL_ID = 'dsch-helper-panel';
  if (document.getElementById(HOST_ID)) return;

  // A shadow root prevents DonutSurge's site CSS from hiding or restyling the UI.
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all:initial!important;position:fixed!important;z-index:2147483647!important;top:12px!important;left:12px!important;width:min(460px,calc(100vw - 24px))!important;max-height:calc(100vh - 24px)!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;';
  (document.body || document.documentElement).appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial!important;color-scheme:dark!important}
    #${PANEL_ID}{box-sizing:border-box!important;width:100%!important;max-height:calc(100vh - 24px)!important;overflow:auto!important;padding:12px!important;background:#16132b!important;color:#fff!important;border:1px solid #b9700a!important;border-radius:12px!important;box-shadow:0 12px 36px #0009!important;font:13px Arial,sans-serif!important;display:flex!important;flex-direction:column!important;gap:9px!important;visibility:visible!important;opacity:1!important}
    #${PANEL_ID} *{box-sizing:border-box!important}
    .head{display:grid;place-items:center;min-height:38px;color:#fca31e;font-size:19px;font-weight:800}
    .board-wrap{position:relative;width:min(100%,400px);aspect-ratio:1;margin:0 auto;background:#fca31e;padding:5px;border-radius:9px}
    .board{display:grid;width:100%;height:100%;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);overflow:hidden}
    button{font:inherit!important}.square{position:relative;display:grid;place-items:center;min-width:0;min-height:0;border:0;padding:0;cursor:pointer;font:clamp(23px,7vw,44px)/1 "Segoe UI Symbol","DejaVu Sans",serif!important}
    .light{background:#e9e5da}.dark{background:#26262b}.selected{background:#f7ec74}
    .white-piece{color:#fff;text-shadow:1px 1px 1px #000,-1px -1px 1px #000,1px -1px 1px #000,-1px 1px 1px #000}
    .black-piece{color:#111;text-shadow:1px 1px 1px #fff,-1px -1px 1px #fff,1px -1px 1px #fff,-1px 1px 1px #fff}
    .dot{position:absolute;width:24%;height:24%;border-radius:50%;background:#2e9e4fbb;pointer-events:none}.capture{position:absolute;inset:4%;border:4px solid #2e9e4faa;border-radius:50%;pointer-events:none}
    .arrow{position:absolute;inset:5px;width:calc(100% - 10px);height:calc(100% - 10px);pointer-events:none}
    .controls{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.control{border:0;border-radius:6px;background:#fca31e;color:#fff;padding:9px 5px;font-weight:800;cursor:pointer}.control:hover{background:#fdb445}.control:disabled{opacity:.55;cursor:wait}
    .status,.lines{padding:8px 10px;border-radius:6px;background:#241f45;white-space:pre-wrap;line-height:1.4;min-height:28px}.lines{max-height:130px;overflow:auto;font:12px Consolas,monospace}.disclaimer{text-align:center;color:#bbb;font-size:10px}
    @media(max-height:650px){#${PANEL_ID}{max-height:calc(100vh - 10px)!important;padding:8px!important;gap:6px!important}.board-wrap{width:min(72vh,100%)}}
  `;
  root.appendChild(style);
  const panel = document.createElement('section');
  panel.id = PANEL_ID;
  panel.innerHTML = `<div class="head">CHESS HELPER</div>
    <div class="board-wrap"><div class="board" role="grid" aria-label="Chess board"></div>
      <svg class="arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#2e9e4f"/></marker></defs><line class="arrow-line" stroke="#2e9e4f" stroke-width="2.4" marker-end="url(#arrow-head)" visibility="hidden"/></svg>
    </div><div class="controls"><button class="control analyze">BEST MOVE</button><button class="control undo">UNDO</button><button class="control flip">FLIP</button><button class="control reset">RESET</button></div>
    <div class="status" aria-live="polite">Starting chess helper…</div><div class="lines"></div><div class="disclaimer">Analysis only. No moves are made on DonutSurge.</div>`;
  root.appendChild(panel);

  const $ = (selector) => root.querySelector(selector);
  const statusEl = $('.status'), linesEl = $('.lines'), boardEl = $('.board');
  const analyzeButton = $('.analyze'), arrowLine = $('.arrow-line');
  const files = 'abcdefgh';
  const glyphs = { w: { k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙' }, b: { k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟' } };
  const state = { game:null, flipped:false, selected:null, bestMove:null, worker:null, engineReady:false, waiting:false, fen:'', lines:[], busy:false, timer:null };
  const setStatus = (text) => { statusEl.textContent = text; };

  // Resolve dependency in either the userscript sandbox or page realm.
  let ChessCtor;
  try { ChessCtor = typeof Chess !== 'undefined' ? Chess : window.Chess; } catch (_) { ChessCtor = window.Chess; }
  if (typeof ChessCtor === 'function') {
    try { state.game = new ChessCtor(); }
    catch (error) { console.error('[Chess Helper] chess.js initialization failed:', error); }
  }
  if (!state.game) {
    setStatus('Panel loaded, but chess.js did not. Enable this userscript and allow its @require library, then update/reinstall it.');
    analyzeButton.disabled = true;
    for (const selector of ['.undo', '.flip', '.reset']) $(selector).disabled = true;
    return;
  }

  function drawArrow() {
    if (!state.bestMove) { arrowLine.setAttribute('visibility','hidden'); return; }
    const point = (sq) => { const f=files.indexOf(sq[0]), r=Number(sq[1]); return {x:(state.flipped?7-f:f)*12.5+6.25,y:(state.flipped?r-1:8-r)*12.5+6.25}; };
    const a=point(state.bestMove.from), b=point(state.bestMove.to);
    for (const [k,v] of Object.entries({x1:a.x,y1:a.y,x2:b.x,y2:b.y})) arrowLine.setAttribute(k,String(v));
    arrowLine.setAttribute('visibility','visible');
  }
  function render() {
    boardEl.replaceChildren();
    const board=state.game.board(), legal=state.selected?new Set(state.game.moves({square:state.selected,verbose:true}).map(m=>m.to)):new Set();
    for(let row=0;row<8;row++) for(let col=0;col<8;col++) {
      const fi=state.flipped?7-col:col, ri=state.flipped?7-row:row, sq=`${files[fi]}${8-ri}`, piece=board[ri][fi];
      const cell=document.createElement('button'); cell.type='button'; cell.className=`square ${(row+col)%2?'dark':'light'}`;
      cell.setAttribute('aria-label',`${sq}${piece?` ${piece.color==='w'?'white':'black'} ${piece.type}`:''}`);
      if(state.selected===sq)cell.classList.add('selected');
      if(legal.has(sq)){const hint=document.createElement('span');hint.className=piece?'capture':'dot';cell.appendChild(hint);}
      if(piece){const glyph=document.createElement('span');glyph.textContent=glyphs[piece.color][piece.type];glyph.className=piece.color==='w'?'white-piece':'black-piece';cell.appendChild(glyph);}
      cell.addEventListener('click',()=>onSquareClick(sq)); boardEl.appendChild(cell);
    }
    drawArrow();
  }
  function onSquareClick(sq) {
    if(state.busy)return; state.bestMove=null; linesEl.textContent=''; const piece=state.game.get(sq);
    if(!state.selected) state.selected=piece&&piece.color===state.game.turn()?sq:null;
    else if(state.selected===sq) state.selected=null;
    else { try { const move=state.game.move({from:state.selected,to:sq,promotion:'q'}); if(move){state.selected=null;setStatus(`${state.game.turn()==='w'?'WHITE':'BLACK'} TO MOVE.`);} else state.selected=piece&&piece.color===state.game.turn()?sq:null; } catch(_){state.selected=piece&&piece.color===state.game.turn()?sq:null;} }
    render();
  }
  function scoreText(info) { const mate=info.match(/\bscore mate (-?\d+)/); if(mate)return `M${mate[1]}`; const cp=info.match(/\bscore cp (-?\d+)/);return cp?`${Number(cp[1])>=0?'+':''}${(Number(cp[1])/100).toFixed(2)}`:'—'; }
  function pvToSan(uci) {
    const copy=new ChessCtor(state.fen), result=[];
    for(const token of uci.trim().split(/\s+/).slice(0,6)){const m=token.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);if(!m)break;try{const move=copy.move({from:m[1],to:m[2],promotion:m[3]||'q'});if(!move)break;result.push(move.san);}catch(_){break;}}
    return result.join(' ');
  }
  function finish() { state.busy=false;analyzeButton.disabled=false;if(state.timer)clearTimeout(state.timer);state.timer=null; }
  function onEngineMessage(message) {
    if(message==='uciok'){state.engineReady=true;if(state.waiting){state.waiting=false;state.worker.postMessage('setoption name MultiPV value 3');state.worker.postMessage(`position fen ${state.fen}`);state.worker.postMessage('go movetime 1000');}return;}
    if(message.startsWith('info ')){const pv=message.match(/\bpv\s+(.+)/);if(!pv)return;const n=Number(message.match(/\bmultipv\s+(\d+)/)?.[1]||1);const san=pvToSan(pv[1]);if(san)state.lines[n-1]=`${n}. ${scoreText(message)}  ${san}`;linesEl.textContent=state.lines.filter(Boolean).join('\n');return;}
    if(message.startsWith('bestmove ')){const uci=message.match(/^bestmove\s+(\S+)/)?.[1];if(uci&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)){state.bestMove={from:uci.slice(0,2),to:uci.slice(2,4)};render();setStatus(`BEST MOVE: ${pvToSan(uci)||uci} (${uci})`);}else setStatus('No legal move available.');finish();}
  }
  function makeWorker() {
    if(state.worker)return state.worker;
    if(typeof GM_getResourceText!=='function')throw new Error('Your userscript manager does not support @resource access. Try current Tampermonkey or Violentmonkey.');
    const source=GM_getResourceText('STOCKFISH');
    if(!source||source.length<100000)throw new Error('Cached engine missing. Update/reinstall this userscript with internet access.');
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));state.worker=new Worker(url);
    state.worker.onmessage=e=>onEngineMessage(String(e.data||''));
    state.worker.onerror=e=>{console.error('[Chess Helper] Stockfish worker error:',e.message||e);setStatus('Stockfish worker failed; check console and update the script.');finish();};
    state.worker.postMessage('uci');return state.worker;
  }
  async function analyze() {
    if(state.busy)return;if(state.game.game_over()){setStatus('GAME OVER.');return;}
    state.busy=true;analyzeButton.disabled=true;state.bestMove=null;state.lines=[];state.fen=state.game.fen();linesEl.textContent='';render();setStatus('Preparing Stockfish…');
    try {const worker=makeWorker();if(state.engineReady){worker.postMessage('stop');worker.postMessage('setoption name MultiPV value 3');worker.postMessage(`position fen ${state.fen}`);worker.postMessage('go movetime 1000');}else state.waiting=true;
      state.timer=setTimeout(()=>{if(state.busy){setStatus('Analysis timed out. Try again.');finish();}},90000);
    } catch(error){console.error('[Chess Helper] Engine startup failed:',error);setStatus(`ENGINE ERROR: ${error.message}`);finish();}
  }
  analyzeButton.addEventListener('click',analyze);
  $('.undo').addEventListener('click',()=>{if(state.busy)return;state.game.undo();state.selected=null;state.bestMove=null;linesEl.textContent='';setStatus('MOVE UNDONE.');render();});
  $('.flip').addEventListener('click',()=>{state.flipped=!state.flipped;render();});
  $('.reset').addEventListener('click',()=>{if(state.busy)return;state.game.reset();state.selected=null;state.bestMove=null;linesEl.textContent='';setStatus('CLICK PIECES TO MOVE.');render();});
  setStatus('CLICK PIECES TO MOVE.'); render();
})();
