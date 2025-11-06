/* Professional Ludo game (HTML/CSS/JS)
   - Draws a board with 52 path positions
   - Implements dice, turn system, capturing, home paths and wins
*/

const board = document.getElementById('board');
const rollDiceBtn = document.getElementById('rollDice');
const diceDisplay = document.getElementById('dice');
const playerNameEl = document.getElementById('player-name');
const messageEl = document.getElementById('message');
const restartBtn = document.getElementById('restart');

const players = ['red', 'blue', 'green', 'yellow'];
let currentPlayer = 0;
let diceValue = 0;

// pieces state: -1 = in yard, 0-51 = on main path, 100+ = inside home path, 200+ = finished
const pieces = {
    red: [{ pos: -1 }, { pos: -1 }, { pos: -1 }, { pos: -1 }],
    blue: [{ pos: -1 }, { pos: -1 }, { pos: -1 }, { pos: -1 }],
    green: [{ pos: -1 }, { pos: -1 }, { pos: -1 }, { pos: -1 }],
    yellow: [{ pos: -1 }, { pos: -1 }, { pos: -1 }, { pos: -1 }]
};

// Visual board constants
const BOARD_SIZE = 640;
const CELL = 44;
const min = CELL;
const max = BOARD_SIZE - CELL - 6;
const center = { x: BOARD_SIZE / 2, y: BOARD_SIZE / 2 };

// generate 52 path positions around a square
const pathPositions = [];
for (let i = 0; i < 52; i++) {
    const sideIndex = Math.floor(i / 13);
    const indexOnSide = i % 13;
    let x = 0, y = 0;
    if (sideIndex === 0) { // top
        x = min + indexOnSide * ((max - min) / 12); y = min;
    } else if (sideIndex === 1) { // right
        x = max; y = min + indexOnSide * ((max - min) / 12);
    } else if (sideIndex === 2) { // bottom
        x = max - indexOnSide * ((max - min) / 12); y = max;
    } else { // left
        x = min; y = max - indexOnSide * ((max - min) / 12);
    }
    pathPositions.push({ x, y });
}

const startIndex = { red: 0, blue: 13, green: 26, yellow: 39 };

// create simple inward home paths (6 cells each)
const homePaths = { red: [], blue: [], green: [], yellow: [] };
for (let i = 0; i < 6; i++) {
    // red: top -> center
    homePaths.red.push({ x: center.x - CELL * 1.5, y: center.y - CELL * 3 + i * CELL });
    // blue: right -> center
    homePaths.blue.push({ x: center.x + CELL * 3 - i * CELL, y: center.y - CELL * 1.5 });
    // green: bottom -> center
    homePaths.green.push({ x: center.x + CELL * 1.5, y: center.y + CELL * 3 - i * CELL });
    // yellow: left -> center
    homePaths.yellow.push({ x: center.x - CELL * 3 + i * CELL, y: center.y + CELL * 1.5 });
}

// DOM storage
const pieceEls = { red: [], blue: [], green: [], yellow: [] };

// draw board cells, homes and center
function renderBoard() {
    board.innerHTML = '';
    // path
    pathPositions.forEach((p, i) => {
        const el = document.createElement('div');
        el.className = 'cell path';
        el.style.left = (p.x - CELL / 2) + 'px';
        el.style.top = (p.y - CELL / 2) + 'px';
        el.dataset.index = i;
        board.appendChild(el);
    });

    // homes (corners)
    const homeSize = CELL * 3 + 6;
    const corners = {
        red: { x: min, y: min },
        blue: { x: max - homeSize + CELL, y: min },
        green: { x: max - homeSize + CELL, y: max - homeSize + CELL },
        yellow: { x: min, y: max - homeSize + CELL }
    };
    Object.keys(corners).forEach(color => {
        const c = corners[color];
        const el = document.createElement('div');
        el.className = 'center-box home ' + color;
        el.style.left = c.x + 'px';
        el.style.top = c.y + 'px';
        el.style.width = homeSize + 'px';
        el.style.height = homeSize + 'px';
        board.appendChild(el);
    });

    // center box
    const centerEl = document.createElement('div');
    centerEl.className = 'center-box';
    board.appendChild(centerEl);
}

function createPieceEl(color, idx) {
    const el = document.createElement('div');
    el.className = `piece ${color}-piece`;
    el.dataset.color = color;
    el.dataset.idx = idx;
    el.style.width = CELL - 10 + 'px';
    el.style.height = CELL - 10 + 'px';
    el.addEventListener('click', onPieceClick);
    board.appendChild(el);
    return el;
}

function renderPieces() {
    // remove existing
    Object.keys(pieceEls).forEach(c => pieceEls[c].forEach(el => el.remove()));
    Object.keys(pieceEls).forEach(c => pieceEls[c] = []);
    players.forEach(color => {
        pieces[color].forEach((p, idx) => {
            const el = createPieceEl(color, idx);
            pieceEls[color].push(el);
            updatePiecePosition(color, idx, false);
        });
    });
}

