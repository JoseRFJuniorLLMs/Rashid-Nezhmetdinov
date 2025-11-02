// 🎯 SISTEMA DE FILTRO DE SETAS - MODIFICADO PARA MOSTRAR TUDO POR PADRÃO
let current_arrow_filter = "all";

function init_arrow_filter_menu() {
    // ⚡ FORÇA CONFIGURAÇÃO INICIAL PARA MOSTRAR TODAS AS SETAS
    if (typeof config !== 'undefined') {
        config.arrow_filter_type = "all";
        config.arrows_enabled = true;
        
        // 🔥 FORÇA MultiPV ALTO PARA MOSTRAR TODAS AS LINHAS
        if (typeof hub !== 'undefined' && hub.engine) {
            // Força MultiPV = 500 (suficiente para mostrar TODAS as jogadas possíveis)
            hub.engine.setoption("MultiPV", 500);
            console.log('✅ MultiPV configurado para 500 (mostrar TODAS as linhas)');
        }
        
        console.log('✅ Filtro de setas inicializado: MOSTRAR TUDO');
    }
    
    const buttons = document.querySelectorAll('.arrow-filter-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            
            // Remove active de todos
            buttons.forEach(b => b.classList.remove('active'));
            
            // Ativa o clicado
            btn.classList.add('active');
            
            // Atualiza filtro global
            current_arrow_filter = filter;
            
            // Aplica no config
            apply_arrow_filter(filter);
            
            // Redesenha imediatamente
            if (typeof hub !== 'undefined' && hub.draw) {
                hub.draw();
            }
            
            console.log(`🎯 Filtro de setas alterado: ${filter}`);
        });
    });
}

function apply_arrow_filter(filter) {
    if (typeof config === 'undefined') {
        console.warn('⚠️ Config não disponível ainda');
        return;
    }
    
    switch(filter) {
        case "all":
            config.arrow_filter_type = "all";
            console.log('📊 Mostrando TODAS as setas');
            break;
            
        case "best":
            config.arrow_filter_type = "best3";
            console.log('📊 Mostrando TOP 3 melhores');
            break;
            
        case "top":
            config.arrow_filter_type = "top";
            console.log('📊 Mostrando SÓ A MELHOR');
            break;
            
        case "n5":
            config.arrow_filter_type = "N";
            config.arrow_filter_value = 0.05;
            console.log('📊 Filtrando N > 5%');
            break;
            
        case "n10":
            config.arrow_filter_type = "N";
            config.arrow_filter_value = 0.10;
            console.log('📊 Filtrando N > 10%');
            break;
            
        case "n20":
            config.arrow_filter_type = "N";
            config.arrow_filter_value = 0.20;
            console.log('📊 Filtrando N > 20%');
            break;
    }
}

// ⚡ FORÇA CONFIGURAÇÃO IMEDIATAMENTE (antes mesmo do DOMContentLoaded)
(function forceInitialConfig() {
    let checkInterval = setInterval(() => {
        if (typeof config !== 'undefined') {
            config.arrow_filter_type = "all";
            config.arrows_enabled = true;
            console.log('⚡ Configuração forçada: MOSTRAR TODAS AS SETAS');// 🎯 SISTEMA DE FILTRO DE SETAS - MODIFICADO PARA MOSTRAR TUDO POR PADRÃO
let current_arrow_filter = "all";

function init_arrow_filter_menu() {
    // ⚡ FORÇA CONFIGURAÇÃO INICIAL PARA MOSTRAR TODAS AS SETAS
    if (typeof config !== 'undefined') {
        config.arrow_filter_type = "all";
        config.arrows_enabled = true;
        console.log('✅ Filtro de setas inicializado: MOSTRAR TUDO');
    }
    
    const buttons = document.querySelectorAll('.arrow-filter-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            
            // Remove active de todos
            buttons.forEach(b => b.classList.remove('active'));
            
            // Ativa o clicado
            btn.classList.add('active');
            
            // Atualiza filtro global
            current_arrow_filter = filter;
            
            // Aplica no config
            apply_arrow_filter(filter);
            
            // Redesenha imediatamente
            if (typeof hub !== 'undefined' && hub.draw) {
                hub.draw();
            }
            
            console.log(`🎯 Filtro de setas alterado: ${filter}`);
        });
    });
}

function apply_arrow_filter(filter) {
    if (typeof config === 'undefined') {
        console.warn('⚠️ Config não disponível ainda');
        return;
    }
    
    switch(filter) {
        case "all":
            config.arrow_filter_type = "all";
            console.log('📊 Mostrando TODAS as setas');
            break;
            
        case "best":
            config.arrow_filter_type = "best3";
            console.log('📊 Mostrando TOP 3 melhores');
            break;
            
        case "top":
            config.arrow_filter_type = "top";
            console.log('📊 Mostrando SÓ A MELHOR');
            break;
            
        case "n5":
            config.arrow_filter_type = "N";
            config.arrow_filter_value = 0.05;
            console.log('📊 Filtrando N > 5%');
            break;
            
        case "n10":
            config.arrow_filter_type = "N";
            config.arrow_filter_value = 0.10;
            console.log('📊 Filtrando N > 10%');
            break;
            
        case "n20":
            config.arrow_filter_type = "N";
            config.arrow_filter_value = 0.20;
            console.log('📊 Filtrando N > 20%');
            break;
    }
}

// ⚡ FORÇA CONFIGURAÇÃO IMEDIATAMENTE (antes mesmo do DOMContentLoaded)
(function forceInitialConfig() {
    let checkInterval = setInterval(() => {
        if (typeof config !== 'undefined') {
            config.arrow_filter_type = "all";
            config.arrows_enabled = true;
            console.log('⚡ Configuração forçada: MOSTRAR TODAS AS SETAS');
            clearInterval(checkInterval);
        }
    }, 100);
    
    // Desiste após 5 segundos
    setTimeout(() => clearInterval(checkInterval), 5000);
})();

// Inicializa quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    init_arrow_filter_menu();
});