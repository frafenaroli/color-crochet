#!/usr/bin/env python3
"""Genera data/palettes.js a partire dai file JSON delle palette in data/.

Perche' non usiamo fetch() a runtime: cosi' l'app funziona anche aprendo
index.html direttamente (file://), senza server ne' passaggi di build.
I file .json restano la fonte canonica dei dati; questo script li incorpora
in un unico file JS che registra le palette in window.CC.palettes.

Uso:  python3 scripts/build-data.py
Aggiungere una palette = aggiungere un .json in PALETTE_FILES e rieseguire.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

# Ordine di caricamento delle palette preimpostate.
PALETTE_FILES = [
    "caprice-cervinia.json",
]

def main():
    palettes = []
    for name in PALETTE_FILES:
        with open(os.path.join(DATA, name), encoding="utf-8") as f:
            palettes.append(json.load(f))

    body = json.dumps(palettes, ensure_ascii=False, indent=2)
    out = (
        "// FILE GENERATO AUTOMATICAMENTE da scripts/build-data.py — non modificare a mano.\n"
        "// Fonte dati: i file .json in data/. Rieseguire lo script dopo ogni modifica.\n"
        "window.CC = window.CC || {};\n"
        "window.CC.palettesPreset = " + body + ";\n"
    )
    with open(os.path.join(DATA, "palettes.js"), "w", encoding="utf-8") as f:
        f.write(out)
    total = sum(len(p.get("colori", [])) for p in palettes)
    print("Scritto data/palettes.js — %d palette, %d colori totali."
          % (len(palettes), total))

if __name__ == "__main__":
    main()
