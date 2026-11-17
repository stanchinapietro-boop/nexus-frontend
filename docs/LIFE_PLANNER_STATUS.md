# NEXUS Life Planner — stato tecnico

Aggiornato il 17 novembre 2026. Questo documento descrive il codice presente, non le funzionalità previste per il futuro.

## Risultato

Life Planner ora è una sezione navigabile e collegata alle API locali NEXUS. I record sono persistiti con SQLAlchemy e le nuove entità vengono create all'avvio tramite `Base.metadata.create_all`. Non sono stati aggiunti seed o dati dimostrativi. Le aree restano locali all'installazione e non hanno autenticazione per utente.

## Funzionalità implementate

- **Overview e My Day:** riepilogo di attività, obiettivi, abitudini e routine; selezione Focus 3 salvata nel browser; completamento delle attività e abitudini del giorno; carico basato sui minuti stimati.
- **Attività:** creazione, modifica tramite API, completamento, cancellazione, sottoattività con stato, filtro giorno/stato, priorità, urgenza, stima e ricorrenze giornaliere/settimanali/mensili. La cronologia separata registra ogni transizione a completato e sopravvive alla cancellazione dell'attività. La creazione pianifica le occorrenze per i successivi 90 giorni; API idempotente per estendere la finestra. Focus 3 è salvato nel browser. Timeline e calendario aggregano attività, eventi, allenamenti e viaggi.
- **Obiettivi:** misure numeriche e frequenza, completamento binario, milestone persistenti e progresso calcolato in base al tipo. Le milestone vengono rimosse insieme all'obiettivo.
- **Abitudini:** giorni programmati, tipo binario/numerico/durata/negativo, registrazione giornaliera sovrascrivibile, storico, streak che salta i giorni non pianificati e rispetto della data di avvio.
- **Routine:** sequenze di passi, durata prevista, registrazione giornaliera dei passi completati e annullamento del completamento.
- **Fitness:** sessioni con disciplina, data, durata, luogo e intensità; esercizi collegati con gruppo muscolare e registrazione di ripetizioni/peso/recupero.
- **Alimentazione:** pasti pianificati e collegamento opzionale a una ricetta; stato di pasto consumato.
- **Ricette e dispensa:** ricette con ingredienti inseriti manualmente; confronto quantità ricetta/dispensa; anteprima delle mancanze prima dell'aggiunta alla spesa.
- **Spesa:** articoli, quantità, unità, categoria, prezzo previsto, stato acquistato; scheda separata della dispensa con scadenza e posizione.
- **Viaggi:** date, destinazione, paese, accompagnatori e budget previsto; itinerario per giorno e checklist categorizzata. La cancellazione rimuove itinerario e checklist associati.
- **Eventi:** creazione, modifica, cancellazione e validazione degli orari.
- **Esperienze, hobby e musica:** record personali con stato, categoria, data obiettivo, valutazione, ore, link e dettagli; i progetti musicali possono contenere DAW/genere e riferimenti inseriti dall'utente.
- **Media e libri:** registrazione locale di film, serie, giochi, libri e musica. I metadati manuali includono descrizione, link copertina, anno, piattaforma, autore, pagine, stagioni/episodi e ore giocate; progressi e metadati sono modificabili. Nessun catalogo esterno o immagine viene inventato.
- **Analytics e suggerimenti:** contatori derivati dai record; suggerimenti deterministici su scadenze e abitudini del giorno, dichiarati come tali e senza chiamate AI esterne.
- **Esportazione:** endpoint JSON che include i record Life Planner, compresi i dati collegati.
- **Promemoria:** preferenze attivabili/disattivabili salvate nel database; la schermata mostra promemoria calcolati sui task, abitudini, routine, allenamenti, eventi e obiettivi reali.
- **Navigazione:** sidebar per categorie su desktop e selettore a gruppi su smartphone; pagine Finance, Academic e Life vengono caricate separatamente.

## Stato milestone

