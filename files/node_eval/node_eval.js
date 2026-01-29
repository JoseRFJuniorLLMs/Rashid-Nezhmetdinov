var eval_icon_x = 0;
var eval_icon_y = 0;
var eval_icon_size = 2 / 5;
var eval_icon_offset = 1 / 9;
var eval_icon_edge_adj = 1 / 6;

var is_eval_visible = false;
var eval_node = null;
var eval_icon = null;
var last_eval_diff = 0;

var book_moves_cache = null;
var book_moves_cache_node_id = null;

// Trava anti-pisca
var last_popup_node_id = null;

// 🆕 Controle de animação de mate
var mate_animation_running = false;
var mate_animation_timeout_ids = [];

// 🆕 NOVAS IMAGENS PARA SACRIFÍCIOS
var brilliant_img = new Image();
var great_img = new Image();
var sacrifice_queen_img = new Image();
var sacrifice_rook_img = new Image();
var best_img = new Image();
var excellent_img = new Image();
var good_img = new Image();
var inaccuracy_img = new Image();
var mistake_img = new Image();
var blunder_img = new Image();
var winner_img = new Image();
var book_img = new Image();

// Carrega imagens
brilliant_img.src = "node_eval/images/brilliant_256x.png";
great_img.src = "node_eval/images/great_256x.png";
sacrifice_queen_img.src = "node_eval/images/sacrifice_queen_256x.png";
sacrifice_rook_img.src = "node_eval/images/sacrifice_rook_256x.png";
best_img.src = "node_eval/images/best_256x.png";
excellent_img.src = "node_eval/images/excellent_256x.png";
good_img.src = "node_eval/images/good_256x.png";
inaccuracy_img.src = "node_eval/images/inaccuracy_256x.png";
mistake_img.src = "node_eval/images/mistake_256x.png";
blunder_img.src = "node_eval/images/blunder_256x.png";
winner_img.src = "node_eval/images/winner_256x.png";
book_img.src = "node_eval/images/book_256x.png";


// ========================================
// 🆕 SISTEMA DE ABERTURAS - FUNÇÕES NOVAS
// ========================================

let openings_data = {};
let last_opening_shown = null;

// Carrega o JSON de aberturas
fetch('openings.json')
    .then(r => r.json())
    .then(data => {
        openings_data = data;
        console.log('✅ [ABERTURAS] Carregadas:', Object.keys(data).length);
    })
    .catch(e => console.warn('⚠️ Erro ao carregar openings.json:', e));

// Busca abertura pelos lances
function buscar_abertura(lances) {
    if (!lances || !openings_data) return null;
    if (openings_data[lances]) return openings_data[lances];
    
    let melhor = null;
    let tamanho = 0;
    for (let chave in openings_data) {
        if (lances.startsWith(chave) && chave.length > tamanho) {
            melhor = openings_data[chave];
            tamanho = chave.length;
        }
    }
    return melhor;
}

