/*
 * tiles.js — piastrelle a uncinetto in SVG, tutte in stile granny square.
 *
 * Ogni template e' una variante di granny square: giri concentrici a cui
 * vengono assegnati ciclicamente i colori della palette. Il disegno e'
 * semplificato ma con una texture "a punti" (trattini radiali) che richiama
 * i punti reali del crochet, invece di quadrati piatti.
 *
 * Ogni giro e' un gruppo SVG con attributo data-giro, cosi' in futuro si
 * potra' assegnare il colore giro-per-giro.
 */
(function () {
  "use strict";
  window.CC = window.CC || {};

  var SIZE = 400;
  var C = SIZE / 2;
  var MARGINE = 16;

  function colGiro(colori, i) {
    return colori[i % colori.length];
  }

  // Scurisce (f<1) o schiarisce (f>1) un colore hex.
  function shade(hex, f) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var r = parseInt(h.substr(0,2),16), g = parseInt(h.substr(2,2),16), b = parseInt(h.substr(4,2),16);
    function cl(v){ return Math.max(0, Math.min(255, Math.round(v))); }
    if (f <= 1) { r*=f; g*=f; b*=f; }
    else { r = r + (255-r)*(f-1); g = g + (255-g)*(f-1); b = b + (255-b)*(f-1); }
    return "#" + [cl(r),cl(g),cl(b)].map(function(v){ return ("0"+v.toString(16)).slice(-2); }).join("");
  }

  // Path di un quadrato con angoli arrotondati, centrato in C.
  function quadPath(half, rx) {
    var x = C - half, y = C - half, s = half * 2;
    rx = Math.min(rx, half);
    return "M" + (x+rx) + " " + y +
      " h" + (s-2*rx) + " a" + rx + " " + rx + " 0 0 1 " + rx + " " + rx +
      " v" + (s-2*rx) + " a" + rx + " " + rx + " 0 0 1 " + (-rx) + " " + rx +
      " h" + (-(s-2*rx)) + " a" + rx + " " + rx + " 0 0 1 " + (-rx) + " " + (-rx) +
      " v" + (-(s-2*rx)) + " a" + rx + " " + rx + " 0 0 1 " + rx + " " + (-rx) + " Z";
  }

  // Un giro "a punti": banda piena scura + punti del colore sopra (dash radiali).
  function giroQuadro(half, t, col, giro) {
    var rx = Math.max(3, half * 0.16);
    var d = quadPath(half, rx);
    var punto = t * 0.72, vuoto = t * 0.36;
    return (
      '<g data-giro="' + giro + '">' +
      // strato scuro (spazi tra i punti)
      '<path d="' + d + '" fill="none" stroke="' + shade(col, 0.55) +
        '" stroke-width="' + t + '" stroke-linecap="butt"></path>' +
      // punti del colore
      '<path d="' + d + '" fill="none" stroke="' + col +
        '" stroke-width="' + (t * 0.92) + '" stroke-linecap="butt"' +
        ' stroke-dasharray="' + punto.toFixed(1) + " " + vuoto.toFixed(1) + '"></path>' +
      "</g>"
    );
  }

  // Un giro circolare "a punti".
  function giroCerchio(r, t, col, giro) {
    var circ = 2 * Math.PI * r;
    var n = Math.max(8, Math.round(circ / (t * 0.9)));
    var punto = (circ / n) * 0.64, vuoto = (circ / n) * 0.36;
    return (
      '<g data-giro="' + giro + '">' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + r + '" fill="none" stroke="' +
        shade(col, 0.55) + '" stroke-width="' + t + '"></circle>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + r + '" fill="none" stroke="' + col +
        '" stroke-width="' + (t * 0.92) + '" stroke-dasharray="' +
        punto.toFixed(1) + " " + vuoto.toFixed(1) + '"></circle>' +
      "</g>"
    );
  }

  function centro(col, giro, raggio) {
    return (
      '<g data-giro="' + giro + '">' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + raggio + '" fill="' + shade(col,0.55) + '"></circle>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + (raggio*0.82) + '" fill="' + col + '"></circle>' +
      "</g>"
    );
  }

  // --- Template 1: Granny classica (giri quadrati a punti) ---
  function grannyClassica(colori) {
    var giri = 6, parts = [];
    var span = C - MARGINE;      // dal centro al bordo utile
    var t = span / giri;         // spessore di ogni giro
    for (var i = 0; i < giri; i++) {
      var half = span - i * t - t / 2;   // mezzo-lato della linea mediana del giro
      parts.push(giroQuadro(half, t, colGiro(colori, i), i));
    }
    parts.push(centro(colGiro(colori, giri), giri, t * 0.7));
    return parts.join("");
  }

  // --- Template 2: Granny a fiore (centro a petali + giri quadrati) ---
  function grannyFiore(colori) {
    var parts = [];
    var giriQuad = 4;
    var span = C - MARGINE;
    var t = span / (giriQuad + 1.6); // lascia spazio al fiore centrale
    // giri quadrati esterni
    for (var i = 0; i < giriQuad; i++) {
      var half = (C - MARGINE) - i * t - t / 2;
      parts.push(giroQuadro(half, t, colGiro(colori, i), i));
    }
    // fiore: petali attorno al centro
    var colPet = colGiro(colori, giriQuad);
    var colCuore = colGiro(colori, giriQuad + 1);
    var rPet = t * 1.15, dist = t * 1.15;
    var petali = ['<g data-giro="' + giriQuad + '">'];
    for (var p = 0; p < 6; p++) {
      var a = (p / 6) * 2 * Math.PI;
      var px = C + dist * Math.cos(a), py = C + dist * Math.sin(a);
      petali.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + rPet.toFixed(1) +
        '" fill="' + shade(colPet,0.55) + '"></circle>');
      petali.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="' + (rPet*0.8).toFixed(1) +
        '" fill="' + colPet + '"></circle>');
    }
    petali.push("</g>");
    parts.push(petali.join(""));
    parts.push(centro(colCuore, giriQuad + 1, t * 0.95));
    return parts.join("");
  }

  // --- Template 3: Granny cerchio-nel-quadrato ---
  function grannyCerchio(colori) {
    var parts = [];
    var span = C - MARGINE;
    var giriQuad = 2;   // cornici quadrate esterne
    var giriCerc = 4;   // cerchi interni
    var tQ = span / (giriQuad + giriCerc);
    // cornici quadrate esterne
    for (var i = 0; i < giriQuad; i++) {
      var half = (C - MARGINE) - i * tQ - tQ / 2;
      parts.push(giroQuadro(half, tQ, colGiro(colori, i), i));
    }
    // cerchi interni
    var rStart = (C - MARGINE) - giriQuad * tQ;
    var tC = rStart / giriCerc;
    for (var j = 0; j < giriCerc; j++) {
      var r = rStart - j * tC - tC / 2;
      parts.push(giroCerchio(r, tC, colGiro(colori, giriQuad + j), giriQuad + j));
    }
    parts.push(centro(colGiro(colori, giriQuad + giriCerc), giriQuad + giriCerc, tC * 0.7));
    return parts.join("");
  }

  CC.templates = [
    { id: "classica", nome: "Classica", render: grannyClassica },
    { id: "fiore", nome: "Fiore", render: grannyFiore },
    { id: "cerchio", nome: "Cerchio", render: grannyCerchio },
  ];

  CC.buildTileSVG = function (templateId, colori) {
    var tpl = CC.templates.filter(function (t) { return t.id === templateId; })[0] || CC.templates[0];
    var cc = (colori && colori.length) ? colori : ["#c9cddb"];
    var inner = tpl.render(cc);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIZE + " " + SIZE +
      '" width="' + SIZE + '" height="' + SIZE + '" role="img" aria-label="Anteprima piastrella">' +
      '<rect x="0" y="0" width="' + SIZE + '" height="' + SIZE + '" rx="18" fill="#ffffff"></rect>' +
      inner + "</svg>"
    );
  };

  CC.SIZE = SIZE;
})();
