# Tests de bout en bout (Selenium + pytest)

Cas du plan de test exécutés dans un vrai navigateur, sur une copie de test de l'application :
base H2 en mémoire (jamais MySQL), e-mails captés par un faux serveur SMTP (aucun envoi réel).

| Fichier | Cas |
|---|---|
| `test_01_maram.py` | TC-05, TC-06, TC-07, TC-08 |
| `test_02_mariem.py` | TC-12, TC-09, TC-10, TC-11 |
| `test_03_systeme_acceptation.py` | SYS-01, SYS-02, SYS-03, ACC-01, ACC-02, ACC-03 |

## Lancer

```bash
pip install -r tests/e2e/requirements.txt
python tests/e2e/fake_smtp.py tests/e2e/mails &          # faux SMTP sur le port 2525
(cd frontend && BACKEND_URL=http://localhost:8082 npx vite --port 5174 --strictPort) &
bash tests/e2e/run_suite.sh chrome                         # ou: edge (EDGEDRIVER=chemin\msedgedriver.exe)
```

`run_suite.sh` démarre le backend de test (port 8082, base vide), lance les 14 cas et écrit
`reports/selenium-<navigateur>.xml` (JUnit XML, à envoyer dans TestRail avec TR CLI) et les captures
dans `screenshots/`. TC-11 et SYS-02 appellent le vrai Gemini (clé de `backend/.env`).