function updatePiecePosition(color, idx, animate = true) {
    const p = pieces[color][idx];
    const el = pieceEls[color][idx];
    if (!el) return;
    let x = 0, y = 0;
    if (p.pos === -1) {
        // yard corner placement
        const corner = { red: { x: min + 10, y: min + 10 }, blue: { x: max - 120 + 10, y: min + 10 }, green: { x: max - 120 + 10, y: max - 120 + 10 }, yellow: { x: min + 10, y: max - 120 + 10 } }[color];
        const ox = (idx % 2) * (CELL + 6);
        const oy = Math.floor(idx / 2) * (CELL + 6);
        x = corner.x + ox + CELL / 2; y = corner.y + oy + CELL / 2;
    } else if (p.pos >= 0 && p.pos < 52) {
        const pos = pathPositions[p.pos]; x = pos.x + CELL / 2; y = pos.y + CELL / 2;
    } else if (p.pos >= 100 && p.pos < 200) {
        const idxHome = p.pos - 100; const pos = homePaths[color][idxHome]; x = pos.x; y = pos.y;
    } else if (p.pos >= 200) {
        // finished area: small offset inside center
        x = center.x + (idx - 1.5) * 16; y = center.y + 40;
    }
    if (animate) el.style.transform = `translate(${x - CELL / 2}px, ${y - CELL / 2}px)`;
    else { el.style.transition = 'none'; el.style.transform = `translate(${x - CELL / 2}px, ${y - CELL / 2}px)`; void el.offsetWidth; el.style.transition = ''; }
}

function setMessage(text) { messageEl.textContent = text || ''; }

function getMovablePieces(color, dice) {
    const list = [];
    pieces[color].forEach((p, idx) => {
        if (p.pos === -1) {
            if (dice === 6) list.push(idx);
        } else if (p.pos >= 0 && p.pos < 52) {
            const start = startIndex[color];
            const rel = (p.pos - start + 52) % 52;
            const target = rel + dice;
            if (target <= 51) list.push(idx);
            else { // entering home
                const homeStep = target - 52;
                if (homeStep < homePaths[color].length) list.push(idx);
            }
        } else if (p.pos >= 100 && p.pos < 200) {
            const hi = p.pos - 100;
            if (hi + dice <= homePaths[color].length) list.push(idx);
        }
    });
    return list;
}

function onPieceClick(e) {
    const color = e.currentTarget.dataset.color;
    const idx = Number(e.currentTarget.dataset.idx);
    if (players[currentPlayer] !== color) return;
    if (!diceValue) { setMessage('Roll the dice first'); return; }
    const can = getMovablePieces(color, diceValue);
    if (!can.includes(idx)) { setMessage('This piece cannot move'); return; }
    movePiece(color, idx, diceValue);
}

function movePiece(color, idx, dice) {
    const p = pieces[color][idx];
    if (p.pos === -1 && dice === 6) { p.pos = startIndex[color]; }
    else if (p.pos >= 0 && p.pos < 52) {
        const start = startIndex[color];
        const rel = (p.pos - start + 52) % 52;
        const target = rel + dice;
        if (target <= 51) p.pos = (start + target) % 52;
        else {
            const homeIdx = target - 52;
            if (homeIdx < homePaths[color].length) p.pos = 100 + homeIdx;
            else { setMessage('Cannot move (overshoot)'); diceValue = 0; return; }
        }
    } else if (p.pos >= 100 && p.pos < 200) {
        const hi = p.pos - 100; const newHi = hi + dice;
        if (newHi < homePaths[color].length) p.pos = 100 + newHi;
        else if (newHi === homePaths[color].length) p.pos = 200 + idx;
        else { setMessage('Cannot move (overshoot)'); diceValue = 0; return; }
    }

    // update DOM
    updatePiecePosition(color, idx, true);

    // capture others on main path
    if (p.pos >= 0 && p.pos < 52) captureAtPosition(color, p.pos);

    // if rolled 6 -> same player again; otherwise next player
    if (dice === 6) { setMessage('Rolled a 6 — play again'); diceValue = 0; }
    else { diceValue = 0; currentPlayer = (currentPlayer + 1) % 4; playerNameEl.textContent = players[currentPlayer].charAt(0).toUpperCase() + players[currentPlayer].slice(1); setMessage(''); }

    // clear highlights
    Object.values(pieceEls).flat().forEach(el => el.classList.remove('highlight'));

    checkWin(color);
}

function captureAtPosition(color, pos) {
    players.forEach(other => {
        if (other === color) return;
        pieces[other].forEach(p => { if (p.pos === pos) p.pos = -1; });
    });
    // re-render positions
    players.forEach(c => pieces[c].forEach((_, i) => updatePiecePosition(c, i)));
}

function checkWin(color) {
    const finished = pieces[color].filter(p => p.pos >= 200).length;
    if (finished === 4) {
        setMessage(`${color.charAt(0).toUpperCase() + color.slice(1)} wins!`);
        rollDiceBtn.disabled = true;
    }
}

// dice button
rollDiceBtn.addEventListener('click', () => {
    if (rollDiceBtn.disabled) return;
    diceValue = Math.floor(Math.random() * 6) + 1;
    diceDisplay.textContent = diceValue;
    setMessage(`${players[currentPlayer].charAt(0).toUpperCase() + players[currentPlayer].slice(1)} rolled ${diceValue}`);
    const movable = getMovablePieces(players[currentPlayer], diceValue);
    if (movable.length === 0) {
        setMessage('No moves available');
        if (diceValue !== 6) { currentPlayer = (currentPlayer + 1) % 4; playerNameEl.textContent = players[currentPlayer].charAt(0).toUpperCase() + players[currentPlayer].slice(1); }
        diceValue = 0;
    } else {
        // highlight movable pieces
        pieceEls[players[currentPlayer]].forEach((el, i) => { if (movable.includes(i)) el.classList.add('highlight'); else el.classList.remove('highlight'); });
    }
});

// restart
restartBtn.addEventListener('click', () => {
    Object.keys(pieces).forEach(c => pieces[c].forEach(p => p.pos = -1));
    currentPlayer = 0; diceValue = 0; rollDiceBtn.disabled = false; diceDisplay.textContent = '—'; playerNameEl.textContent = 'Red'; setMessage('Game reset');
    renderPieces();
});

// init
renderBoard();
renderPieces();
diceDisplay.textContent = '—';
playerNameEl.textContent = 'Red';
setMessage('Roll a 6 to bring a piece out');