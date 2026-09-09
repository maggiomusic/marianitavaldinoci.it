# Sito di Marianita Valdinoci

Sito statico (nessuna build necessaria), ricostruito a partire dal materiale
del vecchio sito in `www.marianitavaldinoci.it/` (biografia, antologia
critica, gallerie "Pensieri dipinti" e "Pensieri plasmati", contatti),
in italiano e inglese.

## Struttura

```
docs/
├── index.html              pagina unica (tutte le sezioni)
├── assets/
│   ├── css/style.css       stile
│   ├── js/data.js          tutti i testi (IT/EN) e l'elenco opere
│   ├── js/main.js          rendering, cambio lingua, lightbox, menu
│   └── img/
│       ├── site/           ritratto e immagine di sfondo dell'hero
│       ├── paintings/      40 dipinti (una immagine per opera/pannello)
│       └── sculptures/     20 sculture
```

## Modificare i testi

Tutti i contenuti (biografia, mostre, citazioni della critica, titoli e
descrizioni delle opere) sono in `assets/js/data.js`, in due blocchi
`it` / `en`. Non serve toccare l'HTML per cambiare un testo.

## Aggiungere un'opera

Aggiungere una voce all'array `paintings` o `sculptures` in `data.js`
(stessa forma delle voci esistenti) e mettere l'immagine corrispondente
in `assets/img/paintings/` o `assets/img/sculptures/` con lo stesso nome
della chiave (`key`).

## Anteprima in locale

```
cd docs
python3 -m http.server 8000
```
poi aprire http://localhost:8000

## Pubblicazione

Pubblicato su GitHub Pages direttamente dalla cartella `docs/` del branch
`main`, con dominio personalizzato `marianitavaldinoci.it` (file `CNAME`).
Per pubblicarlo altrove basta caricare il contenuto della cartella `docs/`
(non la cartella stessa) sullo spazio hosting via FTP/SFTP.