// Mostra popup de abertura
function mostrar_popup_abertura(abertura) {
    let velho = document.querySelector('.popup-abertura');
    if (velho) velho.remove();
    
    let popup = document.createElement('div');
    popup.className = 'popup-abertura';
    popup.innerHTML = `
        <div style="font-size:2em">📖</div>
        <div style="font-size:1.3em;font-weight:bold">${abertura.name}</div>
        <div style="background:#4caf50;color:white;padding:5px 15px;border-radius:20px;margin-top:10px">
            ${abertura.eco || '???'}
        </div>
    `;
    
    popup.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        background: linear-gradient(135deg, #2196f3, #1565c0);
        color: white; padding: 30px; border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        z-index: 99999; text-align: center;
        animation: entrar-abertura 0.4s;
    `;
    
    document.body.appendChild(popup);
    console.log('✅ [POPUP] Abertura:', abertura.name);
    setTimeout(() => popup.remove(), 3000);
}

// CSS para animação
(function() {
    let style = document.createElement('style');
    style.textContent = `@keyframes entrar-abertura { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
    document.head.appendChild(style);
})();

// ========================================

// ===================================
// 🆕 FUNÇÃO: Calcula valor do material
// ===================================
function getMaterialValue(board) {
    let material = 0;
    const pieceValues = {
        'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
    };

    try {
        for (const piece in pieceValues) {
            const positions = board.find(piece);
            if (positions && positions.length) {
                material += positions.length * pieceValues[piece];
            }
        }
    } catch (e) {
        console.warn('Erro ao calcular material:', e);
    }

    return material;
}

// ===================================
// 🆕 ANÁLISE POSICIONAL AVANÇADA
// ===================================
function analyzePositionalFactors(node, parentNode) {
    let factors = {
        controleCentro: 0,
        desenvolvimentoPecas: 0,
        estruturaPeoes: 0,
        atividadePecas: 0,
        segurancaRei: 0,
        linhasAbertas: 0,
        pressaoPosicional: 0,
        score: 0
    };
    
    if (!node || !node.board || !parentNode || !parentNode.board) {
        return factors;
    }
    
    try {
        const board = node.board;
        const parentBoard = parentNode.board;
        const turn = parentBoard.turn; // Quem jogou
        
        // 1️⃣ CONTROLE DO CENTRO (casas d4, e4, d5, e5)
        const centroSquares = ['d4', 'e4', 'd5', 'e5'];
        let controloAntes = 0;
        let controloDepois = 0;
        
        centroSquares.forEach(square => {
            const pecaAntes = parentBoard.piece(square);
            const pecaDepois = board.piece(square);
            
            // Conta peças próprias no centro
            if (pecaAntes && ((turn === 'w' && pecaAntes === pecaAntes.toUpperCase()) || 
                              (turn === 'b' && pecaAntes === pecaAntes.toLowerCase()))) {
                controloAntes++;
            }
            if (pecaDepois && ((turn === 'w' && pecaDepois === pecaDepois.toUpperCase()) || 
                               (turn === 'b' && pecaDepois === pecaDepois.toLowerCase()))) {
                controloDepois++;
            }
        });
        
        factors.controleCentro = controloDepois - controloAntes;
        
        // 2️⃣ DESENVOLVIMENTO (peças fora da casa inicial)
        const desenvolvimentoAntes = countDevelopedPieces(parentBoard, turn);
        const desenvolvimentoDepois = countDevelopedPieces(board, turn);
        factors.desenvolvimentoPecas = desenvolvimentoDepois - desenvolvimentoAntes;
        
        // 3️⃣ ESTRUTURA DE PEÕES (ilhas de peões, peões duplicados, isolados)
        factors.estruturaPeoes = analyzePawnStructure(board, turn) - analyzePawnStructure(parentBoard, turn);
        
        // 4️⃣ ATIVIDADE DAS PEÇAS (mobilidade)
        const mobilidadeAntes = parentBoard.movegen().length;
        const mobilidadeDepois = board.movegen().length;
        factors.atividadePecas = (turn === 'w') ? (mobilidadeDepois - mobilidadeAntes) : (mobilidadeAntes - mobilidadeDepois);
        
        // 5️⃣ SEGURANÇA DO REI (peões na frente do rei)
        factors.segurancaRei = analyzeKingSafety(board, turn) - analyzeKingSafety(parentBoard, turn);
        
        // 6️⃣ LINHAS ABERTAS (colunas sem peões)
        factors.linhasAbertas = countOpenFiles(board, turn) - countOpenFiles(parentBoard, turn);
        
        // 7️⃣ PRESSÃO POSICIONAL (ataca peças valiosas, restringe oponente)
        factors.pressaoPosicional = analyzePressure(node, parentNode, turn);
        
        // SCORE TOTAL PONDERADO
        factors.score = 
            (factors.controleCentro * 3) +
            (factors.desenvolvimentoPecas * 2) +
            (factors.estruturaPeoes * 2) +
            (factors.atividadePecas * 0.5) +
            (factors.segurancaRei * 1.5) +
            (factors.linhasAbertas * 2) +
            (factors.pressaoPosicional * 3);
        
    } catch (e) {
        console.warn('Erro na análise posicional:', e);
    }
    
    return factors;
}

// Helper: Conta peças desenvolvidas
function countDevelopedPieces(board, color) {
    let count = 0;
    const pieces = (color === 'w') ? ['N', 'B', 'Q'] : ['n', 'b', 'q'];
    const startRank = (color === 'w') ? '1' : '8';
    
    pieces.forEach(piece => {
        const positions = board.find(piece);
        positions.forEach(pos => {
            if (!pos.includes(startRank)) {
                count++;
            }
        });
    });
    
    return count;
}

// Helper: Analisa estrutura de peões (penaliza isolados e duplicados)
function analyzePawnStructure(board, color) {
    const pawn = (color === 'w') ? 'P' : 'p';
    const pawns = board.find(pawn);
    
    let fileCount = {};
    let score = 0;
    
    pawns.forEach(square => {
        const file = square[0];
        fileCount[file] = (fileCount[file] || 0) + 1;
    });
    
    // Penaliza peões duplicados (-1 por duplicata)
    Object.values(fileCount).forEach(count => {
        if (count > 1) score -= (count - 1);
    });
    
    // Penaliza peões isolados
    Object.keys(fileCount).forEach(file => {
        const fileIndex = file.charCodeAt(0) - 97;
        const leftFile = String.fromCharCode(96 + fileIndex);
        const rightFile = String.fromCharCode(98 + fileIndex);
        
        if (!fileCount[leftFile] && !fileCount[rightFile]) {
            score -= 1; // Peão isolado
        }
    });
    
    return score;
}

// Helper: Segurança do rei
function analyzeKingSafety(board, color) {
    const king = (color === 'w') ? 'K' : 'k';
    const pawn = (color === 'w') ? 'P' : 'p';
    const kingPos = board.find(king)[0];
    
    if (!kingPos) return 0;
    
    const kingFile = kingPos.charCodeAt(0) - 97;
    const kingRank = parseInt(kingPos[1]);
    
    let safety = 0;
    
    // Verifica peões na frente do rei
    for (let file = Math.max(0, kingFile - 1); file <= Math.min(7, kingFile + 1); file++) {
        const checkRank = (color === 'w') ? kingRank + 1 : kingRank - 1;
        const checkSquare = String.fromCharCode(97 + file) + checkRank;
        
        if (board.piece(checkSquare) === pawn) {
            safety++;
        }
    }
    
    return safety;
}

// Helper: Conta colunas abertas (semi-abertas)
function countOpenFiles(board, color) {
    const pawn = (color === 'w') ? 'P' : 'p';
    const pawns = board.find(pawn);
    
    let filesWithPawns = new Set();
    pawns.forEach(square => {
        filesWithPawns.add(square[0]);
    });
    
    return 8 - filesWithPawns.size;
}

// Helper: Analisa pressão posicional
function analyzePressure(node, parentNode, color) {
    let pressure = 0;
    
    try {
        // Verifica se ataca peças valiosas do oponente
        const board = node.board;
        const moves = board.movegen();
        
        moves.forEach(move => {
            const targetSquare = move.slice(2, 4);
            const targetPiece = board.piece(targetSquare);
            
            if (targetPiece) {
                const isOpponentPiece = (color === 'w') ? 
                    (targetPiece === targetPiece.toLowerCase()) : 
                    (targetPiece === targetPiece.toUpperCase());
                
                if (isOpponentPiece) {
                    // Pontos por atacar peças valiosas
                    const valores = { 'q': 4, 'r': 3, 'b': 2, 'n': 2, 'p': 1 };
                    pressure += valores[targetPiece.toLowerCase()] || 0;
                }
            }
        });
        
        // Reduz mobilidade do oponente
        const oponentMovesBefore = parentNode.board.movegen().length;
        const oponentMovesAfter = board.movegen().length;
        
        if (oponentMovesAfter < oponentMovesBefore) {
            pressure += (oponentMovesBefore - oponentMovesAfter) * 0.1;
        }
        
    } catch (e) {
        console.warn('Erro ao analisar pressão:', e);
    }
    
    return pressure;
}

// ===================================
// 🆕 DETECÇÃO DE LANCES BRILHANTES
// ===================================
function detectBrilliantMove(node, parentNode, eval_diff, perda_material) {
    // Critérios para lance brilhante (não-óbvio mas muito forte)
    
    let isBrilliant = false;
    let reason = '';
    
    try {
        // 1️⃣ Lance perfeito em posição complexa (eval_diff = 0 mas não é óbvio)
        if (eval_diff === 0) {
            const alternatives = SortedMoveInfo(parentNode);
            
            // Se há muitas alternativas boas (posição complexa)
            if (alternatives.length > 5) {
                const secondBest = alternatives[1];
                const bestEval = alternatives[0].value() * 100;
                const secondEval = secondBest ? secondBest.value() * 100 : bestEval;
                
                // Lance é único melhor (margem > 0.3)
                if (Math.abs(bestEval - secondEval) > 30) {
                    isBrilliant = true;
                    reason = 'ÚNICO MELHOR LANCE EM POSIÇÃO COMPLEXA';
                }
            }
        }
        
        // 2️⃣ Lance contra-intuitivo (sacrifício posicional com compensação)
        if (perda_material >= 1 && eval_diff <= 15) {
            const posicional = analyzePositionalFactors(node, parentNode);
            
            // Compensação posicional forte
            if (posicional.score >= 3) {
                isBrilliant = true;
                reason = 'SACRIFÍCIO COM COMPENSAÇÃO POSICIONAL';
                console.log(`💎 Fatores posicionais:`, posicional);
            }
        }
        
        // 3️⃣ Lance silencioso devastador (quiet move com grande impacto)
        const move = node.move_old_format();
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const captured = parentNode.board.piece(to);
        
        if (!captured && eval_diff === 0) {
            // Lance sem captura mas muito forte
            const parent_info = SortedMoveInfo(parentNode);
            const parent_eval = parent_info[0] ? parent_info[0].value() * 100 : 0;
            const current_info = SortedMoveInfo(node);
            const current_eval = current_info[0] ? (100 - current_info[0].value() * 100) : 0;
            
            const improvementTemp = current_eval - parent_eval;
            
            // Melhora a posição significativamente sem capturar
            if (Math.abs(improvementTemp) > 50) {
                isBrilliant = true;
                reason = 'LANCE SILENCIOSO DEVASTADOR';
            }
        }
        
        // 4️⃣ Zugzwang forçado (força o oponente a piorar sua posição)
        const oponentMoves = node.board.movegen();
        if (oponentMoves.length <= 3 && eval_diff === 0) {
            isBrilliant = true;
            reason = 'ZUGZWANG - RESTRINGE OPONENTE';
        }
        
    } catch (e) {
        console.warn('Erro ao detectar lance brilhante:', e);
    }
    
    return { isBrilliant, reason };
}

// ===================================
// 🆕 DETECÇÃO DE MATE - VERSÃO COMPLETA
// ===================================
function detectMateSequence(node) {
    if (!node || !node.table) return null;
    
    let info_list = SortedMoveInfo(node);
    
    if (!info_list || info_list.length === 0) return null;
    
    let best_move = info_list[0];
    
    // LC0 retorna mate como valor muito alto (geralmente > 90.00)
    let eval_value = best_move.value() * 100;
    
    // Detecta mate forçado
    if (Math.abs(eval_value) >= 85.0) {
        let moves_to_mate = Math.max(1, Math.ceil((100 - Math.abs(eval_value)) * 2));
        
        if (moves_to_mate > 20) moves_to_mate = 20;
        
        let is_winning = eval_value > 0;
        
        // Extrai a sequência PV (Principal Variation)
        let pv_string = best_move.pv || '';
        
        console.log(`🏁 ${is_winning ? 'MATE' : 'SENDO MATADO'} EM ~${moves_to_mate} LANCES!`);
        console.log(`📊 Eval value: ${eval_value.toFixed(2)}`);
        console.log(`📊 PV: ${pv_string}`);
        
        return {
            isMate: true,
            isWinning: is_winning,
            movesToMate: moves_to_mate,
            sequence: pv_string,
            evalValue: eval_value
        };
    }
    
    return null;
}

// ===================================
// 🆕 VERIFICAÇÃO DE MATE NO TABULEIRO
// ===================================
function checkForMateOnBoard(board) {
    try {
        if (board.no_moves()) {
            if (board.king_in_check()) {
                return { isMate: true, movesToMate: 0, immediate: true };
            } else {
                return { isStalemate: true };
            }
        }
        
        let moves = board.movegen();
        for (let move of moves) {
            let test_board = board.copy();
            test_board.move(move);
            
            if (test_board.no_moves() && test_board.king_in_check()) {
                return { 
                    isMate: true, 
                    movesToMate: 1, 
                    winningMove: move,
                    immediate: false 
                };
            }
        }
    } catch (e) {
        console.warn('Erro ao verificar mate:', e);
    }
    
    return { isMate: false };
}

// ===================================
// 🎬 ANIMAÇÃO DE CASCATA - SEQUÊNCIA DE MATE (MELHORADA)
// ===================================
function showMateSequenceAnimation(mateInfo, currentBoard) {
    // Cancela animação anterior se existir
    clearMateAnimation();
    
    if (!mateInfo) {
        console.warn('⚠️ mateInfo é null/undefined');
        return;
    }
    
    console.log(`🎬 showMateSequenceAnimation chamada com:`, mateInfo);
    
    if (!mateInfo.sequence || mateInfo.sequence.length < 4) {
        console.warn('⚠️ Sequência vazia ou inválida:', mateInfo.sequence);
        
        // 🆕 FALLBACK: Se não tem sequência, mostra pelo menos indicação visual
        if (mateInfo.firstMove && mateInfo.firstMove.length >= 4) {
            console.log(`🎬 Usando firstMove como fallback: ${mateInfo.firstMove}`);
            const from = mateInfo.firstMove.slice(0, 2);
            const to = mateInfo.firstMove.slice(2, 4);
            
            clearSquareEffects();
            applyMateSquareEffect(from, to, true);
            
            // Adiciona texto explicativo
            setTimeout(() => {
                const hint = document.createElement('div');
                hint.className = 'nibbler-mate-hint';
                hint.style.cssText = `
                    position: fixed;
                    bottom: 120px;
                    right: 30px;
                    background: rgba(255, 215, 0, 0.95);
                    color: black;
                    padding: 15px 30px;
                    border-radius: 10px;
                    font-size: 1.2em;
                    font-weight: bold;
                    z-index: 99998;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    border: 2px solid gold;
                `;
                hint.textContent = `⚡ Jogue: ${mateInfo.firstMove.toUpperCase()}`;
                document.body.appendChild(hint);
                
                setTimeout(() => hint.remove(), 3000);
            }, 200);
        }
        
        return;
    }
    
    mate_animation_running = true;
    
    // Parse da sequência PV
    let moves = parsePVString(mateInfo.sequence);
    
    console.log(`🎬 Moves parseados:`, moves);
    
    if (moves.length === 0) {
        console.warn('⚠️ Nenhum lance parseado da sequência');
        mate_animation_running = false;
        return;
    }
    
    // Limita a 8 lances para não sobrecarregar
    const MAX_MOVES = 8;
    if (moves.length > MAX_MOVES) {
        moves = moves.slice(0, MAX_MOVES);
        console.log(`📊 Sequência limitada a ${MAX_MOVES} lances`);
    }
    
    console.log(`🎬 Iniciando animação com ${moves.length} lances:`, moves);
    
    // Simula o tabuleiro para cada lance
    let board = currentBoard.copy();
    let validMoves = [];
    
    for (let i = 0; i < moves.length; i++) {
        try {
            let move = moves[i];
            
            // Verifica se o lance é legal
            if (!board.illegal(move)) {
                validMoves.push({
                    move: move,
                    from: move.slice(0, 2),
                    to: move.slice(2, 4),
                    isLastMove: i === moves.length - 1,
                    moveNumber: i + 1
                });
                
                board.move(move);
                console.log(`✅ Lance ${i + 1}/${moves.length} validado: ${move}`);
            } else {
                console.warn(`⚠️ Lance ilegal: ${move}`);
                break;
            }
        } catch (e) {
            console.warn(`⚠️ Erro ao processar lance ${moves[i]}:`, e);
            break;
        }
    }
    
    if (validMoves.length === 0) {
        console.warn('⚠️ Nenhum lance válido na sequência');
        mate_animation_running = false;
        return;
    }
    
    console.log(`✅ ${validMoves.length} lances válidos para animar`);
    
    // Anima cada lance com delay
    const DELAY_PER_MOVE = 700; // ms (aumentado para melhor visualização)
    
    validMoves.forEach((moveData, index) => {
        let timeoutId = setTimeout(() => {
            console.log(`🎬 Animando lance ${moveData.moveNumber}/${validMoves.length}: ${moveData.move}`);
            
            // Remove efeitos anteriores
            clearSquareEffects();
            
            // Aplica efeito visual
            if (moveData.isLastMove) {
                // Lance final = DOURADO piscante
                applyMateSquareEffect(moveData.from, moveData.to, true);
                console.log(`👑 LANCE FINAL DE MATE: ${moveData.move}`);
                
                // Mensagem adicional no último lance
                setTimeout(() => {
                    const finalMsg = document.createElement('div');
                    finalMsg.className = 'nibbler-mate-final-message';
                    finalMsg.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: linear-gradient(135deg, rgba(255, 215, 0, 0.98), rgba(255, 140, 0, 0.98));
                        color: black;
                        padding: 40px 80px;
                        border-radius: 20px;
                        font-size: 3em;
                        font-weight: bold;
                        z-index: 100000;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.7);
                        border: 5px solid gold;
                        animation: pulse-scale 1s ease-in-out infinite;
                    `;
                    finalMsg.innerHTML = `👑 CHECKMATE! 👑`;
                    document.body.appendChild(finalMsg);
                    
                    setTimeout(() => finalMsg.remove(), 2500);
                }, 500);
            } else {
                // Lances intermediários = CYAN
                applyMateSquareEffect(moveData.from, moveData.to, false);
            }
            
            // Se é o último lance, finaliza animação
            if (index === validMoves.length - 1) {
                setTimeout(() => {
                    mate_animation_running = false;
                    console.log('🎬 Animação de mate finalizada');
                }, 2500);
            }
            
        }, index * DELAY_PER_MOVE);
        
        mate_animation_timeout_ids.push(timeoutId);
    });
}

// ===================================
// 🎨 EFEITO VISUAL PARA SEQUÊNCIA DE MATE
// ===================================
function applyMateSquareEffect(fromSquare, toSquare, isFinalMove) {
    if (!fromSquare || !toSquare) return;
    
    const from = fromSquare.toLowerCase();
    const to = toSquare.toLowerCase();
    
    const fromCell = findSquareElement(from);
    const toCell = findSquareElement(to);
    
    if (isFinalMove) {
        // Lance final = DOURADO com pulso
        if (fromCell) {
            fromCell.classList.add('nibbler-mate-final-origin');
        }
        if (toCell) {
            toCell.classList.add('nibbler-mate-final-destination');
        }
    } else {
        // Lances intermediários = CYAN
        if (fromCell) {
            fromCell.classList.add('nibbler-mate-origin');
        }
        if (toCell) {
            toCell.classList.add('nibbler-mate-destination');
        }
    }
}

// ===================================
// 🧹 LIMPA EFEITOS VISUAIS
// ===================================
function clearSquareEffects() {
    const allSquares = document.querySelectorAll('#boardfriends td');
    allSquares.forEach(cell => {
        cell.classList.remove(
            'nibbler-move-origin',
            'nibbler-move-destination',
            'nibbler-move-trail',
            'nibbler-mate-origin',
            'nibbler-mate-destination',
            'nibbler-mate-final-origin',
            'nibbler-mate-final-destination'
        );
    });
}

function clearMateAnimation() {
    // Cancela todos os timeouts pendentes
    mate_animation_timeout_ids.forEach(id => clearTimeout(id));
    mate_animation_timeout_ids = [];
    mate_animation_running = false;
    clearSquareEffects();
}

// ===================================
// 🔍 PARSE DA STRING PV (Principal Variation)
// ===================================
function parsePVString(pvString) {
    if (!pvString || typeof pvString !== 'string') return [];
    
    // Remove espaços extras e quebras de linha
    pvString = pvString.trim();
    
    // Separa por espaços
    let tokens = pvString.split(/\s+/);
    
    let moves = [];
    
    for (let token of tokens) {
        // Remove número de lances (ex: "1.", "2.")
        token = token.replace(/^\d+\./, '').trim();
        
        // Ignora tokens vazios ou inválidos
        if (token.length < 4) continue;
        
        // Formato esperado: e2e4, g1f3, etc
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token)) {
            moves.push(token);
        }
    }
    
    return moves;
}

// ===================================
// 🎯 SETA DE TRAJETÓRIA DO MOVIMENTO
// ===================================
let lastMoveArrow = { from: null, to: null };

function drawMoveTrajectoryArrow(fromSquare, toSquare) {
    if (!fromSquare || !toSquare) return;

    // Salva o último movimento para redesenhar se necessário
    lastMoveArrow = { from: fromSquare, to: toSquare };

    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Converte coordenadas de xadrez para canvas
    const from = fromSquare.toLowerCase();
    const to = toSquare.toLowerCase();

    let fromCol = from.charCodeAt(0) - 97;
    let fromRow = 8 - parseInt(from[1]); // Inverte para coordenadas de canvas
    let toCol = to.charCodeAt(0) - 97;
    let toRow = 8 - parseInt(to[1]);

    // Lida com tabuleiro virado (flip)
    if (config && config.flip) {
        fromCol = 7 - fromCol;
        fromRow = 7 - fromRow;
        toCol = 7 - toCol;
        toRow = 7 - toRow;
    }

    // Obtém tamanho da casa
    const squareSize = config.square_size || (canvas.width / 8);

    // Calcula centro das casas
    const x1 = (fromCol + 0.5) * squareSize;
    const y1 = (fromRow + 0.5) * squareSize;
    const x2 = (toCol + 0.5) * squareSize;
    const y2 = (toRow + 0.5) * squareSize;

    // Cor azul cyan (mesma dos efeitos)
    const arrowColor = 'rgba(0, 191, 255, 0.85)';
    const arrowWidth = Math.max(8, squareSize * 0.12);
    const headLength = squareSize * 0.35;

    // Calcula ângulo da seta
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Ponto onde a ponta da seta começa (um pouco antes do destino)
    const tipX = x2 - Math.cos(angle) * (squareSize * 0.2);
    const tipY = y2 - Math.sin(angle) * (squareSize * 0.2);

    // Desenha a linha da seta
    ctx.save();
    ctx.strokeStyle = arrowColor;
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = arrowWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Sombra para destaque
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Linha principal
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    // Ponta da seta (triângulo)
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    console.log(`🎯 [SETA] Desenhada de ${fromSquare} para ${toSquare}`);
}

// Limpa a seta do canvas
function clearMoveTrajectoryArrow() {
    lastMoveArrow = { from: null, to: null };
}

// ===================================
// ✨ EFEITO AZUL COM TRILHA ANIMADA (ORIGINAL)
// ===================================
function applySquareEffect(fromSquare, toSquare) {
    clearSquareEffects();

    if (!fromSquare || !toSquare) return;

    // Desenha a seta de trajetória
    drawMoveTrajectoryArrow(fromSquare, toSquare);

    const from = fromSquare.toLowerCase();
    const to = toSquare.toLowerCase();

    const fromCol = from.charCodeAt(0) - 97;
    const fromRow = parseInt(from[1]) - 1;
    const toCol = to.charCodeAt(0) - 97;
    const toRow = parseInt(to[1]) - 1;

    const trailSquares = getTrailSquares(fromCol, fromRow, toCol, toRow);

    const fromCell = findSquareElement(from);
    const toCell = findSquareElement(to);

    if (fromCell) {
        setTimeout(() => {
            fromCell.classList.add('nibbler-move-origin');
        }, 0);
    }

    trailSquares.forEach((square, index) => {
        const cell = findSquareElement(square);
        if (cell) {
            setTimeout(() => {
                cell.classList.add('nibbler-move-trail');
            }, 100 + (index * 60));
        }
    });

    if (toCell) {
        const totalDelay = 100 + (trailSquares.length * 60);
        setTimeout(() => {
            toCell.classList.add('nibbler-move-destination');
        }, totalDelay);
    }
}

function getTrailSquares(fromCol, fromRow, toCol, toRow) {
    const trail = [];

    const deltaCol = Math.sign(toCol - fromCol);
    const deltaRow = Math.sign(toRow - fromRow);

    const steps = Math.max(Math.abs(toCol - fromCol), Math.abs(toRow - fromRow));

    if ((Math.abs(toCol - fromCol) === 2 && Math.abs(toRow - fromRow) === 1) ||
        (Math.abs(toCol - fromCol) === 1 && Math.abs(toRow - fromRow) === 2)) {
        return [];
    }

    let currentCol = fromCol;
    let currentRow = fromRow;

    for (let i = 1; i < steps; i++) {
        currentCol += deltaCol;
        currentRow += deltaRow;

        const square = String.fromCharCode(97 + currentCol) + (currentRow + 1);
        trail.push(square);
    }

    return trail;
}

function findSquareElement(square) {
    return document.querySelector(`#boardfriends td[id*="${square}"]`) ||
        document.getElementById(square) ||
        document.getElementById('overlay_' + square) ||
        document.querySelector(`[data-square="${square}"]`);
}

// ===================================
// 🆕 POPUP DE QUALIDADE - 🎯 CANTO INFERIOR DIREITO
// ===================================
function showMoveQualityPopup(qualityType, mateInfo = null) {
    const oldPopup = document.querySelector('.nibbler-quality-popup');
    if (oldPopup) oldPopup.remove();

    let quality = getMoveQualityByType(qualityType, mateInfo);
    if (!quality) return;

    const popup = document.createElement('div');
    popup.className = 'nibbler-quality-popup';
    popup.style.borderColor = quality.color;
    
    popup.style.position = 'fixed';
    popup.style.bottom = '30px';
    popup.style.right = '30px';
    popup.style.zIndex = '99999';
    popup.style.margin = '0';
    popup.style.transform = 'none';
    popup.style.left = 'auto';
    popup.style.top = 'auto';

    if (qualityType === 'MATE' || qualityType === 'SACRIFICE_QUEEN' || qualityType === 'SACRIFICE_ROOK') {
        popup.style.background = 'linear-gradient(135deg, rgba(0,0,0,0.98) 0%, rgba(20,0,0,0.98) 100%)';
        popup.style.padding = '35px 70px';
        popup.style.fontSize = '2.2em';
        popup.style.boxShadow = '0 30px 90px rgba(255, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.2)';
        popup.style.animation = 'nibbler-popup-epic 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
    }

    popup.innerHTML = `
        <span style="font-size:1.8em; margin-right:20px;">${quality.icon}</span>
        <span style="font-size:1.3em; text-shadow: 2px 2px 8px rgba(0,0,0,0.8);">${quality.text}</span>
    `;

    document.body.appendChild(popup);

    const duration = (qualityType === 'MATE' || qualityType === 'SACRIFICE_QUEEN' || qualityType === 'SACRIFICE_ROOK') ? 3000 : 1600;
    setTimeout(() => popup.remove(), duration);
}

function getMoveQualityByType(type, mateInfo = null) {
    if (type === 'MATE' && mateInfo) {
        if (mateInfo.isWinning) {
            return {
                icon: '♔👑',
                color: '#FFD700',
                text: `🏁 XEQUE-MATE EM ${mateInfo.movesToMate}! 🏁`,
                emoji: '👑'
            };
        } else {
            return {
                icon: '⚠️♚',
                color: '#FF1744',
                text: `⚠️ SENDO MATADO EM ${mateInfo.movesToMate}! ⚠️`,
                emoji: '💀'
            };
        }
    }
    
    if (typeof type === 'string') {
        const specialQualities = {
            'SACRIFICE_QUEEN': {
                icon: '👑💥',
                color: '#FF1744',
                text: '🔥 NEZHMETDINOV - SACRIFÍCIO DE DAMA! 🔥',
                emoji: '🎭'
            },
            'SACRIFICE_ROOK': {
                icon: '🏰⚡',
                color: '#FF6D00',
                text: '⚔️ TAL - SACRIFÍCIO DE TORRE! ⚔️',
                emoji: '🗡️'
            },
            'BRILLIANT': {
                icon: '‼️✨',
                color: '#1BADA6',
                text: '💎 SACRIFÍCIO BRILHANTE 💎',
                emoji: '💎'
            },
            'GREAT_SACRIFICE': {
                icon: '❗⚡',
                color: '#5C9ECC',
                text: '⭐ ÓTIMO SACRIFÍCIO ⭐',
                emoji: '⭐'
            },
            'GOOD_SACRIFICE': {
                icon: '⚡',
                color: '#96BC4B',
                text: 'BOM SACRIFÍCIO',
                emoji: '⚡'
            }
        };
        return specialQualities[type];
    }

    if (type === 0) return { icon: '✔', color: '#96BC4B', text: 'MELHOR LANCE' };
    if (type <= 2) return { icon: '⚡', color: '#96BC4B', text: 'EXCELENTE' };
    if (type <= 5) return { icon: '▽', color: '#96AF8B', text: 'BOM LANCE' };
    if (type <= 10) return { icon: '?!', color: '#F0C15C', text: 'IMPRECISÃO' };
    if (type <= 20) return { icon: '?', color: '#E58F2A', text: 'ERRO' };
    return { icon: '✕', color: '#CA3431', text: 'ERRO GRAVE' };
}

function getMoveQuality(evalDiff) {
    return getMoveQualityByType(evalDiff);
}

// ===================================
// 📍 FUNÇÃO PRINCIPAL (MODIFICADA)
// ===================================
function node_eval_changed() {
    eval_node = hub.tree.node;

    last_popup_node_id = null;

    if (!config.is_eval_enabled || eval_node === null) {
        is_eval_visible = false;
        clearMateAnimation();
        return;
    }

    update_score();

    while (eval_node.move === null && eval_node.parent !== null) {
        eval_node = eval_node.parent;
    }

    if (eval_node.move === null) {
        is_eval_visible = false;
        clearMateAnimation();
        return;
    }

    try {
        const move = eval_node.move_old_format();
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);

        applySquareEffect(from, to);
    } catch (e) {
        console.log("Erro ao aplicar efeito:", e);
    }

    let [eval_node_x, eval_node_y] = XY(eval_node.move_old_format().slice(2, 4));

    if (config.flip) {
        eval_node_x = 7 - eval_node_x;
        eval_node_y = 7 - eval_node_y;
    }

    eval_icon_x = config.square_size * (eval_node_x - eval_icon_size + eval_icon_offset + 1);
    eval_icon_y = config.square_size * (eval_node_y - eval_icon_offset);

    if (eval_node_x === 7) {
        eval_icon_x -= config.square_size * eval_icon_edge_adj;
    }

    if (eval_node_y === 0) {
        eval_icon_y += config.square_size * eval_icon_edge_adj;
    }

    is_eval_visible = true;
    eval_icon = null;

    analysis_changed();
}

// ===================================
// 🆕 DRAW_NODE_EVAL - COM ANIMAÇÃO DE MATE
// ===================================
// ===================================
// 📊 ATUALIZA BARRA DE AVALIAÇÃO (ESTILO CHESS.COM)
// ===================================
function updateEvalBar(evalValue) {
    const container = document.getElementById('eval_bar_container');
    const evalBar = document.getElementById('eval_bar');
    const whiteBar = document.getElementById('eval_bar_white');
    const blackBar = document.getElementById('eval_bar_black');
    const valueDisplay = document.getElementById('eval_bar_value');

    if (!whiteBar || !blackBar || !valueDisplay) return;

    // Ajusta altura da barra para corresponder ao tabuleiro
    if (container && evalBar && config && config.board_size) {
        container.style.height = config.board_size + 'px';
        evalBar.style.height = (config.board_size - 30) + 'px';
    }

    // evalValue: 50 = igual, >50 = brancas melhor, <50 = pretas melhor
    // Converte para porcentagem (0-100)
    let whitePercent = evalValue;

    // Limita entre 5% e 95% para sempre mostrar algo
    whitePercent = Math.max(5, Math.min(95, whitePercent));

    whiteBar.style.height = whitePercent + '%';
    blackBar.style.height = (100 - whitePercent) + '%';

    // Calcula o valor para exibir (em peões)
    // evalValue 50 = 0.0, 60 = +1.0, 40 = -1.0
    let pawnValue = (evalValue - 50) / 10;

    // Formata o texto
    let displayText;
    if (Math.abs(pawnValue) > 10) {
        // Mate
        displayText = pawnValue > 0 ? 'M' : '-M';
    } else {
        displayText = (pawnValue >= 0 ? '+' : '') + pawnValue.toFixed(1);
    }

    valueDisplay.textContent = displayText;

    // Cor do texto baseada na avaliação
    if (pawnValue > 0.5) {
        valueDisplay.style.background = '#f0f0f0';
        valueDisplay.style.color = '#1a1a1a';
    } else if (pawnValue < -0.5) {
        valueDisplay.style.background = '#1a1a1a';
        valueDisplay.style.color = '#f0f0f0';
    } else {
        valueDisplay.style.background = '#666';
        valueDisplay.style.color = '#fff';
    }
}

function draw_node_eval() {
    // Atualiza o nome da abertura
    load_book_moves();

    if (!is_eval_visible) {
        return;
    }

    let parent_info_list = SortedMoveInfo(eval_node.parent);
    let eval_info_list = SortedMoveInfo(eval_node);

    if (parent_info_list[0] === undefined) {
        return;
    }

    var eval_diff = 0;
    let parent_eval = 0;
    let current_eval = 0;

    if (eval_info_list.length !== 0) {
        parent_eval = parent_info_list[0].value() * 100;
        current_eval = 100 - eval_info_list[0].value() * 100;

        // 📊 Atualiza a barra de avaliação
        // current_eval: 0-100 onde 50 é igual
        updateEvalBar(current_eval);

        eval_diff = current_eval - parent_eval;

        if (eval_diff > 0 || parent_info_list[0].move == eval_node.move) {
            eval_diff = 0;
        }

        eval_diff = - 1 * eval_diff;
        eval_node.eval_diff = eval_diff;
    }

    // ===================================
    // 🆕 VERIFICAÇÃO DE MATE COM ANIMAÇÃO
    // ===================================
    
    let board_mate = checkForMateOnBoard(eval_node.board);
    let mate_info = detectMateSequence(eval_node);
    
    // 🆕 MATE DETECTADO - SEMPRE MOSTRA ANIMAÇÃO
    if (mate_info && mate_info.isMate) {
        eval_icon = winner_img;
        eval_diff = 0;
        
        if (eval_node.id !== last_popup_node_id) {
            showMoveQualityPopup('MATE', mate_info);
            
            console.log(`🎬 ========== INICIANDO ANIMAÇÃO DE MATE ==========`);
            console.log(`🎬 Mate info:`, mate_info);
            console.log(`🎬 Sequência: "${mate_info.sequence}"`);
            console.log(`🎬 Primeiro lance: "${mate_info.firstMove}"`);
            
            // 🎬 SEMPRE INICIA ANIMAÇÃO (mesmo se PV estiver vazia)
            if (mate_info.sequence && mate_info.sequence.length >= 4) {
                // Tem sequência completa
                console.log(`✅ Iniciando animação com sequência completa`);
                setTimeout(() => {
                    showMateSequenceAnimation(mate_info, eval_node.board);
                }, 500);
            } else if (mate_info.firstMove && mate_info.firstMove.length >= 4) {
                // Tem pelo menos o primeiro lance
                console.log(`✅ Iniciando animação só com primeiro lance`);
                mate_info.sequence = mate_info.firstMove;
                setTimeout(() => {
                    showMateSequenceAnimation(mate_info, eval_node.board);
                }, 500);
            } else {
                console.warn(`⚠️ Sem sequência para animar, mostrando lance atual`);
                // Mostra pelo menos o lance atual em dourado
                try {
                    const currentMove = eval_node.move_old_format();
                    const from = currentMove.slice(0, 2);
                    const to = currentMove.slice(2, 4);
                    
                    setTimeout(() => {
                        clearSquareEffects();
                        applyMateSquareEffect(from, to, true);
                    }, 500);
                } catch (e) {
                    console.warn('Erro ao mostrar lance atual:', e);
                }
            }
            
            last_popup_node_id = eval_node.id;
        }
    }
    // MATE EM 1 DETECTADO NO TABULEIRO
    else if (board_mate.isMate && board_mate.movesToMate === 1) {
        eval_icon = winner_img;
        eval_diff = 0;
        
        if (eval_node.id !== last_popup_node_id) {
            console.log(`🏁 Mate em 1 detectado: ${board_mate.winningMove}`);
            
            showMoveQualityPopup('MATE', { 
                isMate: true, 
                isWinning: true, 
                movesToMate: 1,
                sequence: board_mate.sequence || board_mate.winningMove,
                firstMove: board_mate.winningMove
            });
            
            // 🎬 ANIMA O LANCE VENCEDOR
            if (board_mate.winningMove && board_mate.winningMove.length >= 4) {
                const from = board_mate.winningMove.slice(0, 2);
                const to = board_mate.winningMove.slice(2, 4);
                
                console.log(`🎬 Animando mate em 1: ${from} → ${to}`);
                
                setTimeout(() => {
                    clearSquareEffects();
                    applyMateSquareEffect(from, to, true);
                }, 500);
            }
            
            last_popup_node_id = eval_node.id;
        }
    }
    // MATE IMEDIATO (já está em mate)
    else if (board_mate.isMate && board_mate.immediate) {
        eval_icon = winner_img;
        eval_diff = 0;
        
        if (eval_node.id !== last_popup_node_id) {
            showMoveQualityPopup('MATE', { 
                isMate: true, 
                isWinning: true, 
                movesToMate: 0 
            });
            
            // Destaca o lance que deu mate (lance atual)
            try {
                const currentMove = eval_node.move_old_format();
                const from = currentMove.slice(0, 2);
                const to = currentMove.slice(2, 4);
                
                console.log(`👑 Destacando lance de mate: ${from} → ${to}`);
                
                setTimeout(() => {
                    clearSquareEffects();
                    applyMateSquareEffect(from, to, true);
                }, 500);
            } catch (e) {
                console.warn('Erro ao destacar mate:', e);
            }
            
            last_popup_node_id = eval_node.id;
        }
    }
    // CHECKMATE NORMAL
    else if (eval_node.board.no_moves() && eval_node.board.king_in_check()) {
        eval_icon = winner_img;
        eval_diff = 0;
    }
    // VERIFICA SE ENGINE AINDA ESTÁ CALCULANDO
    else if (!(hub.engine.search_running.node && hub.engine.search_running === hub.engine.search_desired)
        && !(hub.engine.search_running !== hub.engine.search_desired)) {
        if (eval_node.table.nodes === 0) {
            eval_icon = null;
            return;
        }
    }

    // ===================================
    // LÓGICA DE DETECÇÃO DE SACRIFÍCIO
    // ===================================
    try {
        const move = eval_node.move_old_format();
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        
        const peca_movida = eval_node.parent.board.piece(from);
        const peca_capturada = eval_node.parent.board.piece(to);
        
        const valores = {
            'p': 1, 'P': 1,
            'n': 3, 'N': 3,
            'b': 3, 'B': 3,
            'r': 5, 'R': 5,
            'q': 9, 'Q': 9,
            'k': 0, 'K': 0
        };
        
        const valor_peca_movida = valores[peca_movida] || 0;
        const valor_peca_capturada = valores[peca_capturada] || 0;
        
        let material_antes = getMaterialValue(eval_node.parent.board);
        let material_depois = getMaterialValue(eval_node.board);
        
        let cor_que_jogou = eval_node.board.turn === 'w' ? 'b' : 'w';
        
        let mudanca_placar = parent_eval - current_eval;
        if (cor_que_jogou === 'b') {
            mudanca_placar *= -1;
        }
        
        let mudanca_material_bruto = material_depois - material_antes;
        if (cor_que_jogou === 'b') {
            mudanca_material_bruto *= -1;
        }
        
        let perda_material = mudanca_material_bruto < 0 ? Math.abs(mudanca_material_bruto) : 0;

        if (eval_node.id !== last_popup_node_id && eval_node.depth > 0 && !board_mate.isMate && !mate_info?.isMate) {
            
            let tipo_detectado = null;
            let eh_sacrificio = false;
            
            console.log(`📊 ========================================`);
            console.log(`📊 🔍 Análise do lance #${eval_node.depth}`);
            console.log(`📊 Lance: ${move} (${from} → ${to})`);
            console.log(`📊 Peça movida: ${peca_movida} (valor: ${valor_peca_movida})`);
            console.log(`📊 Peça capturada: ${peca_capturada || 'NADA'} (valor: ${valor_peca_capturada})`);
            console.log(`📊 Perda material: ${perda_material} pontos`);
            console.log(`📊 Eval diff: ${eval_diff} centipawns`);
            console.log(`📊 Mudança placar: ${mudanca_placar.toFixed(2)} centipawns`);
            console.log(`📊 ========================================`);
            
            // ===================================
            // 🆕 DETECÇÃO DE LANCE BRILHANTE
            // ===================================
            const brilliantCheck = detectBrilliantMove(eval_node, eval_node.parent, eval_diff, perda_material);
            
            if (brilliantCheck.isBrilliant) {
                tipo_detectado = 'BRILLIANT';
                eh_sacrificio = true;
                console.log(`💎 ✨ LANCE BRILHANTE DETECTADO: ${brilliantCheck.reason}`);
            }
            
            // ===================================
            // 🆕 ANÁLISE POSICIONAL DETALHADA
            // ===================================
            const posicional = analyzePositionalFactors(eval_node, eval_node.parent);
            console.log(`📊 🎯 ANÁLISE POSICIONAL:`);
            console.log(`📊   - Controle Centro: ${posicional.controleCentro > 0 ? '+' : ''}${posicional.controleCentro}`);
            console.log(`📊   - Desenvolvimento: ${posicional.desenvolvimentoPecas > 0 ? '+' : ''}${posicional.desenvolvimentoPecas}`);
            console.log(`📊   - Estrutura Peões: ${posicional.estruturaPeoes > 0 ? '+' : ''}${posicional.estruturaPeoes}`);
            console.log(`📊   - Atividade Peças: ${posicional.atividadePecas > 0 ? '+' : ''}${posicional.atividadePecas.toFixed(1)}`);
            console.log(`📊   - Segurança Rei: ${posicional.segurancaRei > 0 ? '+' : ''}${posicional.segurancaRei}`);
            console.log(`📊   - Linhas Abertas: ${posicional.linhasAbertas > 0 ? '+' : ''}${posicional.linhasAbertas}`);
            console.log(`📊   - Pressão: ${posicional.pressaoPosicional > 0 ? '+' : ''}${posicional.pressaoPosicional.toFixed(1)}`);
            console.log(`📊   - SCORE TOTAL: ${posicional.score.toFixed(1)}`);
            
            // ===================================
            // 1️⃣ PSEUDO-SACRIFÍCIO (Combinação)
            // ===================================
            if (!eh_sacrificio && perda_material >= 1 && eval_diff === 0) {
                if (valor_peca_movida >= 9) {
                    tipo_detectado = 'SACRIFICE_QUEEN';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 👑 PSEUDO-SACRIFÍCIO DE DAMA! (Combinação tática)`);
                }
                else if (valor_peca_movida >= 5) {
                    tipo_detectado = 'SACRIFICE_ROOK';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 🏰 PSEUDO-SACRIFÍCIO DE TORRE! (Combinação tática)`);
                }
                else if (valor_peca_movida >= 3) {
                    tipo_detectado = 'BRILLIANT';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 💎 PSEUDO-SACRIFÍCIO BRILHANTE! (Peça menor)`);
                }
                else {
                    tipo_detectado = 'GOOD_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⚡ PSEUDO-SACRIFÍCIO! (Gambito tático)`);
                }
            }
            
            // ===================================
            // 2️⃣ SACRIFÍCIO TÁTICO/COMBINATÓRIO
            // ===================================
            else if (!eh_sacrificio && perda_material >= 1 && eval_diff <= 20 && mudanca_placar > 0) {
                if (valor_peca_movida >= 9) {
                    tipo_detectado = 'SACRIFICE_QUEEN';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 👑 SACRIFÍCIO TÁTICO DE DAMA! (Ataque direto ao Rei)`);
                }
                else if (valor_peca_movida >= 5) {
                    tipo_detectado = 'SACRIFICE_ROOK';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 🏰 SACRIFÍCIO TÁTICO DE TORRE! (Ataque forçado)`);
                }
                else if (valor_peca_movida >= 3) {
                    tipo_detectado = 'BRILLIANT';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 💎 SACRIFÍCIO TÁTICO BRILHANTE!`);
                }
                else if (eval_node.depth <= 12) {
                    tipo_detectado = 'GOOD_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⚡ GAMBITO! (Abertura agressiva)`);
                }
            }
            
            // ===================================
            // 3️⃣ SACRIFÍCIO POSICIONAL (NOVO - MAIS SENSÍVEL)
            // ===================================
            else if (!eh_sacrificio && perda_material >= 1 && eval_diff <= 100 && posicional.score >= 2) {
                // Sacrifício de Qualidade com compensação posicional
                if (valor_peca_movida === 5 && valor_peca_capturada === 3) {
                    tipo_detectado = 'GREAT_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⭐ SACRIFÍCIO DE QUALIDADE POSICIONAL! (Torre por peça menor)`);
                    console.log(`📊    Compensação: ${posicional.score.toFixed(1)} pontos posicionais`);
                }
                // Dama sacrificada posicionalmente
                else if (valor_peca_movida >= 9 && posicional.score >= 4) {
                    tipo_detectado = 'SACRIFICE_QUEEN';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 👑 SACRIFÍCIO POSICIONAL DE DAMA! (Estilo Nezhmetdinov)`);
                    console.log(`📊    Compensação excepcional: ${posicional.score.toFixed(1)}`);
                }
                // Torre sacrificada posicionalmente
                else if (valor_peca_movida >= 5 && posicional.score >= 3) {
                    tipo_detectado = 'SACRIFICE_ROOK';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 🏰 SACRIFÍCIO POSICIONAL DE TORRE!`);
                    console.log(`📊    Compensação: ${posicional.score.toFixed(1)} pontos`);
                }
                // Peça menor por compensação posicional
                else if (valor_peca_movida >= 3) {
                    tipo_detectado = 'GREAT_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⭐ SACRIFÍCIO POSICIONAL! (Compensação de longo prazo)`);
                    console.log(`📊    Fatores: Centro=${posicional.controleCentro}, Pressão=${posicional.pressaoPosicional.toFixed(1)}`);
                }
                // Gambitos posicionais
                else if (eval_node.depth <= 15 && posicional.score >= 2) {
                    tipo_detectado = 'GOOD_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⚡ GAMBITO POSICIONAL! (Controle, desenvolvimento)`);
                }
            }
            
            // ===================================
            // 4️⃣ SACRIFÍCIO NORMAL (sem compensação clara)
            // ===================================
            else if (!eh_sacrificio && perda_material >= 1 && eval_diff <= 100) {
                if (valor_peca_movida === 5 && valor_peca_capturada === 3) {
                    tipo_detectado = 'GREAT_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⭐ SACRIFÍCIO DE QUALIDADE!`);
                }
                else if (valor_peca_movida >= 9) {
                    tipo_detectado = 'SACRIFICE_QUEEN';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 👑 SACRIFÍCIO DE DAMA!`);
                }
                else if (valor_peca_movida >= 5) {
                    tipo_detectado = 'SACRIFICE_ROOK';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 🏰 SACRIFÍCIO DE TORRE!`);
                }
                else if (valor_peca_movida >= 3) {
                    tipo_detectado = 'GREAT_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⭐ SACRIFÍCIO!`);
                }
                else if (eval_node.depth <= 15) {
                    tipo_detectado = 'GOOD_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⚡ GAMBITO!`);
                }
            }
            
            // ===================================
            // 🎨 EXIBE RESULTADO
            // ===================================
            if (eh_sacrificio) {
                showMoveQualityPopup(tipo_detectado);
                
                if (tipo_detectado === 'SACRIFICE_QUEEN') eval_icon = sacrifice_queen_img;
                else if (tipo_detectado === 'SACRIFICE_ROOK') eval_icon = sacrifice_rook_img;
                else if (tipo_detectado === 'BRILLIANT') eval_icon = brilliant_img;
                else if (tipo_detectado === 'GREAT_SACRIFICE') eval_icon = great_img;
                else if (tipo_detectado === 'GOOD_SACRIFICE') eval_icon = excellent_img;
                
                console.log(`📊 🔥 POPUP EXIBIDO: ${tipo_detectado}`);
            }
            
            else {
                console.log(`📊 ℹ️ Lance normal (sem sacrifício detectado)`);
                showMoveQualityPopup(eval_diff);
                
                if (eval_diff === 0) { 
                    eval_icon = best_img;
                }
                else if (eval_diff <= 2) { 
                    eval_icon = excellent_img;
                }
                else if (eval_diff <= 5) { 
                    eval_icon = good_img;
                }
                else if (eval_diff <= 10) { 
                    eval_icon = inaccuracy_img;
                }
                else if (eval_diff <= 20) { 
                    eval_icon = mistake_img;
                }
                else { 
                    eval_icon = blunder_img;
                }
            }
            
            last_popup_node_id = eval_node.id;
        }

    } catch (e) {
        console.warn('❌ Erro na detecção de sacrifício:', e);
        
        if (eval_node.id !== last_popup_node_id && eval_node.depth > 0) {
            showMoveQualityPopup(eval_diff);
            last_popup_node_id = eval_node.id;
        }
    }

    // Atribui ícone se ainda não foi atribuído
    if (eval_diff !== last_eval_diff || eval_icon === null) {
        if (!eval_icon) {
            if (eval_diff === 0) { eval_icon = best_img; } else
                if (eval_diff <= 2) { eval_icon = excellent_img; } else
                    if (eval_diff <= 5) { eval_icon = good_img; } else
                        if (eval_diff <= 10) { eval_icon = inaccuracy_img; } else
                            if (eval_diff <= 20) { eval_icon = mistake_img; } else { eval_icon = blunder_img; }
        }

        last_eval_diff = eval_diff;
    }

    if (eval_node === undefined || eval_node === null) {
        return;
    }

    if (eval_node.eval_icon !== eval_icon) {
        eval_node.eval_icon = eval_icon;
    }

    eval_node.eval_icon = eval_icon;

    if (eval_node !== undefined && eval_node !== null) {
        boardctx.drawImage(eval_icon, eval_icon_x, eval_icon_y,
            config.square_size * eval_icon_size,
            config.square_size * eval_icon_size);
    }
}


