# NEXUS LIFE OS — frontend

App React (Vite) pensata per Vercel.

IMPORTANTE: prima del deploy apri `vercel.json` e sostituisci
`INSERISCI-QUI-L-INDIRIZZO-DEL-BACKEND.vercel.app` con l'indirizzo reale del progetto backend.
Il frontend inoltra le chiamate `/api/...` al backend: così il browser vede un solo indirizzo
e il cookie di accesso funziona anche su iPhone.

Nel codice non c'è nessuna password né chiave: l'accesso è controllato dal server.

## Prova in locale
```
npm install
npm run dev      (serve il backend acceso su 127.0.0.1:8000)
```
