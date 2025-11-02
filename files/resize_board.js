// Resize board functionality
(function() {
    let currentScale = 1.0;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 3.0;
    const STEP = 0.2;

    function resizeBoard(scale) {
        currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
        
        const gridder = document.getElementById('gridder');
        const boardElements = [
            document.getElementById('boardsquares'),
            document.getElementById('canvas'),
            document.getElementById('boardfriends'),
            document.getElementById('dragging_piece'),
            document.getElementById('moving_piece')
        ];
        
        boardElements.forEach(el => {
            if (el) {
                el.style.transform = `scale(${currentScale})`;
                el.style.transformOrigin = 'top left';
            }
        });
        
        // Ajustar wrapper se necessário
        if (gridder) {
            const baseSize = 480; // tamanho base do tabuleiro
            const newSize = baseSize * currentScale;
            gridder.style.minHeight = newSize + 'px';
        }
        
        console.log(`🎯 Tamanho do tabuleiro: ${Math.round(currentScale * 100)}%`);
    }

    function increaseBoardSize() {
        resizeBoard(currentScale + STEP);
    }

    function decreaseBoardSize() {
        resizeBoard(currentScale - STEP);
    }

    function resetBoardSize() {
        resizeBoard(1.0);
    }

    // Expor funções globalmente
    window.increaseBoardSize = increaseBoardSize;
    window.decreaseBoardSize = decreaseBoardSize;
    window.resetBoardSize = resetBoardSize;
    window.resizeBoard = resizeBoard;

    // Atalhos de teclado (opcional - você pode remover se não quiser)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                increaseBoardSize();
            } else if (e.key === '-') {
                e.preventDefault();
                decreaseBoardSize();
            } else if (e.key === '0') {
                e.preventDefault();
                resetBoardSize();
            }
        }
    });

    console.log('✅ Resize board carregado! Use os botões + e - para ajustar o tamanho.');
})();