// ===================================
// FUNÇÕES AUXILIARES
// ===================================

function load_book_moves() {
    // === ATUALIZA O NOME DA ABERTURA ===
    const el = document.getElementById('openingname_text');

    if (!el) return;

    // Usa o eval_node para pegar a história de lances
    if (!eval_node) {
        el.textContent = 'Starting Position';
        el.style.color = '#fff';
        return;
    }

    // Constrói a string de lances no formato "1. e4 e5 2. Nf3"
    let nodes = [];
    let node = eval_node;
    while (node && node.move) {
        nodes.unshift(node);
        node = node.parent;
    }

    if (nodes.length === 0) {
        el.textContent = 'Starting Position';
        el.style.color = '#fff';
        last_opening_shown = 'start';
        return;
    }

    // Monta a string de lances com números
    let lances = '';
    for (let i = 0; i < nodes.length; i++) {
        let n = nodes[i];
        let moveNum = Math.floor(i / 2) + 1;
        let isWhite = (i % 2 === 0);

        if (isWhite) {
            lances += moveNum + '. ' + n.nice_move() + ' ';
        } else {
            lances += n.nice_move() + ' ';
        }
    }
    lances = lances.trim();

    console.log('📝 [BOOK] Lances formatados:', lances);

    let abertura = buscar_abertura(lances);

    if (abertura) {
        let eco = abertura.eco || '???';
        el.innerHTML = `<span style="color:#2196f3;font-weight:bold">${abertura.name}</span> <span style="background:#4caf50;color:white;padding:2px 8px;border-radius:3px;font-size:10px;margin-left:5px">${eco}</span>`;
        el.style.color = '#fff';

        let chave = abertura.name + eco;
        if (last_opening_shown !== chave) {
            last_opening_shown = chave;
            mostrar_popup_abertura(abertura);
            console.log('✅ [BOOK] Abertura:', abertura.name);
        }
    } else {
        el.textContent = lances.length > 30 ? 'Theory ends here' : 'Unknown Opening';
        el.style.color = '#999';
        last_opening_shown = null;
    }

    // 🔥 NÃO POPULAR O CACHE (para mostrar TODAS as setas)
    book_moves_cache = null;
    book_moves_cache_node_id = null;
}

