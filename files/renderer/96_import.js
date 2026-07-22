"use strict";

// ============================================================================
// Import de partidas por username (Lichess / Chess.com) — Fase 2 do "estudo".
// Usa o módulo https do Node (nodeIntegration está ligado) para evitar CORS, e
// carrega o PGN resultante por hub.load_pgn_from_string — a MESMA pipeline do
// "Open PGN" (mostra o chooser quando há várias partidas). Módulo isolado: só
// acrescenta métodos a `hub`, não toca em nada existente.
// ============================================================================

(function() {

	const https = require("https");

	function set_status(msg) {
		let sb = document.getElementById("statusbox");
		if (sb) { sb.textContent = msg; }
	}

	function https_get(url, headers, depth) {
		depth = depth || 0;
		return new Promise((resolve, reject) => {
			if (depth > 5) { reject(new Error("demasiados redirects")); return; }
			let req = https.get(url, {headers: headers || {}}, (res) => {
				if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
					res.resume();
					https_get(res.headers.location, headers, depth + 1).then(resolve, reject);
					return;
				}
				if (res.statusCode !== 200) {
					res.resume();
					reject(new Error(`HTTP ${res.statusCode}`));
					return;
				}
				let chunks = [];
				res.on("data", (d) => chunks.push(d));
				res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
			});
			req.on("error", reject);
			req.setTimeout(25000, () => { req.destroy(new Error("timeout")); });
		});
	}

	// Electron não tem window.prompt fiável: modal de input minimalista em JS.
	function prompt_username(site_label) {
		return new Promise((resolve) => {
			let overlay = document.createElement("div");
			overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;";
			let box = document.createElement("div");
			box.style.cssText = "background:#2b2b2b;color:#eee;padding:20px 24px;border-radius:10px;font-family:-apple-system,Segoe UI,sans-serif;min-width:320px;box-shadow:0 8px 30px rgba(0,0,0,.5);";
			let title = document.createElement("div");
			title.style.cssText = "font-size:16px;margin-bottom:12px;";
			title.textContent = `Importar partidas — ${site_label}`;
			let input = document.createElement("input");
			input.type = "text";
			input.placeholder = `username ${site_label}`;
			input.style.cssText = "width:100%;padding:9px;border-radius:6px;border:1px solid #555;background:#1a1a1a;color:#fff;font-size:14px;box-sizing:border-box;";
			let btns = document.createElement("div");
			btns.style.cssText = "margin-top:14px;text-align:right;";
			let cancel = document.createElement("button");
			cancel.textContent = "Cancelar";
			cancel.style.cssText = "margin-left:8px;padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-size:13px;background:#555;color:#fff;";
			let ok = document.createElement("button");
			ok.textContent = "Importar";
			ok.style.cssText = "margin-left:8px;padding:8px 14px;border-radius:6px;border:none;cursor:pointer;font-size:13px;background:#4a90d9;color:#fff;";
			btns.appendChild(cancel); btns.appendChild(ok);
			box.appendChild(title); box.appendChild(input); box.appendChild(btns);
			overlay.appendChild(box);
			document.body.appendChild(overlay);
			input.focus();

			let done = (val) => { if (overlay.parentNode) document.body.removeChild(overlay); resolve(val); };
			ok.onclick = () => done(input.value.trim());
			cancel.onclick = () => done(null);
			overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) done(null); });
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") { e.preventDefault(); done(input.value.trim()); }
				else if (e.key === "Escape") { e.preventDefault(); done(null); }
			});
		});
	}

	async function do_import(site, count) {
		let label = site === "lichess" ? "Lichess" : "Chess.com";
		let user = await prompt_username(label);
		if (!user) { return; }
		set_status(`A importar as últimas ${count} partidas de ${user} (${label})...`);
		try {
			let pgn;
			if (site === "lichess") {
				let url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}` +
					`?max=${count}&moves=true&tags=true&clocks=false&evals=false&opening=true`;
				pgn = await https_get(url, {"Accept": "application/x-chess-pgn", "User-Agent": "NibblerX"});
			} else {
				let archives = JSON.parse(await https_get(
					`https://api.chess.com/pub/player/${encodeURIComponent(user)}/games/archives`,
					{"User-Agent": "NibblerX"}));
				let list = (archives && archives.archives) || [];
				if (list.length === 0) { throw new Error("jogador sem partidas"); }
				let month = JSON.parse(await https_get(list[list.length - 1], {"User-Agent": "NibblerX"}));
				pgn = ((month && month.games) || []).slice(-count).map(g => g.pgn).filter(Boolean).join("\n\n");
			}
			if (!pgn || pgn.trim().length === 0) { throw new Error("nenhuma partida devolvida"); }
			set_status(`Partidas de ${user} carregadas.`);
			hub.load_pgn_from_string(pgn);
		} catch (err) {
			set_status("Falha na importação.");
			alert(`Falha ao importar de ${label} (${user}): ${err.message}`);
		}
	}

	hub.import_lichess = function() { do_import("lichess", 20); };
	hub.import_chesscom = function() { do_import("chesscom", 20); };

})();
