# NEXUS LIFE OS: Foundation (Milestone 01)

## Avvio
1. Installa Node 20+, Python 3.11+ e Git.
2. In PowerShell, dalla cartella del progetto:
   ```
   Set-ExecutionPolicy -Scope Process Bypass
   .\scripts\setup.ps1   # una sola volta
   .\scripts\start.ps1
   ```
3. Apri http://localhost:5173

## Da iPhone
- Stesso Wi-Fi: apri l'indirizzo "iPhone" stampato da start.ps1.
- Se non si apre, consenti la porta 5173 nel Firewall di Windows (rete privata).
- L'installazione come app (Aggiungi a Home) richiede HTTPS: usa Tailscale o un tunnel.

## Verifica
- Overview: backend "online", grafico visibile.
- Settings > Test database: salva una nota, riavvia, deve restare.
- Test API: `apps\api\.venv\Scripts\python -m pytest` (in apps\api)

## Note
- Le tabelle si creano all'avvio (create_all). Alembic verrà aggiunto con il primo modulo reale.
