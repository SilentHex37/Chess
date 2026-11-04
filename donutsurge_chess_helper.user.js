// ==UserScript==
// @name         DonutSurge Chess Helper
// @namespace    https://github.com/SilentHex37/DonutSurge-Chess-Solver
// @version      0.4.0
// @description  Interactive chess board with cached Stockfish.js analysis.
// @match        https://donutsurge.com/games/chess
// @match        https://donutsurge.com/games/chess/*
// @require      https://cdn.jsdelivr.net/npm/chess.js@0.13.4/chess.js
// @resource     STOCKFISH https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js@v19.0.1/src/stockfish-19-asm.js
// @grant        GM_getResourceText
// @run-at       document-idle
// ==/UserScript==

/*
 * Uses the JavaScript/ASM-JS build of Stockfish.js, not the native Stockfish
 * executable used by the desktop Python app. The userscript manager fetches and
 * caches the engine resource when this userscript is installed or updated; the
 * engine is read from that local resource when analysis starts, not downloaded
 * on each click. Stockfish.js is GPL-3.0: https://github.com/nmrugg/stockfish.js.
 * No moves are played automatically on DonutSurge.
 */
(function () {
  'use strict';
  if (window.__donutSurgeChessHelperLoaded) return;

  // @require may expose Chess in the userscript sandbox instead of page window.
  const ChessCtor = typeof Chess !== 'undefined' ? Chess : window.Chess;
  if (typeof ChessCtor !== 'function') {
    console.error('[Chess Helper] chess.js did not load. Check userscript @require access.');
    return;
  }
  window.__donutSurgeChessHelperLoaded = true;

  const ID = 'donutsurge-chess-helper';
  const files = 'abcdefgh';
  const glyphs = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  const game = new ChessCtor();
  const state = { flipped: false, selected: null, bestMove: null, worker: null,
    engineReady: false, waitingFor: null, analysisFen: '', multipv: [], busy: false, timer: null };

  const style = document.createElement('style');
  style.textContent = `
    #${ID}{position:fixed;z-index:2147483647;inset:12px auto 12px 12px;width:min(460px,calc(100vw - 24px));
      box-sizing:border-box;padding:12px;background:#16132b;color:#fff;border:1px solid #b9700a;border-radius:12px;
      box-shadow:0 12px 36px #0009;font:13px Arial,sans-serif;display:flex;flex-direction:column;gap:9px;overflow:auto}
    #${ID} *{box-sizing:border-box} #${ID} .ds-head{display:grid;place-items:center;min-height:40px;color:#fca31e;font-size:19px;font-weight:800}
    #${ID} .ds-board-wrap{position:relative;width:min(100%,400px);aspect-ratio:1;margin:auto;background:#fca31e;padding:5px;border-radius:9px}
    #${ID} .ds-board{display:grid;width:100%;height:100%;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);overflow:hidden}
    #${ID} .ds-square{position:relative;display:grid;place-items:center;border:0;padding:0;cursor:pointer;font:clamp(23px,7vw,44px)/1 "Segoe UI Symbol","DejaVu Sans",serif}
    #${ID} .ds-light{background:#e9e5da} #${ID} .ds-dark{background:#26262b} #${ID} .ds-square.ds-selected{background:#f7ec74}
    #${ID} .ds-piece-white{color:#fff;text-shadow:1px 1px 1px #000,-1px -1px 1px #000,1px -1px 1px #000,-1px 1px 1px #000}
    #${ID} .ds-piece-black{color:#111;text-shadow:1px 1px 1px #fff,-1px -1px 1px #fff,1px -1px 1px #fff,-1px 1px 1px #fff}
    #${ID} .ds-dot{position:absolute;width:24%;height:24%;border-radius:50%;background:#2e9e4fbb;pointer-events:none}
    #${ID} .ds-capture{position:absolute;inset:4%;border:4px solid #2e9e4faa;border-radius:50%;pointer-events:none}
    #${ID} .ds-arrow{position:absolute;inset:5px;width:calc(100% - 10px);height:calc(100% - 10px);pointer-events:none}
    #${ID} .ds-controls{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    #${ID} button{border:0;border-radius:6px;background:#fca31e;color:white;font-weight:800;padding:9px 5px;cursor:pointer}
    #${ID} button:hover{background:#fdb445} #${ID} button:disabled{opacity:.55;cursor:wait}
    #${ID} .ds-status,#${ID} .ds-lines{padding:8px 10px;border-radius:6px;background:#241f45;white-space:pre-wrap;line-height:1.4;min-height:28px}
    #${ID} .ds-lines{max-height:150px;overflow:auto;font:12px Consolas,monospace}
    #${ID} .ds-disclaimer{text-align:center;color:#bbb;font-size:10px}
    @media(max-height:650px){#${ID}{inset:5px auto 5px 5px;padding:8px;gap:6px}#${ID} .ds-board-wrap{width:min(72vh,100%)}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('section');
  panel.id = ID;
  panel.innerHTML = `<div class="ds-head">CHESS HELPER</div>
    <div class="ds-board-wrap"><div class="ds-board" role="grid" aria-label="Chess board"></div>
      <svg class="ds-arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id="ds-arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#2e9e4f"/></marker></defs>
        <line class="ds-arrow-line" stroke="#2e9e4f" stroke-width="2.4" marker-end="url(#ds-arrow-head)" visibility="hidden"/>
      </svg>
    </div>
    <div class="ds-controls"><button class="ds-analyze">BEST MOVE</button><button class="ds-undo">UNDO</button>
      <button class="ds-flip">FLIP</button><button class="ds-reset">RESET</button></div>
    <div class="ds-status" aria-live="polite">CLICK PIECES TO MOVE.</div><div class="ds-lines"></div>
    <div class="ds-disclaimer">Analysis only; never affiliated with or endorsed by donutsurge.com.</div>`;
  document.body.appendChild(panel);

  const boardEl = panel.querySelector('.ds-board');
  const statusEl = panel.querySelector('.ds-status');
  const linesEl = panel.querySelector('.ds-lines');
  const analyzeButton = panel.querySelector('.ds-analyze');
  const arrowLine = panel.querySelector('.ds-arrow-line');
  const setStatus = (text) => { statusEl.textContent = text; };

  function drawBestMove() {
    if (!state.bestMove) { arrowLine.setAttribute('visibility', 'hidden'); return; }
    const point = (sq) => {
      const f = files.indexOf(sq[0]), r = Number(sq[1]);
      return { x: (state.flipped ? 7 - f : f) * 12.5 + 6.25,
        y: (state.flipped ? r - 1 : 8 - r) * 12.5 + 6.25 };
    };
    const from = point(state.bestMove.from), to = point(state.bestMove.to);
    for (const [key, value] of Object.entries({ x1: from.x, y1: from.y, x2: to.x, y2: to.y })) arrowLine.setAttribute(key, value);
    arrowLine.setAttribute('visibility', 'visible');
  }

  function render() {
    boardEl.replaceChildren();
    const board = game.board();
    const legal = state.selected ? new Set(game.moves({ square: state.selected, verbose: true }).map((m) => m.to)) : new Set();
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const fi = state.flipped ? 7 - col : col, ri = state.flipped ? 7 - row : row;
      const square = `${files[fi]}${8 - ri}`, piece = board[ri][fi];
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = `ds-square ${(row + col) % 2 ? 'ds-dark' : 'ds-light'}`;
      cell.setAttribute('aria-label', `${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`);
      if (state.selected === square) cell.classList.add('ds-selected');
      if (legal.has(square)) { const hint = document.createElement('span'); hint.className = piece ? 'ds-capture' : 'ds-dot'; cell.appendChild(hint); }
      if (piece) { const glyph = document.createElement('span'); glyph.textContent = glyphs[piece.color][piece.type];
        glyph.className = piece.color === 'w' ? 'ds-piece-white' : 'ds-piece-black'; cell.appendChild(glyph); }
      cell.addEventListener('click', () => onSquareClick(square)); boardEl.appendChild(cell);
    }
    drawBestMove();
  }

  function onSquareClick(square) {
    if (state.busy) return;
    state.bestMove = null; linesEl.textContent = '';
    const piece = game.get(square);
    if (!state.selected) state.selected = piece && piece.color === game.turn() ? square : null;
    else if (state.selected === square) state.selected = null;
    else {
      try {
        const move = game.move({ from: state.selected, to: square, promotion: 'q' });
        if (move) { state.selected = null; setStatus(`${game.turn() === 'w' ? 'WHITE' : 'BLACK'} TO MOVE.`); }
        else state.selected = piece && piece.color === game.turn() ? square : null;
      } catch (_) { state.selected = piece && piece.color === game.turn() ? square : null; }
    }
    render();
  }

  function scoreText(info) {
    const mate = info.match(/\bscore mate (-?\d+)/); if (mate) return `M${mate[1]}`;
    const cp = info.match(/\bscore cp (-?\d+)/);
    return cp ? `${Number(cp[1]) >= 0 ? '+' : ''}${(Number(cp[1]) / 100).toFixed(2)}` : '—';
  }

  function pvToSan(uciMoves) {
    const copy = new ChessCtor(state.analysisFen), result = [];
    for (const token of uciMoves.trim().split(/\s+/).slice(0, 6)) {
      const m = token.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/); if (!m) break;
      try { const move = copy.move({ from: m[1], to: m[2], promotion: m[3] || 'q' }); if (!move) break; result.push(move.san); }
      catch (_) { break; }
    }
    return result.join(' ');
  }

  function finishAnalysis() {
    state.busy = false; analyzeButton.disabled = false;
    if (state.timer) clearTimeout(state.timer); state.timer = null;
  }

  function onEngineMessage(message) {
    if (message === 'uciok') {
      state.engineReady = true;
      if (state.waitingFor === 'uci') {
        state.waitingFor = null;
        state.worker.postMessage('setoption name MultiPV value 3');
        state.worker.postMessage(`position fen ${state.analysisFen}`);
        state.worker.postMessage('go movetime 1000');
      }
      return;
    }
    if (message.startsWith('info ')) {
      const pv = message.match(/\bpv\s+(.+)/); if (!pv) return;
      const n = Number(message.match(/\bmultipv\s+(\d+)/)?.[1] || 1);
      const san = pvToSan(pv[1]);
      if (san) state.multipv[n - 1] = `${n}. ${scoreText(message)}  ${san}`;
      linesEl.textContent = state.multipv.filter(Boolean).join('\n'); return;
    }
    if (message.startsWith('bestmove ')) {
      const uci = message.match(/^bestmove\s+(\S+)/)?.[1];
      if (uci && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
        state.bestMove = { from: uci.slice(0, 2), to: uci.slice(2, 4) }; render();
        setStatus(`BEST MOVE: ${pvToSan(uci) || uci} (${uci})`);
      } else setStatus('No legal move available.');
      finishAnalysis();
    }
  }

  function getCachedEngineSource() {
    try {
      const source = GM_getResourceText('STOCKFISH');
      if (!source || source.length < 100000) throw new Error('The cached Stockfish resource is missing or incomplete.');
      return source;
    } catch (error) {
      throw new Error(`Could not read the cached Stockfish engine. Reinstall/update this userscript in Tampermonkey or Violentmonkey. ${error.message}`);
    }
  }

  function createEngine() {
    if (state.worker) return state.worker;
    setStatus('Starting cached Stockfish.js engine…');
    const source = getCachedEngineSource();
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    state.worker = new Worker(url);
    state.worker.onmessage = (event) => onEngineMessage(String(event.data || ''));
    state.worker.onerror = (event) => {
      console.error('[Chess Helper] Stockfish worker error:', event.message || event);
      setStatus('Stockfish worker failed. Try updating the userscript and refreshing.'); finishAnalysis();
    };
    state.worker.postMessage('uci');
    return state.worker;
  }

  async function analyze() {
    if (state.busy) return;
    if (game.game_over()) { setStatus('GAME OVER.'); return; }
    state.busy = true; analyzeButton.disabled = true; state.bestMove = null;
    state.multipv = []; state.analysisFen = game.fen(); linesEl.textContent = ''; render();
    setStatus('Preparing Stockfish…');
    try {
      const worker = createEngine();
      if (state.engineReady) {
        worker.postMessage('stop'); worker.postMessage('setoption name MultiPV value 3');
        worker.postMessage(`position fen ${state.analysisFen}`); worker.postMessage('go movetime 1000');
      } else state.waitingFor = 'uci';
      state.timer = setTimeout(() => {
        if (state.busy) { setStatus('Analysis timed out. Try again.'); finishAnalysis(); }
      }, 90000);
    } catch (error) {
      console.error('[Chess Helper] Could not start Stockfish:', error);
      setStatus(`ENGINE ERROR: ${error.message}`); finishAnalysis();
    }
  }

  analyzeButton.addEventListener('click', analyze);
  panel.querySelector('.ds-undo').addEventListener('click', () => {
    if (state.busy) return; game.undo(); state.selected = null; state.bestMove = null;
    linesEl.textContent = ''; setStatus('MOVE UNDONE.'); render();
  });
  panel.querySelector('.ds-flip').addEventListener('click', () => { state.flipped = !state.flipped; render(); });
  panel.querySelector('.ds-reset').addEventListener('click', () => {
    if (state.busy) return; game.reset(); state.selected = null; state.bestMove = null;
    linesEl.textContent = ''; setStatus('CLICK PIECES TO MOVE.'); render();
  });
  render();
})();
