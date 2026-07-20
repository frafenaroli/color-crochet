# ColorCrochet 🧶

Piccola webapp (solo italiano, mobile first) per scegliere e provare combinazioni
di colori per piastrelle a uncinetto. Sviluppata su misura per mia mamma.

L'utente compone una palette di **3-6 colori** — da un filato reale preimpostato
oppure creandoli liberamente — e ne vede subito l'anteprima su una piastrella a
uncinetto generata in SVG, che può poi salvare come immagine.

## Come si usa / come si avvia

Nessun backend, nessun passaggio di build: è una webapp statica.

- **Modo più semplice:** apri `index.html` con un doppio clic (funziona anche da `file://`).
- **Con un server locale** (consigliato per lo sviluppo in VSCode):
  ```bash
  python3 -m http.server 8000
  # poi apri http://localhost:8000
  ```
  oppure l'estensione *Live Server* di VSCode.

## Flusso

Flusso lineare a step, per ridurre il carico cognitivo:

1. **Tipo di palette** — preimpostata (filato reale) o personalizzata.
2. **Componi** — scegli 3-6 colori col tocco; riordina/togli dalla barra in basso.
3. **Anteprima** — la piastrella si aggiorna subito; cambia modello, salva l'immagine.

Le preferenze (dimensione testo) e l'ultima palette creata vengono ricordate sul
dispositivo tramite `localStorage` (nessun dato inviato a server).

## Struttura del progetto

```
index.html            Pagina unica, carica gli script in ordine
css/styles.css        Stile: mobile first, contrasto elevato, target touch ≥ 44px
data/
  caprice-cervinia.json   Dataset colori canonico (56 colori) — FONTE dei dati
  palettes.js             Generato da build-data.py, caricato a runtime
js/
  tiles.js            Generatori piastrella SVG (5 modelli, giri = elementi SVG)
  storage.js          Persistenza locale (palette, dimensione testo)
  export.js           Anteprima → PNG (canvas) + condivisione nativa se disponibile
  app.js              Controller del flusso a step
scripts/
  build-data.py       Rigenera data/palettes.js dai .json in data/
```

### Dati dei colori

I file `.json` in `data/` sono la fonte canonica. `data/palettes.js` è **generato**
e incorpora quei dati come JavaScript, così l'app non ha bisogno di `fetch()` e
funziona anche aprendo il file in locale. Dopo aver modificato un `.json`:

```bash
python3 scripts/build-data.py
```

Per aggiungere un nuovo filato: crea un nuovo `.json` con lo stesso formato,
aggiungilo a `PALETTE_FILES` in `scripts/build-data.py` e rigenera. Il formato
palette è generico (non è legato a "Caprice"), quindi l'architettura è già pronta
per altri filati.

> ⚠️ **Colori indicativi.** Gli hex del dataset Caprice Cervinia sono stati
> campionati dalla foto della cartella colori ufficiale e possono variare rispetto
> al filato reale (monitor, illuminazione, lotto). I nomi con `"nomeConfermato": false`
> sono stimati dalla tonalità e da verificare (segnati con `*` in interfaccia).

## Accessibilità

- Testo grande di default, con controllo per ingrandirlo (A− / A+).
- Contrasto elevato, palette di sistema neutra.
- Target touch generosi (≥ 44px), focus visibile da tastiera.
- Nome colore sempre visibile accanto allo swatch (non solo il colore).

## Stato rispetto ai requisiti

| Funzionalità | Stato |
|---|---|
| Dataset completo (56 colori) | ✅ |
| Selezione palette 3-6 colori (tap) + riordino | ✅ |
| Anteprima SVG con colori sui giri | ✅ |
| Modelli di piastrella (5: Granny, Cerchi, Rombi, Righe, Sole) | ✅ |
| Accessibilità (font scaling, contrasto, touch) | ✅ |
| Palette personalizzata (color picker) | ✅ |
| Salvataggio immagine PNG + condivisione nativa | ✅ |
| Persistenza locale ultima palette | ✅ |

### Ancora da decidere (non bloccante)

- Assegnazione manuale colore giro-per-giro (ora è ciclica automatica).
- Verifica dei 3 nomi colore stimati (`3023`, `3002`, `3020`) su fonte ufficiale.
