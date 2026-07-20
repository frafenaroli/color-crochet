/*
 * app.js — controller del flusso di ColorCrochet.
 *
 * Flusso:
 *   1) tipo palette (preimpostata / personalizzata)
 *   2) componi: scegli i 3-6 colori iniziali
 *   3) anteprima: piastrella granny + MODIFICA colori qui (tap sullo slot),
 *      con la piastrella che si aggiorna subito.
 */
(function () {
  "use strict";
  var CC = window.CC || {};
  window.CC = CC;

  var MIN = 3, MAX = 6;

  var stato = {
    fase: "tipo",
    tipo: null,            // "preset" | "custom"
    presetId: "caprice-cervinia",
    selezione: [],         // [{ hex, nome, codice }]
    templateId: "classica",
    editSlot: -1,          // slot in modifica nell'anteprima (-1 = nessuno)
    fontScala: 1,
  };

  var app;

  // ---------- utilita' ----------

  function el(tag, attrs, figli) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] == null) return;
        if (k === "class") n.className = attrs[k];
        else if (k === "text") n.textContent = attrs[k];
        else if (k === "html") n.innerHTML = attrs[k];
        else if (k.indexOf("on") === 0 && typeof attrs[k] === "function")
          n.addEventListener(k.slice(2), attrs[k]);
        else n.setAttribute(k, attrs[k]);
      });
    }
    (figli || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function testoSuColore(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0,2),16)/255, g = parseInt(h.substr(2,2),16)/255, b = parseInt(h.substr(4,2),16)/255;
    function lin(c){ return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }
    var L = 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
    return L > 0.5 ? "#141414" : "#ffffff";
  }

  function getPreset() {
    var list = CC.palettesPreset || [];
    return list.filter(function (p) { return p.id === stato.presetId; })[0] || list[0];
  }
  function colori() { return stato.selezione.map(function (c) { return c.hex; }); }

  function salva() {
    CC.storage.salvaStato({
      tipo: stato.tipo, presetId: stato.presetId,
      selezione: stato.selezione, templateId: stato.templateId,
    });
  }

  // ---------- topbar (solo marchio) ----------

  function renderTopbar() {
    return el("header", { class: "topbar" }, [
      el("div", { class: "brand" }, [
        el("span", { class: "brand-logo", "aria-hidden": "true", text: "🧶" }),
        el("span", { class: "brand-name", text: "ColorCrochet" }),
      ]),
    ]);
  }

  // ---------- controllo dimensione testo (a fondo pagina) ----------

  function renderFontCtrl() {
    return el("section", { class: "font-sezione", "aria-label": "Dimensione testo" }, [
      el("span", { class: "font-label", text: "Dimensione testo" }),
      el("div", { class: "font-ctrl" }, [
        el("button", { class: "font-btn", type: "button", "aria-label": "Riduci testo",
          onclick: function () { cambiaFont(-0.1); } }, [el("span", { "aria-hidden": "true", text: "A−" })]),
        el("button", { class: "font-btn", type: "button", "aria-label": "Ingrandisci testo",
          onclick: function () { cambiaFont(0.1); } }, [el("span", { "aria-hidden": "true", text: "A+" })]),
      ]),
    ]);
  }
  function cambiaFont(delta) {
    stato.fontScala = Math.min(1.6, Math.max(0.9, Math.round((stato.fontScala + delta) * 10) / 10));
    applicaFont();
    CC.storage.salvaFont(stato.fontScala);
  }
  function applicaFont() {
    document.documentElement.style.setProperty("--font-scala", stato.fontScala);
  }

  // ---------- FASE 1: tipo palette ----------

  function renderTipo() {
    var ultima = CC.storage.leggiStato();
    var haUltima = ultima && ultima.selezione && ultima.selezione.length >= MIN;

    // Una card per ogni set di filato preimpostato (per ora solo Caprice
    // Cervinia): al crescere dei set compaiono qui automaticamente.
    var opzioni = (CC.palettesPreset || []).map(function (p) {
      return cardScelta("🏔️", p.nome, descPreset(p),
        function () { stato.presetId = p.id; vaiComponi("preset"); });
    });
    opzioni.push(cardScelta("✨", "Palette personalizzata", "Crea i tuoi colori liberamente.",
      function () { vaiComponi("custom"); }));
    if (haUltima) {
      opzioni.push(cardScelta("↩️", "Riprendi l'ultima palette",
        ultima.selezione.length + " colori salvati sul dispositivo.",
        function () { ripristina(ultima); }, "ripristina"));
    }
    return el("section", { class: "fase" }, [
      el("h1", { class: "titolo-fase", text: "Come vuoi iniziare?" }),
      el("p", { class: "sottotitolo", text: "Scegli da dove partire per comporre la tua palette." }),
      el("div", { class: "scelte" }, opzioni),
    ]);
  }
  // Sottotitolo della card di un set: materiale + numero colori.
  function descPreset(p) {
    var parti = [];
    if (p.produttore) parti.push(p.produttore.split("/")[0].trim());
    var n = (p.colori || []).length;
    if (n) parti.push(n + " colori");
    return parti.join(" · ") || "Filato preimpostato";
  }

  function cardScelta(emoji, titolo, desc, onclick, extra) {
    return el("button", { class: "scelta-card" + (extra ? " " + extra : ""), type: "button", onclick: onclick }, [
      el("span", { class: "scelta-emoji", "aria-hidden": "true", text: emoji }),
      el("span", { class: "scelta-titolo", text: titolo }),
      el("span", { class: "scelta-desc", text: desc }),
    ]);
  }
  function ripristina(ultima) {
    stato.tipo = ultima.tipo || "preset";
    stato.presetId = ultima.presetId || "caprice-cervinia";
    stato.selezione = ultima.selezione.slice(0, MAX);
    stato.templateId = ultima.templateId || "classica";
    stato.fase = "anteprima";
    render();
  }
  function vaiComponi(tipo) { stato.tipo = tipo; stato.fase = "componi"; render(); }

  // ---------- FASE 2: componi ----------

  function indiceSel(hex) {
    for (var i = 0; i < stato.selezione.length; i++)
      if (stato.selezione[i].hex.toLowerCase() === hex.toLowerCase()) return i;
    return -1;
  }
  function toggleColore(colore) {
    var i = indiceSel(colore.hex);
    if (i >= 0) stato.selezione.splice(i, 1);
    else { if (stato.selezione.length >= MAX) return; stato.selezione.push(colore); }
    salva(); render();
  }

  function renderComponi() {
    var nodi = [ el("h1", { class: "titolo-fase",
      text: stato.tipo === "preset" ? "Scegli i colori" : "Crea i tuoi colori" }) ];

    if (stato.tipo === "preset") {
      nodi.push(el("p", { class: "sottotitolo",
        text: "Tocca i colori per aggiungerli. Tocca di nuovo per toglierli. Potrai cambiarli anche dopo, sull'anteprima." }));
      nodi.push(el("p", { class: "nota-piccola",
        text: "I colori sono indicativi e possono variare dal filato reale. L'asterisco (*) segnala un nome stimato." }));
      var p = getPreset();
      nodi.push(el("div", { class: "griglia-colori" }, p.colori.map(function (c) { return swatchGrid(c); })));
    } else {
      nodi.push(el("p", { class: "sottotitolo", text: "Scegli un colore e aggiungilo alla palette. Potrai cambiarli anche dopo, sull'anteprima." }));
      nodi.push(renderCustomAdd());
    }
    nodi.push(renderBarraSelezione());
    return el("section", { class: "fase" }, nodi);
  }

  function swatchGrid(c) {
    var idx = indiceSel(c.hex), sel = idx >= 0;
    var nome = c.nome + (c.nomeConfermato === false ? " *" : "");
    return el("button", {
      class: "swatch" + (sel ? " sel" : ""), type: "button",
      "aria-pressed": sel ? "true" : "false",
      "aria-label": c.nome + (c.codice ? ", codice " + c.codice : "") + (sel ? ", selezionato" : ""),
      disabled: (!sel && stato.selezione.length >= MAX) ? "" : null,
      onclick: function () { toggleColore({ hex: c.hex, nome: c.nome, codice: c.codice || "" }); },
    }, [
      el("span", { class: "swatch-col", style: "background:" + c.hex }, [
        sel ? el("span", { class: "swatch-badge", "aria-hidden": "true",
          style: "color:" + testoSuColore(c.hex), text: String(idx + 1) }) : null,
      ]),
      el("span", { class: "swatch-nome", text: nome }),
      c.codice ? el("span", { class: "swatch-cod", text: c.codice }) : null,
    ]);
  }

  function renderCustomAdd() {
    var val = { hex: "#3a41c6" };
    var prev = el("span", { class: "picker-preview", style: "background:" + val.hex, "aria-hidden": "true" });
    return el("div", { class: "custom-picker" }, [
      el("label", { class: "picker-wrap" }, [ prev,
        el("input", { class: "picker", type: "color", value: val.hex, "aria-label": "Scegli un colore",
          oninput: function (e) { val.hex = e.target.value; prev.style.background = val.hex; } }) ]),
      el("button", { class: "btn btn-primario", type: "button",
        onclick: function () {
          if (stato.selezione.length >= MAX) return;
          stato.selezione.push({ hex: val.hex, nome: "Colore personalizzato", codice: val.hex.toUpperCase() });
          salva(); render();
        } }, [el("span", { text: "Aggiungi colore" })]),
    ]);
  }

  function renderBarraSelezione() {
    var n = stato.selezione.length;
    var chips = stato.selezione.map(function (c, i) {
      return el("div", { class: "chip" }, [
        el("span", { class: "chip-col", style: "background:" + c.hex, "aria-hidden": "true" }),
        el("span", { class: "chip-nome", text: c.nome }),
        el("button", { class: "mini-btn mini-rimuovi", type: "button", "aria-label": "Togli " + c.nome,
          onclick: function () { stato.selezione.splice(i, 1); salva(); render(); } },
          [el("span", { "aria-hidden": "true", text: "✕" })]),
      ]);
    });
    var ok = n >= MIN && n <= MAX;
    var msg = n === 0 ? "Scegli da " + MIN + " a " + MAX + " colori."
      : "Hai scelto " + n + " di massimo " + MAX + " colori" + (n < MIN ? " (minimo " + MIN + ")." : ".");
    return el("div", { class: "barra-sel" }, [
      el("div", { class: "barra-info" }, [ el("span", { class: "contatore" + (ok ? " ok" : ""), text: msg }) ]),
      chips.length ? el("div", { class: "chips" }, chips) : null,
      el("div", { class: "barra-azioni" }, [
        el("button", { class: "btn btn-secondario", type: "button",
          onclick: function () { stato.fase = "tipo"; render(); } }, [el("span", { text: "Indietro" })]),
        el("button", { class: "btn btn-primario", type: "button", disabled: ok ? null : "",
          onclick: function () { if (ok) { stato.fase = "anteprima"; stato.editSlot = -1; salva(); render(); } } },
          [el("span", { text: "Prosegui" })]),
      ]),
    ]);
  }

  // ---------- FASE 3: anteprima + modifica colori ----------

  function renderAnteprima() {
    var svg = CC.buildTileSVG(stato.templateId, colori());

    var selettoreTpl = el("div", { class: "template-scelta", role: "group", "aria-label": "Modello di piastrella" },
      CC.templates.map(function (t) {
        var attivo = t.id === stato.templateId;
        return el("button", { class: "tpl-btn" + (attivo ? " attivo" : ""), type: "button",
          "aria-pressed": attivo ? "true" : "false",
          onclick: function () { stato.templateId = t.id; salva(); render(); } }, [
          el("span", { class: "tpl-mini", html: CC.buildTileSVG(t.id, colori()) }),
          el("span", { class: "tpl-nome", text: t.nome }),
        ]);
      }));

    var esito = el("p", { class: "esito", "aria-live": "polite", text: "" });

    var nodi = [
      el("h1", { class: "titolo-fase", text: "La tua piastrella" }),
      el("div", { class: "tile-grande", html: svg }),
      el("p", { class: "etichetta-modello", text: "Modello" }),
      selettoreTpl,
      el("h2", { class: "titolo-sez", text: "Colori usati" }),
      el("p", { class: "nota-piccola", text: "Tocca un colore per cambiarlo: la piastrella si aggiorna subito." }),
      renderEditorColori(),
      esito,
      el("div", { class: "azioni-finali" }, [
        el("button", { class: "btn btn-primario grande", type: "button",
          onclick: function (e) { salvaImmagine(e.currentTarget, esito); } },
          [el("span", { text: "💾 Salva immagine" })]),
        el("button", { class: "btn btn-secondario", type: "button",
          onclick: function () { stato.editSlot = -1; stato.fase = "componi"; render(); } },
          [el("span", { text: "Cambia set di colori" })]),
        el("button", { class: "btn btn-neutro", type: "button",
          onclick: function () { stato.selezione = []; stato.editSlot = -1; stato.fase = "tipo"; render(); } },
          [el("span", { text: "Ricomincia" })]),
      ]),
    ];
    return el("section", { class: "fase" }, nodi);
  }

  function renderEditorColori() {
    var n = stato.selezione.length;
    var lista = el("ul", { class: "legenda" }, stato.selezione.map(function (c, i) {
      var aperto = stato.editSlot === i;
      var riga = el("li", { class: "legenda-item" + (aperto ? " aperto" : "") }, [
        el("span", { class: "legenda-num", text: String(i + 1) }),
        el("button", { class: "legenda-col-btn", type: "button",
          "aria-expanded": aperto ? "true" : "false",
          "aria-label": "Cambia colore " + (i + 1) + ": " + c.nome,
          onclick: function () { stato.editSlot = aperto ? -1 : i; render(); } }, [
          el("span", { class: "legenda-col", style: "background:" + c.hex, "aria-hidden": "true" }),
        ]),
        el("span", { class: "legenda-testo" }, [
          el("span", { class: "legenda-nome", text: c.nome }),
          c.codice ? el("span", { class: "legenda-cod", text: c.codice }) : null,
        ]),
        el("div", { class: "legenda-azioni" }, [
          el("button", { class: "mini-btn", type: "button", "aria-label": "Sposta su", disabled: i === 0 ? "" : null,
            onclick: function () { sposta(i, -1); } }, [el("span", { "aria-hidden": "true", text: "▲" })]),
          el("button", { class: "mini-btn", type: "button", "aria-label": "Sposta giù", disabled: i === n - 1 ? "" : null,
            onclick: function () { sposta(i, 1); } }, [el("span", { "aria-hidden": "true", text: "▼" })]),
          el("button", { class: "mini-btn mini-rimuovi", type: "button", "aria-label": "Togli colore",
            disabled: n <= MIN ? "" : null,
            onclick: function () { if (n > MIN) { stato.selezione.splice(i, 1); if (stato.editSlot >= i) stato.editSlot = -1; salva(); render(); } } },
            [el("span", { "aria-hidden": "true", text: "✕" })]),
        ]),
      ]);
      var wrap = el("div", { class: "legenda-wrap" }, [riga]);
      if (aperto) wrap.appendChild(renderPannelloEdit(i));
      return wrap;
    }));

    var out = el("div", {}, [lista]);
    if (n < MAX) {
      out.appendChild(el("button", { class: "btn btn-secondario btn-aggiungi", type: "button",
        onclick: function () { aggiungiSlot(); } }, [el("span", { text: "＋ Aggiungi colore" })]));
    }
    return out;
  }

  function renderPannelloEdit(i) {
    if (stato.tipo === "custom") {
      var val = { hex: stato.selezione[i].hex };
      return el("div", { class: "pannello-edit" }, [
        el("label", { class: "picker-wrap grande" }, [
          el("span", { class: "picker-preview", style: "background:" + val.hex, "aria-hidden": "true" }),
          el("input", { class: "picker", type: "color", value: val.hex, "aria-label": "Scegli un colore",
            oninput: function (e) {
              stato.selezione[i] = { hex: e.target.value, nome: "Colore personalizzato", codice: e.target.value.toUpperCase() };
              // aggiorna solo la piastrella e lo slot, senza chiudere il picker
              aggiornaAnteprima();
            } }),
        ]),
        el("span", { class: "pannello-hint", text: "Scegli il colore dalla ruota." }),
      ]);
    }
    var p = getPreset();
    return el("div", { class: "pannello-edit" }, [
      el("div", { class: "griglia-mini" }, p.colori.map(function (c) {
        var attivo = c.hex.toLowerCase() === stato.selezione[i].hex.toLowerCase();
        return el("button", { class: "swatch-mini" + (attivo ? " attivo" : ""), type: "button",
          title: c.nome, "aria-label": c.nome + (c.codice ? " " + c.codice : ""),
          style: "background:" + c.hex,
          onclick: function () {
            stato.selezione[i] = { hex: c.hex, nome: c.nome, codice: c.codice || "" };
            stato.editSlot = -1; salva(); render();
          } });
      })),
    ]);
  }

  // Aggiorna la sola piastrella grande (per il color picker "dal vivo").
  function aggiornaAnteprima() {
    var t = document.querySelector(".tile-grande");
    if (t) t.innerHTML = CC.buildTileSVG(stato.templateId, colori());
    salva();
  }

  function sposta(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= stato.selezione.length) return;
    var tmp = stato.selezione[i]; stato.selezione[i] = stato.selezione[j]; stato.selezione[j] = tmp;
    if (stato.editSlot === i) stato.editSlot = j; else if (stato.editSlot === j) stato.editSlot = i;
    salva(); render();
  }

  function aggiungiSlot() {
    if (stato.selezione.length >= MAX) return;
    if (stato.tipo === "custom") {
      stato.selezione.push({ hex: "#3a41c6", nome: "Colore personalizzato", codice: "#3A41C6" });
    } else {
      var p = getPreset();
      var usati = stato.selezione.map(function (c) { return c.hex.toLowerCase(); });
      var libero = p.colori.filter(function (c) { return usati.indexOf(c.hex.toLowerCase()) < 0; })[0] || p.colori[0];
      stato.selezione.push({ hex: libero.hex, nome: libero.nome, codice: libero.codice || "" });
    }
    stato.editSlot = stato.selezione.length - 1;
    salva(); render();
  }

  function salvaImmagine(btn, esito) {
    btn.disabled = true;
    var nome = "colorcrochet-" + stato.templateId + ".png";
    CC.esportaImmagine(CC.buildTileSVG(stato.templateId, colori()), nome)
      .then(function (msg) { if (msg) esito.textContent = msg; })
      .catch(function () { esito.textContent = "Non è stato possibile salvare l'immagine."; })
      .then(function () { btn.disabled = false; });
  }

  // ---------- footer (stile mostraMI) ----------

  function renderFooter() {
    return el("footer", { class: "footer" }, [
      el("div", { class: "footer-copy" }, [
        el("span", { text: "© 2026 ColorCrochet by Francesca Fenaroli" }),
        el("br"),
        el("span", { class: "footer-made" }, [
          "Made with ❤️ & ",
          el("img", { class: "footer-logo", src: "img/claudecode.svg", alt: "Claude Code" }),
        ]),
      ]),
    ]);
  }

  // ---------- render principale ----------

  var fasePrecedente = null;
  function render() {
    var cambioFase = stato.fase !== fasePrecedente;
    var scrollPrec = window.pageYOffset;
    app.innerHTML = "";
    app.appendChild(renderTopbar());
    var main = el("main", { class: "contenuto" });
    if (stato.fase === "tipo") main.appendChild(renderTipo());
    else if (stato.fase === "componi") main.appendChild(renderComponi());
    else main.appendChild(renderAnteprima());
    app.appendChild(main);
    app.appendChild(renderFontCtrl());
    app.appendChild(renderFooter());
    if (cambioFase) window.scrollTo(0, 0); else window.scrollTo(0, scrollPrec);
    fasePrecedente = stato.fase;
  }

  document.addEventListener("DOMContentLoaded", function () {
    app = document.getElementById("app");
    var f = CC.storage.leggiFont();
    if (f) stato.fontScala = f;
    applicaFont();
    render();
  });
})();
