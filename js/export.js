/*
 * export.js — salvataggio dell'anteprima come immagine PNG.
 * Converte l'SVG della piastrella in canvas e scarica un PNG.
 * Su mobile, se il browser lo supporta, usa la condivisione nativa.
 */
(function () {
  "use strict";
  window.CC = window.CC || {};

  var SCALE = 3; // moltiplicatore risoluzione per un PNG nitido

  // Disegna l'SVG (stringa) su un canvas e ritorna una Promise<canvas>.
  function svgToCanvas(svgString) {
    return new Promise(function (resolve, reject) {
      var size = (CC.SIZE || 400) * SCALE;
      var canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      var ctx = canvas.getContext("2d");
      var img = new Image();
      var svg64 =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
      img.onload = function () {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas);
      };
      img.onerror = function () {
        reject(new Error("Impossibile generare l'immagine."));
      };
      img.src = svg64;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve) {
      if (canvas.toBlob) {
        canvas.toBlob(function (b) { resolve(b); }, "image/png");
      } else {
        // Fallback: dataURL -> Blob
        var data = canvas.toDataURL("image/png");
        var bin = atob(data.split(",")[1]);
        var arr = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        resolve(new Blob([arr], { type: "image/png" }));
      }
    });
  }

  function scaricaBlob(blob, nomeFile) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nomeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /*
   * Esporta l'SVG: prova la condivisione nativa (mobile), altrimenti scarica.
   * Ritorna una Promise che si risolve con un messaggio d'esito per l'utente.
   */
  CC.esportaImmagine = function (svgString, nomeFile) {
    nomeFile = nomeFile || "colorcrochet.png";
    return svgToCanvas(svgString)
      .then(canvasToBlob)
      .then(function (blob) {
        var file = null;
        try {
          file = new File([blob], nomeFile, { type: "image/png" });
        } catch (e) { file = null; }

        if (
          file &&
          navigator.canShare &&
          navigator.canShare({ files: [file] }) &&
          navigator.share
        ) {
          return navigator
            .share({ files: [file], title: "ColorCrochet" })
            .then(function () { return "Immagine condivisa."; })
            .catch(function (err) {
              // L'utente puo' aver annullato: in tal caso non facciamo altro.
              if (err && err.name === "AbortError") return "";
              scaricaBlob(blob, nomeFile);
              return "Immagine salvata.";
            });
        }
        scaricaBlob(blob, nomeFile);
        return "Immagine salvata.";
      });
  };
})();
