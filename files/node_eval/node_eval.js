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
// ✨ EFEITO AZUL COM TRILHA ANIMADA
// ===================================
function applySquareEffect(fromSquare, toSquare) {
    const allSquares = document.querySelectorAll('#boardfriends td');
    allSquares.forEach(cell => {
        cell.classList.remove('nibbler-move-origin', 'nibbler-move-destination', 'nibbler-move-trail');
    });

    if (!fromSquare || !toSquare) return;

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
function showMoveQualityPopup(qualityType) {
    const oldPopup = document.querySelector('.nibbler-quality-popup');
    if (oldPopup) oldPopup.remove();

    let quality = getMoveQualityByType(qualityType);
    if (!quality) return;

    const popup = document.createElement('div');
    popup.className = 'nibbler-quality-popup';
    popup.style.borderColor = quality.color;
    
    // 🎯 POSIÇÃO FIXA NO CANTO INFERIOR DIREITO
    popup.style.position = 'fixed';
    popup.style.bottom = '30px';
    popup.style.right = '30px';
    popup.style.zIndex = '99999';
    popup.style.margin = '0';
    popup.style.transform = 'none';
    popup.style.left = 'auto';
    popup.style.top = 'auto';

    // Estilo especial para sacrifícios épicos
    if (qualityType === 'SACRIFICE_QUEEN' || qualityType === 'SACRIFICE_ROOK') {
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

    const duration = (qualityType === 'SACRIFICE_QUEEN' || qualityType === 'SACRIFICE_ROOK') ? 2400 : 1600;
    setTimeout(() => popup.remove(), duration);
}

function getMoveQualityByType(type) {
    // Se for string (tipo especial)
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

    // Se for número (eval_diff normal)
    if (type === 0) return { icon: '✔', color: '#96BC4B', text: 'MELHOR LANCE' };
    if (type <= 2) return { icon: '⚡', color: '#96BC4B', text: 'EXCELENTE' };
    if (type <= 5) return { icon: '▽', color: '#96AF8B', text: 'BOM LANCE' };
    if (type <= 10) return { icon: '?!', color: '#F0C15C', text: 'IMPRECISÃO' };
    if (type <= 20) return { icon: '?', color: '#E58F2A', text: 'ERRO' };
    return { icon: '✕', color: '#CA3431', text: 'ERRO GRAVE' };
}

// 🆕 Versão antiga mantida para compatibilidade
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
        return;
    }

    update_score();

    while (eval_node.move === null && eval_node.parent !== null) {
        eval_node = eval_node.parent;
    }

    if (eval_node.move === null) {
        is_eval_visible = false;
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
// 🆕 DRAW_NODE_EVAL - COM DETECÇÃO CORRIGIDA
// ===================================
// ===================================
// 🆕 DRAW_NODE_EVAL - COM DETECÇÃO CORRIGIDA
// ===================================
function draw_node_eval() {
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

        eval_diff = current_eval - parent_eval;

        if (eval_diff > 0 || parent_info_list[0].move == eval_node.move) {
            eval_diff = 0;
        }

        eval_diff = - 1 * eval_diff;
        eval_node.eval_diff = eval_diff;
    }

    // Checkmate
    if (eval_node.board.no_moves() && eval_node.board.king_in_check()) {
        eval_icon = winner_img;
        eval_diff = 0;
    } else if (!(hub.engine.search_running.node && hub.engine.search_running === hub.engine.search_desired)
        && !(hub.engine.search_running !== hub.engine.search_desired)) {
        if (eval_node.table.nodes === 0) {
            eval_icon = null;
            return;
        }
    }

    // ===================================
    // 🆕 LÓGICA DE DETECÇÃO DE SACRIFÍCIO CORRIGIDA
    // ===================================
    try {
        const move = eval_node.move_old_format();
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        
        // Detecta qual peça foi movida E qual foi capturada
        const peca_movida = eval_node.parent.board.piece(from);
        const peca_capturada = eval_node.parent.board.piece(to);
        
        console.log(`📊 🔍 DEBUG INICIAL:`);
        console.log(`📊 from="${from}", to="${to}"`);
        console.log(`📊 peca_movida="${peca_movida}", peca_capturada="${peca_capturada}"`);
        
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
        
        // CÁLCULO DIRETO: quanto "perdeu" no lance
        const sacrificio_liquido = valor_peca_movida - valor_peca_capturada;
        
        console.log(`📊 valor_peca_movida=${valor_peca_movida}`);
        console.log(`📊 valor_peca_capturada=${valor_peca_capturada}`);
        console.log(`📊 sacrificio_liquido=${sacrificio_liquido}`);
        
        // Calcula material total do tabuleiro
        let material_antes = getMaterialValue(eval_node.parent.board);
        let material_depois = getMaterialValue(eval_node.board);
        
        let cor_que_jogou = eval_node.board.turn === 'w' ? 'b' : 'w';
        
        // Mudança de placar (quanto melhorou a posição)
        let mudanca_placar = parent_eval - current_eval;
        if (cor_que_jogou === 'b') {
            mudanca_placar *= -1;
        }
        
        // Calcula perda material REAL
        let mudanca_material_bruto = material_depois - material_antes;
        if (cor_que_jogou === 'b') {
            mudanca_material_bruto *= -1;
        }
        
        // Se perdeu material após o lance = sacrifício (valor NEGATIVO significa perda!)
        let perda_material = mudanca_material_bruto < 0 ? Math.abs(mudanca_material_bruto) : 0;
        
        // 📊 DEBUG COMPLETO
        console.log(`📊 ========== LANCE #${eval_node.depth} ==========`);
        console.log(`📊 Lance: ${move}`);
        console.log(`📊 Peça movida: ${peca_movida} (valor: ${valor_peca_movida})`);
        console.log(`📊 Peça capturada: ${peca_capturada || 'nenhuma'} (valor: ${valor_peca_capturada})`);
        console.log(`📊 Material antes: ${material_antes}`);
        console.log(`📊 Material depois: ${material_depois}`);
        console.log(`📊 Mudança material bruto: ${mudanca_material_bruto}`);
        console.log(`📊 Perda material: ${perda_material}`);
        console.log(`📊 Parent eval: ${parent_eval.toFixed(2)}, Current eval: ${current_eval.toFixed(2)}`);
        console.log(`📊 Mudança placar: ${mudanca_placar.toFixed(2)}`);
        console.log(`📊 Eval diff: ${eval_diff}`);
        console.log(`📊 Cor que jogou: ${cor_que_jogou}`);
        console.log(`📊 🔍 TESTE SACRIFÍCIO DAMA: perda=${perda_material} >= 6? mudanca=${mudanca_placar.toFixed(2)} >= 20?`);
        console.log(`📊 🔍 TESTE SACRIFÍCIO TORRE: perda=${perda_material} >= 2 e < 6? mudanca=${mudanca_placar.toFixed(2)} >= 10?`);
        // MOSTRA POPUP (com lógica anti-pisca)
        if (eval_node.id !== last_popup_node_id && eval_node.depth > 0) {
            
            let tipo_detectado = null;
            let eh_sacrificio = false;
            
            // ===================================
            // 🎭 CLASSIFICAÇÃO CORRETA DE SACRIFÍCIOS
            // Baseado na teoria de xadrez real
            // ===================================
            
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
            // 1️⃣ PSEUDO-SACRIFÍCIO (Combinação)
            // Material recuperado imediatamente
            // ===================================
            if (perda_material >= 1 && eval_diff === 0) {
                // Se perdeu material MAS é o melhor lance = vai recuperar à força!
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
            // Perda material pequena (eval_diff ≤ 20) = vitória forçada próxima
            // ===================================
            else if (perda_material >= 1 && eval_diff <= 20 && mudanca_placar > 0) {
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
            // 3️⃣ SACRIFÍCIO POSICIONAL/ESTRATÉGICO (AGORA INCLUI ESPECULATIVO)
            // Perda moderada (eval_diff ≤ 100) = compensação de longo prazo
            // MUDANÇA APLICADA AQUI: eval_diff <= 100
            // ===================================
            else if (perda_material >= 1 && eval_diff <= 100) {
                // Sacrifício de Qualidade (Torre por Bispo/Cavalo)
                if (valor_peca_movida === 5 && valor_peca_capturada === 3) {
                    tipo_detectado = 'GREAT_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⭐ SACRIFÍCIO DE QUALIDADE! (Torre por peça menor)`);
                }
                // Dama sacrificada posicionalmente
                else if (valor_peca_movida >= 9) {
                    tipo_detectado = 'SACRIFICE_QUEEN';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 👑 SACRIFÍCIO POSICIONAL DE DAMA! (Estilo Nezhmetdinov)`);
                }
                // Torre sacrificada posicionalmente
                else if (valor_peca_movida >= 5) {
                    tipo_detectado = 'SACRIFICE_ROOK';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 🏰 SACRIFÍCIO POSICIONAL DE TORRE!`);
                }
                // Peça menor por compensação posicional
                else if (valor_peca_movida >= 3) {
                    tipo_detectado = 'GREAT_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⭐ SACRIFÍCIO POSICIONAL! (Compensação de longo prazo)`);
                }
                // Gambitos posicionais
                else if (eval_node.depth <= 15) {
                    tipo_detectado = 'GOOD_SACRIFICE';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ ⚡ GAMBITO POSICIONAL! (Controle, desenvolvimento)`);
                }
            }
            
            // ===================================
            // 4️⃣ SACRIFÍCIO ESPECULATIVO/INTUITIVO (REMOVIDO E INTEGRADO NO BLOCO 3)
            // Perda maior (eval_diff ≤ 100) = "À la Tal"
            // ===================================
            // **Este bloco foi removido, pois suas condições foram absorvidas pelo bloco 3**
            /*
            else if (perda_material >= 3 && eval_diff <= 100) {
                if (valor_peca_movida >= 9) {
                    tipo_detectado = 'SACRIFICE_QUEEN';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 👑 SACRIFÍCIO ESPECULATIVO DE DAMA! (Estilo Mikhail Tal)`);
                }
                else if (valor_peca_movida >= 5) {
                    tipo_detectado = 'SACRIFICE_ROOK';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 🏰 SACRIFÍCIO ESPECULATIVO DE TORRE! (Ataque intuitivo)`);
                }
                else {
                    tipo_detectado = 'BRILLIANT';
                    eh_sacrificio = true;
                    console.log(`📊 ✅ 💎 SACRIFÍCIO ESPECULATIVO! (Jogada psicológica)`);
                }
            }
            */
            
            // ===================================
            // 🎨 SE É SACRIFÍCIO, MOSTRA POPUP ÉPICO
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
            
            // ===================================
            // 📊 SE NÃO É SACRIFÍCIO, USA LÓGICA NORMAL
            // ===================================
            else {
                console.log(`📊 ℹ️ Lance normal (sem sacrifício detectado)`);
                showMoveQualityPopup(eval_diff);
                
                if (eval_diff === 0) { 
                    eval_icon = best_img;
                    console.log(`📊 ✅ Melhor lance`);
                }
                else if (eval_diff <= 2) { 
                    eval_icon = excellent_img;
                    console.log(`📊 ✅ Excelente`);
                }
                else if (eval_diff <= 5) { 
                    eval_icon = good_img;
                    console.log(`📊 ✅ Bom`);
                }
                else if (eval_diff <= 10) { 
                    eval_icon = inaccuracy_img;
                    console.log(`📊 ⚠️ Imprecisão`);
                }
                else if (eval_diff <= 20) { 
                    eval_icon = mistake_img;
                    console.log(`📊 ⚠️ Erro`);
                }
                else { 
                    eval_icon = blunder_img;
                    console.log(`📊 ❌ Erro grave`);
                }
            }
            
            last_popup_node_id = eval_node.id;
        }

    } catch (e) {
        console.warn('❌ Erro na detecção de sacrifício:', e);
        
        // Fallback para lógica antiga
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

    // Livro de aberturas
    if (eval_node.depth <= 10) {
        load_book_moves();

        if (is_book_move(eval_node.move)) {
            eval_icon = book_img;
        }
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
// FUNÇÕES AUXILIARES (mantidas)
// ===================================

function load_book_moves() {
    try {
        if (hub.tree.node.parent === null) {
            openingname_text.innerHTML = "Starting Position";
            return;
        }
    } catch (e) {
        return;
    }

    let ok = true;

    if (config.looker_api !== "lichess_masters" && config.looker_api !== "lichess_plebs") {
        ok = false;
    }

    let current_node = hub.tree.node;
    let current_entry = hub.looker.lookup(config.looker_api, current_node.board);

    if (current_entry !== null) {
        while (current_entry.opening === "null" && current_node.parent !== null) {
            current_node = current_node.parent;
            current_entry = hub.looker.lookup(config.looker_api, current_node.board);

            if (current_entry === null) {
                break;
            }
        }

        try {
            openingname_text.innerHTML = current_entry?.opening;
        } catch (e) { }
    }

    let entry = hub.looker.lookup(config.looker_api, hub.tree.node.parent.board);

    if (!entry) {
        ok = false;
    }

    if (!ok) {
        book_moves_cache = null;
        book_moves_cache_node_id = null;
        return;
    }

    if (!book_moves_cache || book_moves_cache_node_id !== hub.tree.node.parent.id) {
        let tmp = {};
        for (let move of Object.keys(entry.moves)) {
            if (!hub.tree.node.parent.board.illegal(move)) {
                if (tmp[move] === undefined) {
                    tmp[move] = { move: move };
                }
            }
        }
        book_moves_cache_node_id = hub.tree.node.parent.id;
        book_moves_cache = Object.values(tmp);
    }
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