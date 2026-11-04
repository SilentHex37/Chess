// ==UserScript==
// @name         DonutSurge Chess Helper
// @namespace    https://github.com/SilentHex37/DonutSurge-Chess-Solver
// @version      0.3.0
// @description  Original-style interactive chess board and local Stockfish analysis panel.
// @match        https://donutsurge.com/games/chess
// @match        https://donutsurge.com/games/chess/*
// @require      https://cdn.jsdelivr.net/npm/chess.js@0.13.4/chess.js
// @grant        GM_xmlhttpRequest
// @connect      github.com
// @connect      objects.githubusercontent.com
// @connect      cdn.jsdelivr.net
// @run-at       document-idle
// ==/UserScript==

/*
 * The interface and chess game run in this userscript. Stockfish 19 ASM-JS is
 * downloaded on first analysis and then cached by the userscript manager. This
 * is a single-JS-file engine (no separate WASM file); embedding the 3 MB engine
 * source literally here is not possible through the GitHub file API used to
 * publish this update. No moves are ever played automatically on DonutSurge.
 * Stockfish.js is GPL-3.0; see https://github.com/nmrugg/stockfish.js.
 */
(function () {
  'use strict';

  if (window.__donutSurgeChessHelperLoaded) return;

  // @require dependencies execute in the userscript manager's sandbox, which
  // may not be the same object as the page's window. Prefer the sandbox global.
  const Stockfish = typeof Chess !== 'undefined' ? Chess : window.Chess;
  if (typeof Stockfish !== 'function') {
    console.error('[Chess Helper] chess.js did not load. Check userscript @require access.');
    return;
  }
  // Set this only after dependencies are verified, so a failed load can retry.
  window.__donutSurgeChessHelperLoaded = true;

  const ENGINE_URL = 'https://cdn.jsdelivr.net/gh/nmrugg/stockfish.js@v19.0.1/src/stockfish-19-asm.js';
  const ID = 'donutsurge-chess-helper';
  const files = 'abcdefgh';
  const glyphs = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  const game = new Stockfish();
  const state = {
    flipped: false, selected: null, bestMove: null, worker: null,
    engineUrl: null, engineReady: false, busy: false, multipv: [],
    waitingFor: null, readyTimer: null, analysisTimer: null,
  };

  const style = document.createElement('style');
  style.textContent = `
    #${ID}{position:fixed;z-index:2147483647;inset:12px auto 12px 12px;width:min(460px,calc(100vw - 24px));
      box-sizing:border-box;padding:12px;background:#16132b;color:#fff;border:1px solid #b9700a;border-radius:12px;
      box-shadow:0 12px 36px #0009;font:13px Arial,sans-serif;display:flex;flex-direction:column;gap:9px;overflow:auto}
    #${ID} *{box-sizing:border-box} #${ID} .ds-head{display:flex;justify-content:center;align-items:center;min-height:44px;
      color:#fca31e;font-size:19px;font-weight:800;letter-spacing:.08em;text-align:center}
    #${ID} .ds-board-wrap{position:relative;width:min(100%,400px);aspect-ratio:1;margin:0 auto;background:#fca31e;padding:5px;border-radius:9px;box-shadow:4px 5px #0b0a18}
    #${ID} .ds-board{display:grid;width:100%;height:100%;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);overflow:hidden;border-radius:4px}
    #${ID} .ds-square{position:relative;display:flex;align-items:center;justify-content:center;border:0;padding:0;cursor:pointer;font:clamp(23px,7vw,44px)/1 "Segoe UI Symbol","DejaVu Sans",serif}
    #${ID} .ds-light{background:#e9e5da} #${ID} .ds-dark{background:#26262b}
    #${ID} .ds-square.ds-selected{background:#f7ec74} #${ID} .ds-piece-white{color:#fff;text-shadow:1px 1px 1px #000,-1px -1px 1px #000,1px -1px 1px #000,-1px 1px 1px #000}
    #${ID} .ds-piece-black{color:#111;text-shadow:1px 1px 1px #fff,-1px -1px 1px #fff,1px -1px 1px #fff,-1px 1px 1px #fff}
    #${ID} .ds-dot{position:absolute;width:24%;height:24%;border-radius:50%;background:#2e9e4fbb;pointer-events:none}
    #${ID} .ds-capture{position:absolute;inset:4%;border:4px solid #2e9e4faa;border-radius:50%;pointer-events:none}
    #${ID} .ds-arrow{position:absolute;inset:5px;width:calc(100% - 10px);height:calc(100% - 10px);pointer-events:none;overflow:visible}
    #${ID} .ds-controls{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    #${ID} button{border:0;border-radius:6px;background:#fca31e;color:white;font-weight:800;padding:9px 5px;cursor:pointer}
    #${ID} button:hover{background:#fdb445} #${ID} button:disabled{opacity:.55;cursor:wait}
    #${ID} .ds-status{min-height:30px;padding:8px 10px;border-radius:6px;background:#241f45;color:#fff;white-space:pre-wrap;line-height:1.35}
    #${ID} .ds-lines{padding:7px 10px;border-radius:6px;background:#241f45;white-space:pre-wrap;line-height:1.5;min-height:28px;max-height:150px;overflow:auto;font:12px Consolas,monospace}
    #${ID} .ds-disclaimer{text-align:center;color:#bbb;font-size:10px;line-height:1.35}
    @media(max-height:650px){#${ID}{inset:5px auto 5px 5px;padding:8px;gap:6px}#${ID} .ds-head{min-height:30px;font-size:16px}#${ID} .ds-board-wrap{width:min(72vh,100%)}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('section');
  panel.id = ID;
  panel.innerHTML = `
    <div class="ds-head">CHESS HELPER</div>
    <div class="ds-board-wrap"><div class="ds-board" role="grid" aria-label="Chess board"></div>
      <svg class="ds-arrow" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs><marker id="ds-arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L7,3 z" fill="#2e9e4f"/></marker></defs>
        <line class="ds-arrow-line" x1="0" y1="0" x2="0" y2="0" stroke="#2e9e4f" stroke-width="2.4" marker-end="url(#ds-arrow-head)" visibility="hidden"/>
      </svg>
    </div>
    <div class="ds-controls">
      <button class="ds-analyze">BEST MOVE</button><button class="ds-undo">UNDO</button>
      <button class="ds-flip">FLIP</button><button class="ds-reset">RESET</button>
    </div>
    <div class="ds-status" aria-live="polite">CLICK PIECES TO MOVE.</div>
    <div class="ds-lines"></div>
    <div class="ds-disclaimer">Analysis is displayed only; this script never makes moves on the site.
      Not affiliated with or endorsed by donutsurge.com.</div>`;
  document.body.appendChild(panel);

  const boardEl = panel.querySelector('.ds-board');
  const statusEl = panel.querySelector('.ds-status');
  const linesEl = panel.querySelector('.ds-lines');
  const analyzeButton = panel.querySelector('.ds-analyze');
  const arrowLine = panel.querySelector('.ds-arrow-line');

  function setStatus(text) { statusEl.textContent = text; }
  function squareName(fileIndex, rankIndex) { return `${files[fileIndex]}${8 - rankIndex}`; }

  function getLegalDestinations(from) {
    const moves = game.moves({ square: from, verbose: true });
    return new Set(moves.map((move) => move.to));
  }

  function render() {
    boardEl.replaceChildren();
    const board = game.board();
    const legal = state.selected ? getLegalDestinations(state.selected) : new Set();
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const fileIndex = state.flipped ? 7 - col : col;
        const rankIndex = state.flipped ? 7 - row : row;
        const square = squareName(fileIndex, rankIndex);
        const piece = board[rankIndex][fileIndex];
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = `ds-square ${(row + col) % 2 ? 'ds-dark' : 'ds-light'}`;
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('aria-label', `${square}${piece ? ` ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`);
        cell.dataset.square = square;
        if (state.selected === square) cell.classList.add('ds-selected');
        if (legal.has(square)) {
          const hint = document.createElement('span');
          hint.className = piece ? 'ds-capture' : 'ds-dot';
          cell.appendChild(hint);
        }
        if (piece) {
          const glyph = document.createElement('span');
          glyph.textContent = glyphs[piece.color][piece.type];
          glyph.className = piece.color === 'w' ? 'ds-piece-white' : 'ds-piece-black';
          cell.appendChild(glyph);
        }
        cell.addEventListener('click', () => onSquareClick(square));
        boardEl.appendChild(cell);
      }
    }
    drawBestMove();
  }

  function drawBestMove() {
    if (!state.bestMove) {
      arrowLine.setAttribute('visibility', 'hidden');
      return;
    }
    const toPoint = (sq) => {
      const f = files.indexOf(sq[0]);
      const r = Number(sq[1]);
      const x = (state.flipped ? 7 - f : f) * 12.5 + 6.25;
      const y = (state.flipped ? r - 1 : 8 - r) * 12.5 + 6.25;
      return { x, y };
    };
    const from = toPoint(state.bestMove.from);
    const to = toPoint(state.bestMove.to);
    arrowLine.setAttribute('x1', String(from.x)); arrowLine.setAttribute('y1', String(from.y));
    arrowLine.setAttribute('x2', String(to.x)); arrowLine.setAttribute('y2', String(to.y));
    arrowLine.setAttribute('visibility', 'visible');
  }

  function onSquareClick(square) {
    if (state.busy) return;
    state.bestMove = null;
    linesEl.textContent = '';
    const clickedPiece = game.get(square);
    if (!state.selected) {
      if (clickedPiece && clickedPiece.color === game.turn()) state.selected = square;
      render();
      return;
    }
    if (state.selected === square) {
      state.selected = null;
      render();
      return;
    }
    const candidate = { from: state.selected, to: square, promotion: 'q' };
    try {
      const move = game.move(candidate);
      if (move) {
        state.selected = null;
        setStatus(`${game.turn() === 'w' ? 'WHITE' : 'BLACK'} TO MOVE.`);
      } else if (clickedPiece && clickedPiece.color === game.turn()) {
        state.selected = square;
      } else {
        state.selected = null;
      }
    } catch (_) {
      state.selected = clickedPiece && clickedPiece.color === game.turn() ? square : null;
    }
    render();
  }

  function scoreText(info) {
    const mate = info.match(/\bscore mate (-?\d+)/);
    if (mate) return `M${mate[1]}`;
    const cp = info.match(/\bscore cp (-?\d+)/);
    return cp ? `${Number(cp[1]) >= 0 ? '+' : ''}${(Number(cp[1]) / 100).toFixed(2)}` : '—';
  }

  function pvToSan(uciMoves) {
    const copy = new Stockfish(game.fen());
    const result = [];
    for (const token of uciMoves.trim().split(/\s+/).slice(0, 6)) {
      const match = token.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
      if (!match) break;
      try {
        const move = copy.move({ from: match[1], to: match[2], promotion: match[3] || 'q' });
        if (!move) break;
        result.push(move.san);
      } catch (_) { break; }
    }
    return result.join(' ');
  }

  function engineRequest(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET', url, responseType: 'text', timeout: 60000,
        onload: (response) => response.status >= 200 && response.status < 300
          ? resolve(response.responseText)
          : reject(new Error(`Engine download returned HTTP ${response.status}`)),
        onerror: () => reject(new Error('Engine download failed. Check userscript network permissions.')),
        ontimeout: () => reject(new Error('Engine download timed out.')),
      });
    });
  }

  async function createEngine() {
    if (state.worker) return state.worker;
    setStatus('Loading Stockfish 19 engine (first use may take a moment)…');
    const source = await engineRequest(ENGINE_URL);
    state.engineUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    state.worker = new Worker(state.engineUrl);
    state.worker.onmessage = (event) => onEngineMessage(String(event.data || ''));
    state.worker.onerror = (event) => {
      console.error('[Chess Helper] Stockfish worker error:', event.message || event);
      setStatus('Stockfish worker failed. Try refreshing the page.');
      finishAnalysis();
    };
    state.worker.postMessage('uci');
    return state.worker;
  }

  function finishAnalysis() {
    state.busy = false;
    analyzeButton.disabled = false;
    if (state.analysisTimer) clearTimeout(state.analysisTimer);
    state.analysisTimer = null;
  }

  function onEngineMessage(message) {
    if (message === 'uciok') {
      state.engineReady = true;
      if (state.waitingFor === 'uci') {
        state.waitingFor = null;
        state.worker.postMessage('setoption name MultiPV value 3');
        state.worker.postMessage(`position fen ${state.analysisFen}`);
        state.worker.postMessage('go movetime 1200');
      }
      return;
    }
    if (message.startsWith('info ')) {
      const pvMatch = message.match(/\bpv\s+(.+)/);
      if (!pvMatch) return;
      const multipv = Number(message.match(/\bmultipv\s+(\d+)/)?.[1] || 1);
      const depth = Number(message.match(/\bdepth\s+(\d+)/)?.[1] || 0);
      const san = pvToSan(pvMatch[1]);
      if (san) state.multipv[multipv - 1] = `${multipv}. ${scoreText(message)}  ${san}`;
      linesEl.textContent = state.multipv.filter(Boolean).join('\n');
      return;
    }
    if (message.startsWith('bestmove ')) {
      const uci = message.match(/^bestmove\s+(\S+)/)?.[1];
      if (uci && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
        state.bestMove = { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || '' };
        render();
        const san = pvToSan(uci);
        setStatus(`BEST MOVE: ${san || uci}  (${uci})`);
      } else {
        setStatus('No legal move available.');
      }
      finishAnalysis();
    }
  }

  async function analyze() {
    if (state.busy) return;
    if (game.game_over()) {
      setStatus(`GAME OVER: ${game.in_draw() ? 'DRAW' : game.in_checkmate() ? 'CHECKMATE' : 'FINISHED'}`);
      return;
    }
    state.busy = true;
    analyzeButton.disabled = true;
    state.bestMove = null;
    state.multipv = [];
    state.analysisFen = game.fen();
    linesEl.textContent = '';
    render();
    setStatus('Preparing Stockfish…');
    try {
      const worker = await createEngine();
      state.multipv = [];
      if (state.engineReady) {
        worker.postMessage('stop');
        worker.postMessage('setoption name MultiPV value 3');
        worker.postMessage(`position fen ${state.analysisFen}`);
        worker.postMessage('go movetime 1200');
      } else {
        state.waitingFor = 'uci';
      }
      state.analysisTimer = setTimeout(() => {
        if (state.busy) {
          setStatus('Analysis timed out. The engine may be initializing; try again.');
          finishAnalysis();
        }
      }, 90000);
    } catch (error) {
      console.error('[Chess Helper] Could not start Stockfish:', error);
      setStatus(`ENGINE ERROR: ${error.message}`);
      finishAnalysis();
    }
  }

  analyzeButton.addEventListener('click', analyze);
  panel.querySelector('.ds-undo').addEventListener('click', () => {
    if (state.busy) return;
    game.undo(); state.selected = null; state.bestMove = null; linesEl.textContent = '';
    setStatus('MOVE UNDONE.'); render();
  });
  panel.querySelector('.ds-flip').addEventListener('click', () => {
    state.flipped = !state.flipped; render();
  });
  panel.querySelector('.ds-reset').addEventListener('click', () => {
    if (state.busy) return;
    game.reset(); state.selected = null; state.bestMove = null; linesEl.textContent = '';
    setStatus('CLICK PIECES TO MOVE.'); render();
  });

  render();
})();
