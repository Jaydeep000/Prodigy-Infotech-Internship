// script.js
(function () {
    'use strict';

    /* --- Game State --- */
    const state = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        isGameActive: true,
        scores: { x: 0, o: 0, draws: 0 },
        settings: {
            mode: 'pve',       // 'pve' or 'pvp'
            difficulty: 'hard' // 'easy' or 'hard'
        }
    };

    /* --- DOM Elements --- */
    const els = {
        board: document.getElementById('board'),
        cells: Array.from(document.querySelectorAll('.cell')),
        status: document.getElementById('status'),
        subtitle: document.getElementById('game-subtitle'),
        scores: {
            x: document.getElementById('x-score'),
            o: document.getElementById('o-score'),
            draw: document.getElementById('draw-score')
        },
        controls: {
            resetGame: document.getElementById('reset-game'),
            resetScores: document.getElementById('reset-scores'),
            modeRadios: document.querySelectorAll('input[name="gamemode"]'),
            diffSelect: document.getElementById('difficulty-select'),
            diffBox: document.getElementById('difficulty-box')
        },
        winLineSvg: document.querySelector('.win-line .line')
    };

    /* --- Winning Coordinates (for SVG) --- */
    // Based on a 300x300 viewBox. Cell centers are approx 50, 150, 250.
    const winCombos = [
        { indices: [0, 1, 2], coords: [10, 50, 290, 50] },    // Row 1
        { indices: [3, 4, 5], coords: [10, 150, 290, 150] },  // Row 2
        { indices: [6, 7, 8], coords: [10, 250, 290, 250] },  // Row 3
        { indices: [0, 3, 6], coords: [50, 10, 50, 290] },    // Col 1
        { indices: [1, 4, 7], coords: [150, 10, 150, 290] },  // Col 2
        { indices: [2, 5, 8], coords: [250, 10, 250, 290] },  // Col 3
        { indices: [0, 4, 8], coords: [10, 10, 290, 290] },   // Diagonal 1
        { indices: [2, 4, 6], coords: [290, 10, 10, 290] }    // Diagonal 2
    ];

    /* --- Audio Context (Simple Synth) --- */
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;
        if (type === 'move') {
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'win') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    }

    /* --- Game Logic --- */
    function init() {
        // Event Listeners
        els.cells.forEach(cell => cell.addEventListener('click', handleCellClick));
        els.controls.resetGame.addEventListener('click', resetGame);
        els.controls.resetScores.addEventListener('click', resetScores);
        
        // Mode Switching
        els.controls.modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                state.settings.mode = e.target.value;
                updateDiffVisibility();
                resetGame();
            });
        });

        // Difficulty Switching
        els.controls.diffSelect.addEventListener('change', (e) => {
            state.settings.difficulty = e.target.value;
            resetGame();
        });

        resetGame();
    }

    function updateDiffVisibility() {
        // Only show difficulty dropdown if in PvE mode
        if (state.settings.mode === 'pve') {
            els.controls.diffBox.style.display = 'flex';
        } else {
            els.controls.diffBox.style.display = 'none';
        }
    }

    function handleCellClick(e) {
        const index = parseInt(e.target.dataset.index);

        if (state.board[index] !== null || !state.isGameActive) return;
        
        // In PvE, disable clicking if it's AI's turn (rare edge case)
        if (state.settings.mode === 'pve' && state.currentPlayer === 'O') return;

        makeMove(index);
    }

    function makeMove(index) {
        state.board[index] = state.currentPlayer;
        const cell = els.cells[index];
        cell.classList.add(state.currentPlayer.toLowerCase());
        cell.textContent = state.currentPlayer;
        cell.setAttribute('aria-pressed', 'true');
        playSound('move');

        if (checkWin()) {
            endGame(false);
        } else if (checkDraw()) {
            endGame(true);
        } else {
            swapTurn();
        }
    }

    function swapTurn() {
        state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
        els.status.textContent = `Player ${state.currentPlayer}'s Turn`;

        // If PvE and it's now O's turn, trigger AI
        if (state.settings.mode === 'pve' && state.currentPlayer === 'O' && state.isGameActive) {
            // Small delay for realism
            setTimeout(makeAiMove, 500);
        }
    }

    function checkWin() {
        const board = state.board;
        const p = state.currentPlayer;

        const win = winCombos.find(combo => {
            return combo.indices.every(i => board[i] === p);
        });

        if (win) {
            drawWinLine(win.coords);
            return true;
        }
        return false;
    }

    function checkDraw() {
        return state.board.every(cell => cell !== null);
    }

    function endGame(isDraw) {
        state.isGameActive = false;
        let message = "";

        if (isDraw) {
            message = "It's a Draw!";
            els.status.textContent = message;
            state.scores.draws++;
            els.scores.draw.textContent = state.scores.draws;
        } else {
            playSound('win');
            message = `Player ${state.currentPlayer} Wins!`;
            els.status.textContent = message;
            if (state.currentPlayer === 'X') {
                state.scores.x++;
                els.scores.x.textContent = state.scores.x;
            } else {
                state.scores.o++;
                els.scores.o.textContent = state.scores.o;
            }
        }

        // --- UPDATED LOGIC: Alert Result & Refresh ---
        // 1. Wait 500ms so user sees the win
        // 2. Show alert (SMS)
        // 3. Reset game immediately after alert is closed
        setTimeout(() => {
            alert(message);
            resetGame();
        }, 500);
    }

    function resetGame() {
        state.board.fill(null);
        state.currentPlayer = 'X';
        state.isGameActive = true;
        
        // Reset UI
        els.cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell'; // remove x/o classes
            cell.removeAttribute('aria-pressed');
        });
        
        els.status.textContent = "Player X's Turn";
        
        // Hide Line
        els.winLineSvg.classList.remove('active');
        
        // If mode is PvE, update subtitle
        if (state.settings.mode === 'pve') {
            els.subtitle.textContent = `Playing vs AI (${state.settings.difficulty})`;
        } else {
            els.subtitle.textContent = "Player vs Player";
        }
    }

    function resetScores() {
        state.scores.x = 0;
        state.scores.o = 0;
        state.scores.draws = 0;
        els.scores.x.textContent = '0';
        els.scores.o.textContent = '0';
        els.scores.draw.textContent = '0';
    }

    function drawWinLine(coords) {
        const [x1, y1, x2, y2] = coords;
        els.winLineSvg.setAttribute('x1', x1);
        els.winLineSvg.setAttribute('y1', y1);
        els.winLineSvg.setAttribute('x2', x2);
        els.winLineSvg.setAttribute('y2', y2);
        els.winLineSvg.classList.add('active');
    }

    /* --- AI Logic --- */
    function makeAiMove() {
        if (!state.isGameActive) return;

        let moveIndex;

        if (state.settings.difficulty === 'easy') {
            moveIndex = getRandomMove();
        } else {
            // Hard - use Minimax
            moveIndex = getBestMove();
        }

        makeMove(moveIndex);
    }

    function getRandomMove() {
        const avail = state.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        return avail[Math.floor(Math.random() * avail.length)];
    }

    function getBestMove() {
        // AI is 'O' (Maximizer), Player is 'X' (Minimizer)
        let bestScore = -Infinity;
        let move = -1;

        for (let i = 0; i < 9; i++) {
            if (state.board[i] === null) {
                state.board[i] = 'O';
                let score = minimax(state.board, 0, false);
                state.board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    const scoresMap = {
        'O': 10,
        'X': -10,
        'tie': 0
    };

    function minimax(board, depth, isMaximizing) {
        let result = checkWinnerSim(board);
        if (result !== null) {
            return scoresMap[result];
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'O';
                    let score = minimax(board, depth + 1, false);
                    board[i] = null;
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === null) {
                    board[i] = 'X';
                    let score = minimax(board, depth + 1, true);
                    board[i] = null;
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    function checkWinnerSim(board) {
        // Helper for Minimax to check state without altering global state
        const wins = [
            [0,1,2], [3,4,5], [6,7,8],
            [0,3,6], [1,4,7], [2,5,8],
            [0,4,8], [2,4,6]
        ];

        for (let i = 0; i < wins.length; i++) {
            const [a, b, c] = wins[i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        
        if (board.every(cell => cell !== null)) return 'tie';
        return null;
    }

    // Start App
    init();
})();