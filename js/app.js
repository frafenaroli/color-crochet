/*
 * app.js — controller del flusso lineare a step di ColorCrochet.
 *
 * Fasi:  1) tipo palette  ->  2) componi (3-6 colori)  ->  3) anteprima.
 * Un solo controllo alla volta, effetto immediato, nessun bottone "applica".
 */
(function () {
  "use strict";
  var CC = window.CC || {};
  window.CC = CC;

  var MIN = 3, MAX = 6;

  var stato = {
    fase: "tipo",          // "tipo" | "componi" | "anteprima"
    tipo: null,            // "preset" | "custom"
    presetId: "caprice-cervinia",
    selezione: [],         // [{ hex, nome, codice }]
    templateId: "granny",
    fontScala: 1,
  };

  var app; // contenitore root

  // ---------- utilita' ----------

  function el(tag, attrs, figli) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] == null) return; // salta attributi null/undefined
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

  // Luminanza percepita -> testo bianco o nero leggibile sopra un colore.
  function testoSuColore(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0,2),16)/255;
    var g = parseInt(h.substr(2,2),16)/255;
    var b = parseInt(h.substr(4,2),16)/255;
    function lin(c){ return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }
    var L = 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
    return L > 0.5 ? "#111111" : "#ffffff";
  }

  function getPreset() {
    var list = CC.palettesPreset || [];
    return list.filter(function (p) { return p.id === stato.presetId; })[0] || list[0];
  }

  function colori() {
    return stato.selezione.map(function (c) { return c.hex; });
  }

  function salva() {
    CC.storage.salvaStato({
      tipo: stato.tipo,
      presetId: stato.presetId,
      selezione: stato.selezione,
      templateId: stato.templateId,
    });
  }

  // ---------- barra superiore (persistente) ----------

  function renderTopbar() {
    return el("header", { class: "topbar" }, [
      el("div", { class: "brand" }, [
        el("span", { class: "brand-logo", "aria-hidden": "true", text: "🧶" }),
        el("span", { class: "brand-name", text: "ColorCrochet" }),
      ]),
      el("div", { class: "font-ctrl", role: "group", "aria-label": "Dimensione testo" }, [
        el("button", {
          class: "font-btn", type: "button", "aria-label": "Riduci testo",
          onclick: function () { cambiaFont(-0.1); },
        }, [el("span", { "aria-hidden": "true", text: "A−" })]),
        el("button", {
          class: "font-btn", type: "button", "aria-label": "Ingrandisci testo",
          onclick: function () { cambiaFont(0.1); },
        }, [el("span", { "aria-hidden": "true", text: "A+" })]),
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

    var opzioni = [
      el("button", { class: "scelta-card", type: "button",
        onclick: function () { vaiComponi("preset"); } }, [
        el("span", { class: "scelta-emoji", "aria-hidden": "true", text: "🎨" }),
        el("span", { class: "scelta-titolo", text: "Palette preimpostata" }),
        el("span", { class: "scelta-desc", text: "Scegli i colori da un filato reale (Caprice Cervinia)." }),
      ]),
      el("button", { class: "scelta-card", type: "button",
        onclick: function () { vaiComponi("custom"); } }, [
        el("span", { class: "scelta-emoji", "aria-hidden": "true", text: "✨" }),
        el("span", { class: "scelta-titolo", text: "Palette personalizzata" }),
        el("span", { class: "scelta-desc", text: "Crea i tuoi colori liberamente." }),
      ]),
    ];

    if (haUltima) {
      opzioni.push(el("button", { class: "scelta-card ripristina", type: "button",
        onclick: function () { ripristina(ultima); } }, [
        el("span", { class: "scelta-emoji", "aria-hidden": "true", text: "↩️" }),
        el("span", { class: "scelta-titolo", text: "Riprendi l'ultima palette" }),
        el("span", { class: "scelta-desc", text: ultima.selezione.length + " colori salvati sul tuo dispositivo." }),
      ]));
    }

    return el("section", { class: "fase fase-tipo" }, [
      el("h1", { class: "titolo-fase", text: "Come vuoi iniziare?" }),
      el("p", { class: "sottotitolo", text: "Scegli da dove partire per comporre la tua palette." }),
      el("div", { class: "scelte" }, opzioni),
    ]);
  }

  function ripristina(ultima) {
    stato.tipo = ultima.tipo || "preset";
    stato.presetId = ultima.presetId || "caprice-cervinia";
    stato.selezione = ultima.selezione.slice(0, MAX);
    stato.templateId = ultima.templateId || "granny";
    stato.fase = "anteprima";
    render();
  }

  function vaiComponi(tipo) {
    stato.tipo = tipo;
    stato.fase = "componi";
    render();
  }

  // ---------- FASE 2: componi ----------

  function isSelezionato(hex) {
    return stato.selezione.some(function (c) { return c.hex.toLowerCase() === hex.toLowerCase(); });
  }
  function indiceSel(hex) {
    for (var i = 0; i < stato.selezione.length; i++)
      if (stato.selezione[i].hex.toLowerCase() === hex.toLowerCase()) return i;
    return -1;
  }

  function toggleColore(colore) {
    var i = indiceSel(colore.hex);
    if (i >= 0) {
      stato.selezione.splice(i, 1);
    } else {
      if (stato.selezione.length >= MAX) return; // limite raggiunto
      stato.selezione.push(colore);
    }
    salva();
    render();
  }

  function spostaColore(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= stato.selezione.length) return;
    var tmp = stato.selezione[i];
    stato.selezione[i] = stato.selezione[j];
    stato.selezione[j] = tmp;
    salva();
    render();
  }

  function renderComponi() {
    var nodi = [];
    nodi.push(el("h1", { class: "titolo-fase",
      text: stato.tipo === "preset" ? "Scegli i colori" : "Crea i tuoi colori" }));

    if (stato.tipo === "preset") {
      var p = getPreset();
      nodi.push(el("p", { class: "sottotitolo",
        text: "Tocca i colori del filato per aggiungerli. Tocca di nuovo per toglierli." }));
      var griglia = el("div", { class: "griglia-colori" },
        p.colori.map(function (c) { return swatch(c); }));
      nodi.push(griglia);
    } else {
      nodi.push(el("p", { class: "sottotitolo",
        text: "Scegli un colore e aggiungilo alla palette." }));
      nodi.push(renderCustomPicker());
    }

    // Barra selezione (bottom sheet sticky).
    nodi.push(renderBarraSelezione());

    return el("section", { class: "fase fase-componi" }, nodi);
  }

  function swatch(c) {
    var sel = isSelezionato(c.hex);
    var idx = indiceSel(c.hex);
    var badge = sel
      ? el("span", { class: "swatch-badge", "aria-hidden": "true",
          style: "color:" + testoSuColore(c.hex), text: String(idx + 1) })
      : null;
    var nome = c.nome + (c.nomeConfermato === false ? " *" : "");
    var b = el("button", {
      class: "swatch" + (sel ? " sel" : ""),
      type: "button",
      "aria-pressed": sel ? "true" : "false",
      "aria-label": c.nome + (c.codice ? ", codice " + c.codice : "") + (sel ? ", selezionato" : ""),
      disabled: (!sel && stato.selezione.length >= MAX) ? "" : null,
      onclick: function () { toggleColore({ hex: c.hex, nome: c.nome, codice: c.codice || "" }); },
    }, [
      el("span", { class: "swatch-col", style: "background:" + c.hex }, [badge]),
      el("span", { class: "swatch-nome", text: nome }),
      c.codice ? el("span", { class: "swatch-cod", text: c.codice }) : null,
    ]);
    return b;
  }

  function renderCustomPicker() {
    var valore = { hex: "#7db6a0" };
    var input = el("input", { class: "picker", type: "color", value: valore.hex,
      "aria-label": "Scegli un colore",
      oninput: function (e) { valore.hex = e.target.value; anteprimaPicker.style.background = valore.hex; },
    });
    var anteprimaPicker = el("span", { class: "picker-preview", style: "background:" + valore.hex, "aria-hidden": "true" });
    return el("div", { class: "custom-picker" }, [
      el("label", { class: "picker-wrap" }, [ anteprimaPicker, input ]),
      el("button", { class: "btn btn-primario", type: "button",
        onclick: function () {
          if (stato.selezione.length >= MAX) return;
          stato.selezione.push({ hex: valore.hex, nome: "Colore personalizzato", codice: valore.hex.toUpperCase() });
          salva(); render();
        },
      }, [el("span", { text: "Aggiungi colore" })]),
    ]);
  }

  function renderBarraSelezione() {
    var n = stato.selezione.length;
    var chips = stato.selezione.map(function (c, i) {
      return el("div", { class: "chip", style: "--chip:" + c.hex }, [
        el("span", { class: "chip-col", style: "background:" + c.hex, "aria-hidden": "true" }),
        el("span", { class: "chip-nome", text: c.nome }),
        el("div", { class: "chip-azioni" }, [
          el("button", { class: "mini-btn", type: "button", "aria-label": "Sposta " + c.nome + " a sinistra",
            disabled: i === 0 ? "" : null, onclick: function () { spostaColore(i, -1); } },
            [el("span", { "aria-hidden": "true", text: "◀" })]),
          el("button", { class: "mini-btn", type: "button", "aria-label": "Sposta " + c.nome + " a destra",
            disabled: i === n - 1 ? "" : null, onclick: function () { spostaColore(i, 1); } },
            [el("span", { "aria-hidden": "true", text: "▶" })]),
          el("button", { class: "mini-btn mini-rimuovi", type: "button", "aria-label": "Togli " + c.nome,
            onclick: function () { stato.selezione.splice(i, 1); salva(); render(); } },
            [el("span", { "aria-hidden": "true", text: "✕" })]),
        ]),
      ]);
    });

    var ok = n >= MIN && n <= MAX;
    var messaggio = n === 0
      ? "Scegli da " + MIN + " a " + MAX + " colori."
      : "Hai scelto " + n + " di massimo " + MAX + " colori" + (n < MIN ? " (minimo " + MIN + ")." : ".");

    return el("div", { class: "barra-sel" }, [
      el("div", { class: "barra-info" }, [
        el("span", { class: "contatore" + (ok ? " ok" : ""), text: messaggio }),
      ]),
      chips.length ? el("div", { class: "chips" }, chips) : null,
      el("div", { class: "barra-azioni" }, [
        el("button", { class: "btn btn-secondario", type: "button",
          onclick: function () { stato.fase = "tipo"; render(); } },
          [el("span", { text: "Indietro" })]),
        el("button", { class: "btn btn-primario", type: "button",
          disabled: ok ? null : "",
          onclick: function () { if (ok) { stato.fase = "anteprima"; salva(); render(); } } },
          [el("span", { text: "Vedi anteprima" })]),
      ]),
    ]);
  }

  // ---------- FASE 3: anteprima ----------

  function renderAnteprima() {
    var svg = CC.buildTileSVG(stato.templateId, colori());

    var selettoreTpl = el("div", { class: "template-scelta", role: "group", "aria-label": "Modello di piastrella" },
      CC.templates.map(function (t) {
        var attivo = t.id === stato.templateId;
        return el("button", {
          class: "tpl-btn" + (attivo ? " attivo" : ""), type: "button",
          "aria-pressed": attivo ? "true" : "false",
          onclick: function () { stato.templateId = t.id; salva(); render(); },
        }, [
          el("span", { class: "tpl-mini", html: CC.buildTileSVG(t.id, colori()) }),
          el("span", { class: "tpl-nome", text: t.nome }),
        ]);
      }));

    var legenda = el("ul", { class: "legenda" },
      stato.selezione.map(function (c, i) {
        return el("li", { class: "legenda-item" }, [
          el("span", { class: "legenda-num", text: String(i + 1) }),
          el("span", { class: "legenda-col", style: "background:" + c.hex, "aria-hidden": "true" }),
          el("span", { class: "legenda-nome", text: c.nome }),
          c.codice ? el("span", { class: "legenda-cod", text: c.codice }) : null,
        ]);
      }));

    var esito = el("p", { class: "esito", "aria-live": "polite", text: "" });

    return el("section", { class: "fase fase-anteprima" }, [
      el("h1", { class: "titolo-fase", text: "La tua piastrella" }),
      el("div", { class: "tile-grande", html: svg }),
      el("p", { class: "etichetta-modello", text: "Modello: scegli qui sotto" }),
      selettoreTpl,
      el("h2", { class: "titolo-sez", text: "Colori usati" }),
      legenda,
      esito,
      el("div", { class: "azioni-finali" }, [
        el("button", { class: "btn btn-primario grande", type: "button",
          onclick: function (e) {
            var b = e.currentTarget; b.disabled = true;
            var nome = "colorcrochet-" + stato.templateId + ".png";
            CC.esportaImmagine(CC.buildTileSVG(stato.templateId, colori()), nome)
              .then(function (msg) { if (msg) esito.textContent = msg; })
              .catch(function () { esito.textContent = "Non è stato possibile salvare l'immagine."; })
              .then(function () { b.disabled = false; });
          } },
          [el("span", { text: "💾 Salva immagine" })]),
        el("button", { class: "btn btn-secondario", type: "button",
          onclick: function () { stato.fase = "componi"; render(); } },
          [el("span", { text: "Modifica colori" })]),
        el("button", { class: "btn btn-neutro", type: "button",
          onclick: function () { stato.selezione = []; stato.fase = "tipo"; render(); } },
          [el("span", { text: "Ricomincia" })]),
      ]),
    ]);
  }

  // ---------- footer / disclaimer ----------

  function renderFooter() {
    var p = getPreset();
    var disc = (stato.tipo === "preset" && p && p.disclaimer)
      ? p.disclaimer
      : "I colori mostrati sono indicativi e possono variare rispetto al filato reale.";
    return el("footer", { class: "footer" }, [
      el("p", { class: "disclaimer", text: disc }),
      el("p", { class: "nota-asterisco", text: "* Nome colore stimato, da verificare." }),
    ]);
  }

  // ---------- render principale ----------

  var fasePrecedente = null;

  function render() {
    // Se restiamo nella stessa fase (es. selezione di un colore) manteniamo
    // la posizione di scorrimento: la pagina non deve "saltare" a ogni tocco.
    var cambioFase = stato.fase !== fasePrecedente;
    var scrollPrec = window.pageYOffset;

    app.innerHTML = "";
    app.appendChild(renderTopbar());
    var main = el("main", { class: "contenuto" });
    if (stato.fase === "tipo") main.appendChild(renderTipo());
    else if (stato.fase === "componi") main.appendChild(renderComponi());
    else main.appendChild(renderAnteprima());
    app.appendChild(main);
    app.appendChild(renderFooter());

    if (cambioFase) window.scrollTo(0, 0);
    else window.scrollTo(0, scrollPrec);
    fasePrecedente = stato.fase;
  }

  // ---------- avvio ----------

  document.addEventListener("DOMContentLoaded", function () {
    app = document.getElementById("app");
    var f = CC.storage.leggiFont();
    if (f) stato.fontScala = f;
    applicaFont();
    render();
  });
})();
