"use strict";

// ============================================================================
// Modo Humano (hotseat 2 jogadores) — RELÓGIO DE XADREZ real + auto-flip
// ============================================================================
// Botão "👤" na barra #buttoncontrols liga/desliga. Com o modo LIGADO:
//   • relógio grande (Brancas / Pretas), ajustável (min + incremento);
//   • MECÂNICA DE RELÓGIO REAL: mexes a peça e o TEU relógio continua a correr
//     e a PISCAR a avisar — tens de BATER (clicar no relógio ou no botão BATER)
//     para parar o teu e arrancar o do adversário;
//   • ao bater, soma-se o incremento a quem jogou e o tabuleiro roda para o
//     próximo jogador ficar de frente;
//   • bandeira: ao chegar a 0, pára e fica vermelho.
// Módulo ISOLADO: só acrescenta a `hub` + DOM próprio. Carregado DEPOIS de
// 99_start.js (onde `hub` é criado), senão rebentava no load.
// ============================================================================

(function() {

	let state = {
		on: false,
		base_ms: 5 * 60 * 1000,   // 5 min (default)
		inc_ms: 3 * 1000,         // +3s (default)
		clock: { w: 0, b: 0 },
		active: "w",              // lado cujo relógio está a correr
		awaiting_press: false,    // jogou-se e ainda não bateu -> PISCA
		running: false,
		flagged: null,
		last: 0,
		timer: null,
	};

	function fmt(ms) {
		if (ms <= 0) return "0:00";
		let s = Math.ceil(ms / 1000);
		if (s < 20) {                                   // abaixo de 20s mostra décimos
			let t = Math.ceil(ms / 100) / 10;
			return t.toFixed(1);
		}
		return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
	}

	function now() { return performance.now(); }
	function active_side() { try { return hub.tree.node.board.active; } catch (e) { return "w"; } }

	// Vira o tabuleiro para `side` ("w"/"b") ficar EM BAIXO (reusa toggle_flip).
	function face(side) {
		if (config.flip !== (side === "b")) { hub.toggle_flip(); }
	}

	// ---- DOM -----------------------------------------------------------------
	let ui = null;
	function inject_style() {
		if (document.getElementById("hm_style")) return;
		let st = document.createElement("style");
		st.id = "hm_style";
		st.textContent =
			"@keyframes hm_blink{0%,100%{box-shadow:0 0 0 6px #f1c40f, 0 0 26px 6px rgba(241,196,15,.7)}50%{box-shadow:0 0 0 6px rgba(241,196,15,0)}}" +
			".hm_blink{animation:hm_blink .55s steps(1,end) infinite;}" +
			"@keyframes hm_pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}" +
			".hm_pulse{animation:hm_pulse .55s ease-in-out infinite;}";
		document.head.appendChild(st);
	}

	function build_ui() {
		if (ui) return;
		inject_style();
		ui = document.createElement("div");
		ui.id = "humanmode_panel";
		ui.style.cssText = "position:fixed;top:64px;right:16px;z-index:99998;font-family:-apple-system,Segoe UI,sans-serif;" +
			"background:#1e1e1e;border:1px solid #444;border-radius:12px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.6);width:270px;display:none;";
		ui.innerHTML =
			'<div id="hm_clock_b" style="text-align:center;font-size:60px;font-weight:800;color:#eee;background:#111;border-radius:8px;padding:8px 0;letter-spacing:2px;cursor:pointer;font-variant-numeric:tabular-nums;">5:00</div>' +
			'<div style="text-align:center;font-size:12px;color:#999;margin:3px 0 8px;">◼ PRETAS</div>' +
			'<div style="text-align:center;font-size:12px;color:#999;margin:8px 0 3px;">◻ BRANCAS</div>' +
			'<div id="hm_clock_w" style="text-align:center;font-size:60px;font-weight:800;color:#111;background:#eee;border-radius:8px;padding:8px 0;letter-spacing:2px;cursor:pointer;font-variant-numeric:tabular-nums;">5:00</div>' +
			'<button id="hm_press" style="width:100%;margin-top:12px;padding:14px;border:none;border-radius:10px;background:#27ae60;color:#fff;cursor:pointer;font-size:18px;font-weight:800;letter-spacing:1px;">⏱ BATER</button>' +
			'<div style="display:flex;gap:6px;margin-top:10px;align-items:center;justify-content:center;font-size:12px;color:#ccc;">' +
				'<input id="hm_min" type="number" min="1" max="180" value="5" style="width:48px;padding:5px;border-radius:5px;border:1px solid #555;background:#2a2a2a;color:#fff;"> min' +
				'<input id="hm_inc" type="number" min="0" max="60" value="3" style="width:44px;padding:5px;border-radius:5px;border:1px solid #555;background:#2a2a2a;color:#fff;"> +s' +
			'</div>' +
			'<div style="display:flex;gap:6px;margin-top:8px;">' +
				'<button id="hm_apply" style="flex:1;padding:7px;border:none;border-radius:6px;background:#4a90d9;color:#fff;cursor:pointer;font-size:12px;">Reiniciar</button>' +
				'<button id="hm_pause" style="flex:1;padding:7px;border:none;border-radius:6px;background:#555;color:#fff;cursor:pointer;font-size:12px;">Pausar</button>' +
			'</div>' +
			'<div style="text-align:center;font-size:11px;color:#777;margin-top:8px;">Move a peça e BATE (ou clica no teu relógio)</div>';
		document.body.appendChild(ui);

		document.getElementById("hm_press").onclick = press;
		document.getElementById("hm_clock_w").onclick = () => { if (state.active === "w") press(); };
		document.getElementById("hm_clock_b").onclick = () => { if (state.active === "b") press(); };
		document.getElementById("hm_apply").onclick = () => {
			let m = parseInt(document.getElementById("hm_min").value, 10);
			let i = parseInt(document.getElementById("hm_inc").value, 10);
			state.base_ms = (isFinite(m) && m > 0 ? m : 5) * 60000;
			state.inc_ms = (isFinite(i) && i >= 0 ? i : 0) * 1000;
			reset_clocks();
		};
		document.getElementById("hm_pause").onclick = () => {
			state.running = !state.running;
			state.last = now();
			document.getElementById("hm_pause").textContent = state.running ? "Pausar" : "Continuar";
		};
	}

	function render() {
		if (!ui) return;
		let cw = document.getElementById("hm_clock_w");
		let cb = document.getElementById("hm_clock_b");
		let press_btn = document.getElementById("hm_press");
		if (!cw || !cb) return;
		cw.textContent = fmt(state.clock.w);
		cb.textContent = fmt(state.clock.b);
		// realce do lado activo
		cw.style.outline = (state.active === "w" && state.running) ? "3px solid #4a90d9" : "none";
		cb.style.outline = (state.active === "b" && state.running) ? "3px solid #4a90d9" : "none";
		// PISCA o relógio de quem jogou e ainda não bateu
		cw.classList.toggle("hm_blink", state.awaiting_press && state.active === "w");
		cb.classList.toggle("hm_blink", state.awaiting_press && state.active === "b");
		if (press_btn) {
			press_btn.classList.toggle("hm_pulse", state.awaiting_press);
			press_btn.textContent = state.awaiting_press ? "⏱ BATE!" : "⏱ BATER";
			press_btn.style.background = state.awaiting_press ? "#e67e22" : "#27ae60";
		}
		if (state.flagged === "w") cw.style.background = "#c0392b";
		if (state.flagged === "b") cb.style.background = "#c0392b";
	}

	function reset_clocks() {
		state.clock.w = state.base_ms;
		state.clock.b = state.base_ms;
		state.active = active_side();
		state.awaiting_press = false;
		state.flagged = null;
		state.running = state.on;
		state.last = now();
		let cw = document.getElementById("hm_clock_w"); if (cw) { cw.style.background = "#eee"; cw.classList.remove("hm_blink"); }
		let cb = document.getElementById("hm_clock_b"); if (cb) { cb.style.background = "#111"; cb.classList.remove("hm_blink"); }
		render();
	}

	function tick() {
		if (!state.running || state.flagged) return;
		let t = now();
		state.clock[state.active] -= (t - state.last);
		state.last = t;
		if (state.clock[state.active] <= 0) {
			state.clock[state.active] = 0;
			state.flagged = state.active;
			state.running = false;
			state.awaiting_press = false;
		}
		render();
	}

	// Um lance humano VÁLIDO: NÃO troca o relógio — só marca "tens de bater" e
	// começa a piscar. O relógio de quem jogou continua a correr até bater.
	function on_move() {
		if (!state.on || state.flagged) return;
		state.awaiting_press = true;
		render();
	}

	// BATER: como no relógio físico — pára o teu, soma incremento, arranca o do
	// adversário e roda o tabuleiro. Só faz sentido depois de mover.
	function press() {
		if (!state.on || state.flagged) return;
		if (!state.awaiting_press) return;         // nada a passar se não se jogou
		state.clock[state.active] += state.inc_ms; // incremento de quem jogou
		state.active = state.active === "w" ? "b" : "w";
		state.awaiting_press = false;
		state.last = now();
		state.running = true;
		face(state.active);                         // vira p/ o próximo jogador
		render();
	}

	function toggle() {
		build_ui();
		state.on = !state.on;
		ui.style.display = state.on ? "block" : "none";
		let btn = document.getElementById("hm_button");
		if (btn) btn.style.backgroundColor = state.on ? "#4a90d9" : "";
		if (state.on) {
			reset_clocks();
			face(active_side());
			if (!state.timer) state.timer = setInterval(tick, 100);
		} else {
			state.running = false;
			state.awaiting_press = false;
			face("w");
		}
	}

	// Botão JUNTO dos outros, na barra #buttoncontrols, com a mesma classe.
	function build_button() {
		if (document.getElementById("hm_button")) return;
		let btn = document.createElement("button");
		btn.id = "hm_button";
		btn.className = "buttonctrl_class";
		btn.textContent = "👤";
		btn.title = "Modo Humano — 2 jogadores + relógio de xadrez";
		btn.style.fontFamily = "sans-serif";
		btn.onclick = toggle;
		let bar = document.getElementById("buttoncontrols");
		if (bar) { bar.appendChild(btn); }
		else { btn.style.cssText += ";position:fixed;top:12px;right:16px;z-index:99998;"; document.body.appendChild(btn); }
	}

	// Hook em hub.move: cada lance válido dispara o "tens de bater" (piscar).
	let orig_move = hub.move;
	hub.move = function(s) {
		let ok = orig_move.call(this, s);
		if (ok) { try { on_move(); } catch (e) { console.log("human mode:", e); } }
		return ok;
	};
	hub.toggle_human_mode = toggle;
	hub.human_press = press;   // BATER também acessível (ex.: futura tecla)

	if (document.body) build_button();
	else window.addEventListener("DOMContentLoaded", build_button);

})();
