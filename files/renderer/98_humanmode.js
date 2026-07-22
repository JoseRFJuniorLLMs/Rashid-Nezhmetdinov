"use strict";

// ============================================================================
// Modo Humano (hotseat 2 jogadores) — relógio de xadrez + auto-flip do tabuleiro
// ============================================================================
// Um botão flutuante "👤 Humano" liga/desliga o modo. Com o modo LIGADO:
//   • aparece um relógio de xadrez (Brancas / Pretas), ajustável (min + incremento);
//   • quem joga PÁRA o seu relógio e ARRANCA o do adversário (hook em hub.move);
//   • o tabuleiro roda a cada lance p/ o lado a jogar ficar em baixo (frente a frente).
// Módulo ISOLADO: só acrescenta a `hub` e cria DOM próprio; não altera nada existente.
// ============================================================================

(function() {

	let state = {
		on: false,
		base_ms: 5 * 60 * 1000,   // 5 min (default)
		inc_ms: 3 * 1000,         // +3s (default)
		clock: { w: 0, b: 0 },
		active: "w",
		running: false,
		flagged: null,            // "w"/"b" quando cai a bandeira
		last: 0,
		timer: null,
	};

	function fmt(ms) {
		if (ms <= 0) return "0:00";
		let s = Math.ceil(ms / 1000);
		return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
	}

	function now() { return performance.now(); }

	function active_side() {
		try { return hub.tree.node.board.active; } catch (e) { return "w"; }
	}

	// Vira o tabuleiro para `side` ("w"/"b") ficar EM BAIXO, reusando toggle_flip.
	function face(side) {
		let want_flip = (side === "b");
		if (config.flip !== want_flip) {
			hub.toggle_flip();
		}
	}

	// ---- DOM -----------------------------------------------------------------
	let ui = null;
	function build_ui() {
		if (ui) return;
		ui = document.createElement("div");
		ui.id = "humanmode_panel";
		ui.style.cssText = "position:fixed;top:54px;right:16px;z-index:99998;font-family:-apple-system,Segoe UI,sans-serif;" +
			"background:#1e1e1e;border:1px solid #444;border-radius:10px;padding:10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.5);min-width:190px;display:none;";
		ui.innerHTML =
			'<div id="hm_clock_b" style="text-align:center;font-size:34px;font-weight:700;color:#eee;background:#111;border-radius:6px;padding:6px 0;letter-spacing:1px;">5:00</div>' +
			'<div style="text-align:center;font-size:11px;color:#888;margin:2px 0 8px;">◼ PRETAS</div>' +
			'<div style="text-align:center;font-size:11px;color:#888;margin:8px 0 2px;">◻ BRANCAS</div>' +
			'<div id="hm_clock_w" style="text-align:center;font-size:34px;font-weight:700;color:#111;background:#eee;border-radius:6px;padding:6px 0;letter-spacing:1px;">5:00</div>' +
			'<div style="display:flex;gap:6px;margin-top:10px;align-items:center;justify-content:center;font-size:12px;color:#ccc;">' +
				'<input id="hm_min" type="number" min="1" max="180" value="5" style="width:46px;padding:4px;border-radius:5px;border:1px solid #555;background:#2a2a2a;color:#fff;"> min' +
				'<input id="hm_inc" type="number" min="0" max="60" value="3" style="width:42px;padding:4px;border-radius:5px;border:1px solid #555;background:#2a2a2a;color:#fff;"> +s' +
			'</div>' +
			'<div style="display:flex;gap:6px;margin-top:8px;">' +
				'<button id="hm_apply" style="flex:1;padding:6px;border:none;border-radius:6px;background:#4a90d9;color:#fff;cursor:pointer;font-size:12px;">Reiniciar</button>' +
				'<button id="hm_pause" style="flex:1;padding:6px;border:none;border-radius:6px;background:#555;color:#fff;cursor:pointer;font-size:12px;">Pausar</button>' +
			'</div>';
		document.body.appendChild(ui);

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
		if (!cw || !cb) return;
		cw.textContent = fmt(state.clock.w);
		cb.textContent = fmt(state.clock.b);
		cw.style.outline = (state.active === "w" && state.running) ? "3px solid #4a90d9" : "none";
		cb.style.outline = (state.active === "b" && state.running) ? "3px solid #4a90d9" : "none";
		if (state.flagged === "w") cw.style.background = "#c0392b";
		if (state.flagged === "b") cb.style.background = "#c0392b";
	}

	function reset_clocks() {
		state.clock.w = state.base_ms;
		state.clock.b = state.base_ms;
		state.active = active_side();
		state.flagged = null;
		state.running = state.on;
		state.last = now();
		let cw = document.getElementById("hm_clock_w"); if (cw) cw.style.background = "#eee";
		let cb = document.getElementById("hm_clock_b"); if (cb) cb.style.background = "#111";
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
		}
		render();
	}

	// Chamado após um lance humano VÁLIDO (hook em hub.move).
	function on_move() {
		if (!state.on) return;
		let new_active = active_side();
		let mover = new_active === "w" ? "b" : "w";
		state.clock[mover] += state.inc_ms;   // incremento de quem acabou de jogar
		state.active = new_active;
		state.last = now();
		face(new_active);                      // roda p/ o próximo jogador ficar de frente
		render();
	}

	function toggle() {
		build_ui();
		state.on = !state.on;
		ui.style.display = state.on ? "block" : "none";
		let btn = document.getElementById("hm_button");
		if (btn) btn.style.background = state.on ? "#4a90d9" : "#333";
		if (state.on) {
			reset_clocks();
			face(active_side());
			if (!state.timer) state.timer = setInterval(tick, 100);
		} else {
			state.running = false;
		}
	}

	function build_button() {
		if (document.getElementById("hm_button")) return;
		let btn = document.createElement("button");
		btn.id = "hm_button";
		btn.textContent = "👤 Humano";
		btn.title = "Modo Humano — 2 jogadores + relógio de xadrez";
		btn.style.cssText = "position:fixed;top:12px;right:16px;z-index:99998;padding:8px 12px;border:none;border-radius:8px;" +
			"background:#333;color:#fff;cursor:pointer;font-size:13px;font-family:sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4);";
		btn.onclick = toggle;
		document.body.appendChild(btn);
	}

	// Hook em hub.move: troca o relógio + vira o tabuleiro em cada lance válido.
	let orig_move = hub.move;
	hub.move = function(s) {
		let ok = orig_move.call(this, s);
		if (ok) { try { on_move(); } catch (e) { console.log("human mode:", e); } }
		return ok;
	};
	hub.toggle_human_mode = toggle;   // também exposto (menu / atalho)

	if (document.body) build_button();
	else window.addEventListener("DOMContentLoaded", build_button);

})();