| Milestone | Stato | Limiti concreti |
|---|---|---|
| 1. Foundation | Parziale | Riutilizza FastAPI/SQLAlchemy e `create_all`; manca Alembic e una politica di migrazione/versionamento del database. |
| 2. Personal productivity | Parziale | Task, sottoattività, ricorrenze, Focus 3, cronologia completamenti, timeline e calendario con filtri giorno/settimana/mese presenti; il calendario mostra un elenco cronologico, non una griglia temporale. Mancano scheduler che estenda automaticamente la finestra, drag & drop e timer/tempo effettivo. I completamenti anteriori all'introduzione della cronologia non sono ricostruibili con una data attendibile. |
| 3. Goals & habits | Parziale | Tipi misurabili, milestone, registrazioni e routine funzionano; mancano riordino/modifica dei passi e grafici storici avanzati. |
| 4. Fitness | Parziale | Sessioni ed esercizi con serie strutturate sono registrabili; mancano schede/programmi strutturati, recupero guidato, partite/tornei e confronti di progressione. |
| 5. Nutrition | Parziale | Pasti, ricette, lista spesa e dispensa sono collegati; mancano tracking quantitativo completo degli alimenti, modifica ricetta dall'interfaccia, liste multiple e conversione affidabile fra unità diverse. Non vengono inventati valori nutrizionali. |
| 6. Experiences | Parziale | Viaggi, itinerario, checklist, eventi ed esperienze persistono; mancano spese di viaggio collegate a Finance, budget effettivo, mappa, allegati e galleria. |
| 7. Entertainment | Parziale | Librerie locali, progressi e metadati manuali modificabili presenti; copertine solo come URL inserito dall'utente (senza upload/anteprima), mancano preferiti, ricerca/filtri, date di inizio/fine, note/citazioni strutturate per libri, obiettivo annuale e statistiche specifiche per hobby/musica. |
| 8. Analytics | Parziale | Metriche e serie giornaliere provengono dal database; filtro 7/30/90 giorni presente e i nuovi completamenti usano timestamp reali. Mancano confronti fra periodi e metriche dedicate a esperienze, spesa e hobby. I completamenti storici precedenti alla cronologia non vengono inclusi perché la data effettiva non è disponibile. |
| 9. AI & automations | Parziale | «Life insights» è un insieme di regole locali leggibili, non un modello AI. I promemoria in-app sono calcolati all'apertura della pagina; mancano notifiche browser/iOS e scheduler/automazioni persistenti. |
| 10. Integration & polish | Parziale | Export JSON e navigazione responsive implementati. Finance, Academic, calendario globale, Obsidian e sincronizzazione Life↔TickTick non sono collegati. Mancano restore/import, backup automatico, account/isolamento utenti e verifica visiva su dispositivi mobili reali. |

## API Life aggiunte

Base `/api/life`: `tasks`, `tasks/{id}/subtasks`, `tasks/{id}/recurrence`, `recurrences`, `recurrences/{id}/generate`, `subtasks/{id}/toggle`, `goals`, `goals/{id}/milestones`, `habits`, `habits/{id}/log`, `habits/{id}/history`, `routines`, `routines/{id}/steps`, `workouts`, `workouts/{id}/exercises`, `recipes`, `recipes/{id}/shopping-preview`, `recipes/{id}/shopping-list`, `meals`, `shopping`, `pantry`, `trips`, `trips/{id}/itinerary`, `trips/{id}/checklist`, `events`, `media`, `interests`, `calendar`, `analytics`, `insights`, `notifications`, `notifications/settings`, `export.json`.

Gli endpoint applicano limiti e vincoli Pydantic per campi principali e validano intervalli temporali, riferimenti ricetta/viaggio/allenamento e valori degli esercizi. Le entità nuove sono additive; il progetto non ha ancora migrazioni versionate. `create_all` crea tabelle mancanti, ma non altera colonne già esistenti.

## Verifica eseguita

- Backend: `apps/api/.venv/Scripts/python.exe -m pytest -q` — 42 test passati. È presente un avviso di deprecazione Starlette/httpx del `TestClient`.
- Frontend: `npm run build` — compilazione TypeScript e bundle completati.
- Build: nessun avviso di chunk oltre soglia dopo la suddivisione Finance, Academic, Life e grafici in caricamenti separati.
- API locale: health, pasti e analytics interrogati con esito positivo nelle verifiche precedenti; i test verificano metadati media, aggiornamento, export, eliminazione, vincoli di progresso, intervalli calendario e cronologia verificabile dei completamenti.

## File di questa fase

- `apps/api/app/life.py`: modelli, validazione e API Life Planner.
- `apps/api/tests/test_life.py`: copertura API, persistenza, vincoli e calcoli.
- `apps/web/src/pages/Life.tsx`: overview, planning e My Day.
- `apps/web/src/pages/LifeModules.tsx`: pagine Wellness, Experiences, Entertainment e Insights.
- `apps/web/src/api.ts`: tipi e client API Life.
- `apps/web/src/App.tsx`: caricamento differito delle sezioni principali.

Le tabelle `life_media_details` e `life_task_completions` conservano metadati media e cronologia task separatamente dai campi essenziali. La cronologia salva timestamp UTC e giorno civile locale per aggregazioni corrette. `create_all` crea le nuove tabelle nei database esistenti senza alterare quelle già presenti; non è stata introdotta una migrazione versionata.

## Dipendenze e limiti esterni

Non sono configurate credenziali TMDB, Steam, Apple Health, servizi di calendario, Obsidian o provider AI. Le schermate non simulano sincronizzazioni o cataloghi esterni. Le spese rimangono di competenza Finance e Life Planner conserva soltanto il budget previsto del viaggio, così non crea transazioni duplicate.