function is_book_move(move) {
    // 🔥 SEMPRE RETORNA FALSE - NÃO FILTRAR NADA
    return false;
}

function is_book_move(move) {
    if (book_moves_cache === null) {
        return false;
    }

    for (let book_move of book_moves_cache) {
        if (book_move.move === move) {
            return true;
        }
    }

    return false;
}

function update_score() {
    if (!eval_node || !eval_node.board) return;

    let spans_w = "";
    let spans_b = "";

    let pawn_count_w = 8 - eval_node.board.find("P").length;
    let knight_count_w = 2 - eval_node.board.find("N").length;
    let bishop_count_w = 2 - eval_node.board.find("B").length;
    let rook_count_w = 2 - eval_node.board.find("R").length;
    let queen_count_w = 1 - eval_node.board.find("Q").length;

    let pawn_count_b = 8 - eval_node.board.find("p").length;
    let knight_count_b = 2 - eval_node.board.find("n").length;
    let bishop_count_b = 2 - eval_node.board.find("b").length;
    let rook_count_b = 2 - eval_node.board.find("r").length;
    let queen_count_b = 1 - eval_node.board.find("q").length;

    if (pawn_count_w === 1) {
        spans_w += `<span class="captured-pieces-w-pawn captured-pieces-cpiece"></span>`;
    } else if (pawn_count_w > 1) {
        spans_w += `<span class="captured-pieces-w-${pawn_count_w}-pawns captured-pieces-cpiece"></span>`;
    }

    if (bishop_count_w === 1) {
        spans_w += `<span class="captured-pieces-w-bishop captured-pieces-cpiece"></span>`;
    } else if (bishop_count_w === 2) {
        spans_w += `<span class="captured-pieces-w-2-bishops captured-pieces-cpiece"></span>`;
    }

    if (knight_count_w === 1) {
        spans_w += `<span class="captured-pieces-w-knight captured-pieces-cpiece"></span>`;
    } else if (knight_count_w === 2) {
        spans_w += `<span class="captured-pieces-w-2-knights captured-pieces-cpiece"></span>`;
    }

    if (rook_count_w === 1) {
        spans_w += `<span class="captured-pieces-w-rook captured-pieces-cpiece"></span>`;
    } else if (rook_count_w === 2) {
        spans_w += `<span class="captured-pieces-w-2-rooks captured-pieces-cpiece"></span>`;
    }

    if (queen_count_w === 1) {
        spans_w += `<span class="captured-pieces-w-queen captured-pieces-cpiece"></span>`;
    }

    if (pawn_count_b === 1) {
        spans_b += `<span class="captured-pieces-b-pawn captured-pieces-cpiece"></span>`;
    } else if (pawn_count_b > 1) {
        spans_b += `<span class="captured-pieces-b-${pawn_count_b}-pawns captured-pieces-cpiece"></span>`;
    }

    if (bishop_count_b === 1) {
        spans_b += `<span class="captured-pieces-b-bishop captured-pieces-cpiece"></span>`;
    } else if (bishop_count_b === 2) {
        spans_b += `<span class="captured-pieces-b-2-bishops captured-pieces-cpiece"></span>`;
    }

    if (knight_count_b === 1) {
        spans_b += `<span class="captured-pieces-b-knight captured-pieces-cpiece"></span>`;
    } else if (knight_count_b === 2) {
        spans_b += `<span class="captured-pieces-b-2-knights captured-pieces-cpiece"></span>`;
    }

    if (rook_count_b === 1) {
        spans_b += `<span class="captured-pieces-b-rook captured-pieces-cpiece"></span>`;
    } else if (rook_count_b === 2) {
        spans_b += `<span class="captured-pieces-b-2-rooks captured-pieces-cpiece"></span>`;
    }

    if (queen_count_b === 1) {
        spans_b += `<span class="captured-pieces-b-queen captured-pieces-cpiece"></span>`;
    }

    let total_score_w = pawn_count_w + knight_count_w * 3 + bishop_count_w * 3 + rook_count_w * 5 + queen_count_w * 9;
    let total_score_b = pawn_count_b + knight_count_b * 3 + bishop_count_b * 3 + rook_count_b * 5 + queen_count_b * 9;

    let score_w = 0;
    let score_b = 0;

    if (total_score_w > total_score_b) {
        score_w = total_score_w - total_score_b;
    } else if (total_score_b > total_score_w) {
        score_b = total_score_b - total_score_w;
    }

    if (score_w !== 0) {
        spans_w += `<span class="captured_score">+${score_w}</span>`;
    } else {
        spans_w += `<span class="captured_score"></span>`;
    }

    if (score_b !== 0) {
        spans_b += `<span class="captured_score">+${score_b}</span>`;
    } else {
        spans_b += `<span class="captured_score"></span>`;
    }

    try {
        if (config.flip) {
            captured_upper.innerHTML = spans_b;
            captured_lower.innerHTML = spans_w;
        } else {
            captured_upper.innerHTML = spans_w;
            captured_lower.innerHTML = spans_b;
        }
    } catch (e) { }
}

