# NEXUS LIFE OS — frontend

App React (Vite) pensata per Vercel.

La configurazione inclusa collega il frontend del branch supabase-preview al backend Preview dello stesso branch. Le richieste /api passano dallo stesso dominio del frontend. Per pubblicare su Production occorre impostare il backend dell’ambiente corrispondente e verificare la sessione sul dominio pubblico.

## Prova in locale
```
npm install
npm run dev      (serve il backend acceso su 127.0.0.1:8000)
```
