const fs = require('fs');
const path = require('path');

console.log('🎨 Aplicando melhorias visuais do Chess.com Redesign...\n');

// Estrutura do projeto
const projectRoot = __dirname;
const filesDir = path.join(projectRoot, 'files');
const redesignDir = path.join(projectRoot, 'redesign');

// Verificar se o redesign foi clonado
if (!fs.existsSync(redesignDir)) {
    console.error('❌ Pasta "redesign" não encontrada!');
    console.log('Execute primeiro: git clone https://github.com/crkco/Chess.com-Redesign-of-Nibbler-GUI redesign');
    process.exit(1);
}

// Arquivos a copiar (com efeitos visuais)
const filesToCopy = [
    'node_eval/move_animation.js',
    'node_eval/analysis.js',
    'renderer/81_arrows.js',
    'audio/chesssounds.js'
];

// Backup
const backupDir = path.join(projectRoot, 'backup_' + Date.now());
console.log(`📦 Criando backup em: ${backupDir}\n`);
fs.mkdirSync(backupDir, { recursive: true });

// Copiar arquivos
let copiedCount = 0;
let errorCount = 0;

filesToCopy.forEach(file => {
    const source = path.join(redesignDir, file);
    const dest = path.join(filesDir, file);
    const backup = path.join(backupDir, file);
    
    try {
        // Fazer backup do original
        if (fs.existsSync(dest)) {
            const backupFolder = path.dirname(backup);
            fs.mkdirSync(backupFolder, { recursive: true });
            fs.copyFileSync(dest, backup);
            console.log(`  💾 Backup: ${file}`);
        }
        
        // Copiar novo arquivo
        if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            console.log(`  ✅ Copiado: ${file}`);
            copiedCount++;
        } else {
            console.log(`  ⚠️  Não encontrado: ${file}`);
            errorCount++;
        }
    } catch (error) {
        console.error(`  ❌ Erro ao processar ${file}:`, error.message);
        errorCount++;
    }
});

// Aplicar patches específicos ao CSS
console.log('\n🎨 Aplicando patches CSS...\n');

const cssFile = path.join(filesDir, 'nibbler.css');
const cssBackup = path.join(backupDir, 'nibbler.css');

try {
    // Backup CSS
    fs.copyFileSync(cssFile, cssBackup);
    
    let css = fs.readFileSync(cssFile, 'utf8');
    
    // Adicionar efeitos de movimento se não existirem
    if (!css.includes('.piece-moving')) {
        const movementEffects = `

/* ===== EFEITOS VISUAIS DO CHESS.COM REDESIGN ===== */

/* Efeito azul de movimento */
.piece-moving {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 20px rgba(0, 123, 255, 0.8),
                0 0 40px rgba(0, 123, 255, 0.4);
    filter: brightness(1.2);
    z-index: 10 !important;
}

/* Rastro azul */
.move-trail {
    position: absolute;
    background: radial-gradient(circle, rgba(0, 123, 255, 0.5) 0%, 
                                       rgba(0, 123, 255, 0.2) 50%, 
                                       transparent 100%);
    pointer-events: none;
    z-index: 3;
    animation: trail-fade 0.5s ease-out forwards;
}

@keyframes trail-fade {
    from { opacity: 1; }
    to { opacity: 0; }
}

/* Highlight da casa de destino */
.square-highlight {
    background-color: rgba(0, 123, 255, 0.3) !important;
    animation: pulse-highlight 0.6s ease-in-out;
}

@keyframes pulse-highlight {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
}

/* Estilo para texto de qualidade do movimento */
.move-quality {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 24px;
    font-weight: bold;
    color: white;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    animation: move-quality-appear 1s ease-out;
    pointer-events: none;
    z-index: 100;
}

@keyframes move-quality-appear {
    0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.5);
    }
    50% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.1);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1);
    }
}

/* ===== FIM DOS EFEITOS ===== */
`;
        css += movementEffects;
        fs.writeFileSync(cssFile, css);
        console.log('  ✅ Patches CSS aplicados');
    } else {
        console.log('  ℹ️  Efeitos CSS já existem');
    }
} catch (error) {
    console.error('  ❌ Erro ao aplicar patches CSS:', error.message);
    errorCount++;
}

// Resumo
console.log('\n' + '='.repeat(50));
console.log(`✅ Arquivos copiados: ${copiedCount}`);
if (errorCount > 0) {
    console.log(`⚠️  Avisos/Erros: ${errorCount}`);
}
console.log(`💾 Backup salvo em: ${backupDir}`);
console.log('='.repeat(50));

console.log('\n🚀 Próximos passos:');
console.log('1. Execute: npx electron .');
console.log('2. Configure o motor Lc0 em "Engine > Choose engine..."');
console.log('3. Jogue uma partida para ver os efeitos visuais!\n');

console.log('⚠️  Se algo der errado, restaure o backup copiando os arquivos de volta.\n');