// ===================================
// 🎨 ESTILOS CSS PARA ANIMAÇÃO DE MATE
// ===================================
(function injectMateStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Lances intermediários da sequência de mate - CYAN */
        .nibbler-mate-origin {
            background-color: rgba(0, 255, 255, 0.5) !important;
            box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.8);
            animation: pulse-cyan 1s ease-in-out;
        }
        
        .nibbler-mate-destination {
            background-color: rgba(0, 200, 255, 0.6) !important;
            box-shadow: inset 0 0 25px rgba(0, 200, 255, 0.9);
            animation: pulse-cyan 1s ease-in-out;
        }
        
        /* Lance FINAL de mate - DOURADO piscante */
        .nibbler-mate-final-origin {
            background-color: rgba(255, 215, 0, 0.7) !important;
            box-shadow: inset 0 0 30px rgba(255, 215, 0, 1), 0 0 20px rgba(255, 215, 0, 0.8);
            animation: pulse-gold 1.5s ease-in-out infinite;
        }
        
        .nibbler-mate-final-destination {
            background-color: rgba(255, 180, 0, 0.8) !important;
            box-shadow: inset 0 0 40px rgba(255, 215, 0, 1), 0 0 30px rgba(255, 215, 0, 0.9);
            animation: pulse-gold-intense 1.5s ease-in-out infinite;
            border: 3px solid gold !important;
        }
        
        @keyframes pulse-cyan {
            0%, 100% {
                box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.8);
            }
            50% {
                box-shadow: inset 0 0 35px rgba(0, 255, 255, 1);
            }
        }
        
        @keyframes pulse-gold {
            0%, 100% {
                box-shadow: inset 0 0 30px rgba(255, 215, 0, 1), 0 0 20px rgba(255, 215, 0, 0.8);
                transform: scale(1);
            }
            50% {
                box-shadow: inset 0 0 50px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 1);
                transform: scale(1.05);
            }
        }
        
        @keyframes pulse-gold-intense {
            0%, 100% {
                box-shadow: inset 0 0 40px rgba(255, 215, 0, 1), 0 0 30px rgba(255, 215, 0, 0.9);
                transform: scale(1);
            }
            50% {
                box-shadow: inset 0 0 60px rgba(255, 255, 0, 1), 0 0 50px rgba(255, 215, 0, 1);
                transform: scale(1.08);
            }
        }
        
        @keyframes pulse-scale {
            0%, 100% {
                transform: translate(-50%, -50%) scale(1);
            }
            50% {
                transform: translate(-50%, -50%) scale(1.05);
            }
        }
    `;
    document.head.appendChild(style);
})();

// =====================================================
// 📂 PGN BROWSER - NAVEGADOR DE PARTIDAS
// =====================================================

let pgnBrowserFs = null;
let pgnBrowserPath = null;
let pgnBrowserCurrentFile = null;
let pgnBrowserGames = [];

// Tenta carregar módulos Node.js de forma segura
try {
    pgnBrowserFs = require('fs');
    pgnBrowserPath = require('path');
    console.log('✅ PGN Browser: módulos carregados');
} catch (e) {
    console.warn('⚠️ PGN Browser: módulos fs/path não disponíveis');
}

// Inicializa o navegador de PGN quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    if (pgnBrowserFs && pgnBrowserPath) {
        setTimeout(initPgnBrowser, 1000);
    }
});

function initPgnBrowser() {
    const select = document.getElementById('pgn_file_select');
    if (!select) {
        console.log('PGN Panel: elemento não encontrado, tentando novamente...');
        setTimeout(initPgnBrowser, 500);
        return;
    }

    select.addEventListener('change', (e) => {
        if (e.target.value) {
            loadPgnFile(e.target.value);
        } else {
            document.getElementById('pgn_games').innerHTML = '';
        }
    });

    loadPgnFileList();
}

function getPgnDir() {
    if (!pgnBrowserPath) return null;

    // Tenta vários caminhos possíveis
    const possiblePaths = [
        pgnBrowserPath.join(__dirname, '..', 'pgn'),
        pgnBrowserPath.join(__dirname, 'pgn'),
        pgnBrowserPath.join(process.cwd(), 'pgn'),
        pgnBrowserPath.join(process.cwd(), 'files', 'pgn'),
    ];

    for (const p of possiblePaths) {
        if (pgnBrowserFs && pgnBrowserFs.existsSync(p)) {
            console.log('PGN Panel: pasta encontrada em', p);
            return p;
        }
    }

    console.log('PGN Panel: pasta não encontrada. Tentativas:', possiblePaths);
    return null;
}

function loadPgnFileList() {
    const select = document.getElementById('pgn_file_select');
    if (!select) return;

    if (!pgnBrowserFs || !pgnBrowserPath) {
        console.log('PGN Panel: módulos fs/path não disponíveis');
        return;
    }

    const pgnDir = getPgnDir();

    if (!pgnDir) {
        console.log('PGN Panel: pasta pgn não encontrada');
        return;
    }

    try {
        const files = pgnBrowserFs.readdirSync(pgnDir).filter(f => f.endsWith('.pgn'));

        files.sort((a, b) => a.localeCompare(b));

        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file.replace('.pgn', '');
            select.appendChild(option);
        });

        console.log('PGN Panel:', files.length, 'arquivos carregados');

    } catch (e) {
        console.error('Erro ao carregar lista PGN:', e);
    }
}

function loadPgnFile(filename) {
    if (!pgnBrowserFs || !pgnBrowserPath) return;

    pgnBrowserCurrentFile = filename;

    const pgnDir = getPgnDir();
    if (!pgnDir) return;

    const filePath = pgnBrowserPath.join(pgnDir, filename);

    try {
        const content = pgnBrowserFs.readFileSync(filePath, 'utf-8');
        const games = parsePgnGames(content);
        pgnBrowserGames = games;
        renderGameList(games);
        console.log('PGN Panel:', games.length, 'partidas em', filename);
    } catch (e) {
        console.error('Erro ao ler PGN:', e);
    }
}

function parsePgnGames(content) {
    const games = [];
    const gameBlocks = content.split(/\n\n(?=\[Event)/);

    gameBlocks.forEach((block, index) => {
        if (!block.trim()) return;

        const game = {
            index: index,
            headers: {},
            moves: ''
        };

        const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
        let match;
        while ((match = headerRegex.exec(block)) !== null) {
            game.headers[match[1]] = match[2];
        }

        const movesStart = block.lastIndexOf(']\n');
        if (movesStart > -1) {
            game.moves = block.substring(movesStart + 2).trim();
        }

        if (game.headers.White || game.headers.Black) {
            games.push(game);
        }
    });

    return games;
}

function renderGameList(games) {
    const container = document.getElementById('pgn_games');
    if (!container) return;

    if (games.length === 0) {
        container.innerHTML = '<div style="color:#666;padding:10px;font-size:12px;">Nenhuma partida</div>';
        return;
    }

    container.innerHTML = '';

    games.forEach((game, index) => {
        const white = game.headers.White || '?';
        const black = game.headers.Black || '?';
        const result = game.headers.Result || '*';
        const event = game.headers.Event || '';
        const date = game.headers.Date || '';

        const item = document.createElement('div');
        item.className = 'pgn_game';
        item.innerHTML = `
            <span class="pgn_game_result">${result}</span>
            <div class="pgn_game_white">${white}</div>
            <div class="pgn_game_black">vs ${black}</div>
            ${event || date ? `<div class="pgn_game_info">${event} ${date}</div>` : ''}
        `;
        item.onclick = () => loadGameFromList(index);
        container.appendChild(item);
    });
}

function loadGameFromList(index) {
    const game = pgnBrowserGames[index];
    if (!game) return;

    let pgn = '';
    for (const [key, value] of Object.entries(game.headers)) {
        pgn += `[${key} "${value}"]\n`;
    }
    pgn += '\n' + game.moves;

    if (typeof hub !== 'undefined' && hub.load_from_string) {
        hub.load_from_string(pgn);
    } else {
        try {
            if (typeof ipcRenderer !== 'undefined') {
                ipcRenderer.send('call', { fn: 'load_from_string', args: [pgn] });
            }
        } catch (e) {
            console.error('Erro ao carregar partida:', e);
        }
    }
}