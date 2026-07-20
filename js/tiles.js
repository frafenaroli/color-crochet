/*
 * tiles.js — generatori di piastrelle a uncinetto in SVG.
 *
 * Ogni template e' una funzione che riceve la lista di colori (hex) della
 * palette e restituisce il markup SVG di una piastrella 400x400.
 * Ogni "giro" della piastrella e' un elemento SVG separato con attributo
 * data-giro: i colori si distribuiscono sui giri in modo ciclico, cosi' in
 * futuro sara' possibile assegnarli anche manualmente giro-per-giro.
 */
(function () {
  "use strict";
  window.CC = window.CC || {};

  var SIZE = 400;
  var C = SIZE / 2; // centro

  // Restituisce il colore per il giro i, ciclando sulla palette.
  function colGiro(colori, i) {
    return colori[i % colori.length];
  }

  // Rettangolo centrato.
  function rect(x, y, w, h, fill, giro, extra) {
    return (
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + fill + '" data-giro="' + giro + '"' +
      (extra || "") + "></rect>"
    );
  }

  // --- Template 1: Granny Square classico (quadrati concentrici) ---
  function grannyClassico(colori) {
    var giri = 6;
    var parts = [];
    var step = C / giri; // ampiezza di ogni anello
    for (var i = 0; i < giri; i++) {
      var inset = i * step;
      var side = SIZE - inset * 2;
      parts.push(
        rect(inset, inset, side, side, colGiro(colori, i), i, ' rx="6"')
      );
    }
    // Piccolo bottone centrale per rifinire il centro (ultimo colore + 1).
    parts.push(
      '<circle cx="' + C + '" cy="' + C + '" r="' + step * 0.5 +
      '" fill="' + colGiro(colori, giri) + '" data-giro="' + giri + '"></circle>'
    );
    return parts.join("");
  }

  // --- Template 2: Cerchi concentrici ---
  function cerchiConcentrici(colori) {
    var giri = 6;
    var parts = [];
    var rMax = C * 0.96;
    var step = rMax / giri;
    for (var i = 0; i < giri; i++) {
      var r = rMax - i * step;
      parts.push(
        '<circle cx="' + C + '" cy="' + C + '" r="' + r +
        '" fill="' + colGiro(colori, i) + '" data-giro="' + i + '"></circle>'
      );
    }
    return parts.join("");
  }

  // --- Template 3: Rombi concentrici (quadrati ruotati 45°) ---
  function rombiConcentrici(colori) {
    var giri = 6;
    var parts = ['<g transform="rotate(45 ' + C + " " + C + ')">'];
    var step = (C * 0.72) / giri;
    var half0 = C * 0.72;
    for (var i = 0; i < giri; i++) {
      var half = half0 - i * step;
      var side = half * 2;
      parts.push(
        rect(C - half, C - half, side, side, colGiro(colori, i), i)
      );
    }
    parts.push("</g>");
    return parts.join("");
  }

  // --- Template 4: Righe (piastrella a strisce) ---
  function righe(colori) {
    var giri = 7;
    var parts = [];
    var h = SIZE / giri;
    for (var i = 0; i < giri; i++) {
      parts.push(rect(0, i * h, SIZE, h + 0.5, colGiro(colori, i), i));
    }
    return parts.join("");
  }

  // --- Template 5: Sole (centro + raggi a spicchi) ---
  function sole(colori) {
    var raggi = 12;
    var parts = [];
    // Spicchi esterni alternati sui colori.
    for (var i = 0; i < raggi; i++) {
      var a0 = (i / raggi) * 2 * Math.PI - Math.PI / 2;
      var a1 = ((i + 1) / raggi) * 2 * Math.PI - Math.PI / 2;
      var R = C * 0.98;
      var x0 = C + R * Math.cos(a0), y0 = C + R * Math.sin(a0);
      var x1 = C + R * Math.cos(a1), y1 = C + R * Math.sin(a1);
      parts.push(
        '<path d="M' + C + " " + C + " L" + x0.toFixed(1) + " " +
        y0.toFixed(1) + " A" + R + " " + R + " 0 0 1 " + x1.toFixed(1) +
        " " + y1.toFixed(1) + ' Z" fill="' + colGiro(colori, i) +
        '" data-giro="' + i + '"></path>'
      );
    }
    // Anello e cuore centrale.
    parts.push(
      '<circle cx="' + C + '" cy="' + C + '" r="' + C * 0.42 +
      '" fill="' + colGiro(colori, raggi) + '" data-giro="' + raggi + '"></circle>'
    );
    parts.push(
      '<circle cx="' + C + '" cy="' + C + '" r="' + C * 0.2 +
      '" fill="' + colGiro(colori, raggi + 1) + '" data-giro="' + (raggi + 1) + '"></circle>'
    );
    return parts.join("");
  }

  // Registro dei template disponibili (2-5 richiesti).
  CC.templates = [
    { id: "granny", nome: "Granny Square", render: grannyClassico },
    { id: "cerchi", nome: "Cerchi", render: cerchiConcentrici },
    { id: "rombi", nome: "Rombi", render: rombiConcentrici },
    { id: "righe", nome: "Righe", render: righe },
    { id: "sole", nome: "Sole", render: sole },
  ];

  // Costruisce l'SVG completo per un dato template e una palette di colori.
  CC.buildTileSVG = function (templateId, colori) {
    var tpl = CC.templates.filter(function (t) { return t.id === templateId; })[0];
    if (!tpl) tpl = CC.templates[0];
    var inner = tpl.render(colori && colori.length ? colori : ["#dddddd"]);
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIZE + " " +
      SIZE + '" width="' + SIZE + '" height="' + SIZE +
      '" role="img" aria-label="Anteprima piastrella">' +
      '<rect x="0" y="0" width="' + SIZE + '" height="' + SIZE +
      '" fill="#ffffff"></rect>' + inner + "</svg>"
    );
  };

  CC.SIZE = SIZE;
})();
