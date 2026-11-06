# iOS-App ohne Mac bauen (GitHub Actions → TestFlight)

Das Repo baut die App in der Cloud (macOS-Runner) und lädt sie zu TestFlight hoch. Alles Nötige geht im Browser.

## Einmalig einrichten
1. **Bezahlte Mitgliedschaft**: developer.apple.com/account → „Mitgliedschaft“ muss „Apple Developer Program“ zeigen (nur Beta-Zugang reicht für TestFlight nicht).
2. **Bundle-ID** (Zertifikate, IDs & Profile → Identifiers → +): App IDs → App → Bundle ID (explicit) `io.github.amigogelo.aktenschrank`, Name „Aktenschrank“.
3. **App anlegen** (appstoreconnect.apple.com → Apps → +): Neue App, iOS, Name „Aktenschrank“, Sprache Deutsch, Bundle-ID wie oben, SKU `aktenschrank`.
4. **API-Schlüssel** (appstoreconnect.apple.com → Benutzer und Zugriff → Integrationen → App-Store-Connect-API → Schlüssel erzeugen): Rolle **Admin** (nötig, damit Xcode die Signaturzertifikate in der Cloud anlegen darf; danach kannst du ihn widerrufen). Notiere **Issuer-ID** und **Key-ID** und lade die `.p8` herunter (nur einmal möglich).
5. **GitHub-Secrets** (Repo → Settings → Secrets and variables → Actions → New repository secret):
   - `ASC_KEY_ID` – die Key-ID
   - `ASC_ISSUER_ID` – die Issuer-ID
   - `ASC_KEY_P8` – kompletter Inhalt der .p8-Datei (inkl. BEGIN/END-Zeilen)
   - `APPLE_TEAM_ID` – 10 Zeichen, unter developer.apple.com → Mitgliedschaft

## Bauen
Repo → Actions → „iOS → TestFlight“ → Run workflow. Nach ca. 10–20 Minuten erscheint der Build in App Store Connect → TestFlight (Verarbeitung dauert noch einige Minuten). Dort dich als internen Tester hinzufügen, dann in der TestFlight-App auf dem iPhone installieren.

## Bekannte Risiken (ungetestet)
Der Workflow konnte in der Entwicklungsumgebung nicht ausgeführt werden. Beim ersten Lauf können Anpassungen nötig sein (Xcode-Version, Signierung). Das Log liegt als Artefakt „build-logs“ am Lauf.
