// Anleitung & Datenschutz in drei Sprachen. Jeder Abschnitt: {h: Überschrift, p: [Absatz | {ol:[…]} | {ul:[…]}]}
export const GUIDE = {
  de: [
    { h: '1 · Auf dem iPhone installieren', p: [
      'Öffne die Seite in Safari (nicht in einer anderen App). Tippe unten auf Teilen, dann auf „Zum Home-Bildschirm“ und auf „Hinzufügen“.',
      { ol: ['Safari öffnen und die Adresse der App aufrufen.', 'Auf das Teilen-Symbol (Quadrat mit Pfeil) tippen.', 'Nach unten scrollen → „Zum Home-Bildschirm“ → „Hinzufügen“.', 'Ab jetzt immer über das neue Symbol starten – so bleiben deine Daten dauerhaft gespeichert.'] },
      'Wichtig: Nur die installierte App ist vor dem automatischen Löschen durch iOS geschützt. Im normalen Safari-Tab kann iOS Website-Daten nach 7 Tagen ohne Nutzung entfernen.' ] },
    { h: '2 · Dokumente hinzufügen', p: [
      'Tippe auf „+“ oder auf eine der drei Schaltflächen oben auf der Startseite.',
      { ul: ['Dateien: PDF, Fotos, Word- oder Textdateien aus „Dateien“, iCloud Drive oder dem Fotoarchiv.', 'Foto: fotografiere einen Brief mit der Kamera. Leg ihn auf einen dunklen Tisch, gutes Licht, gerade von oben.', 'Text: füge Text ein. Tipp: in das Textfeld lange drücken → „Text scannen“ liest einen Brief direkt mit der Kamera und fügt den Text ein.'] },
      'Die App liest den Text, erkennt den Dokumenttyp, das Datum, den Absender und mögliche Fristen und legt das Dokument im passenden Ordner ab.' ] },
    { h: '3 · Wie die Sortierung funktioniert', p: [
      'Die App kennt rund 130 Dokumenttypen in 20 Hauptordnern (z. B. Steuerbescheid, Mietvertrag, Gehaltsabrechnung, Impfpass). Sie sucht typische Wörter und Formulierungen im Text und vergibt Punkte.',
      { ul: ['Ist sie sich sicher, landet das Dokument sofort im richtigen Ordner.', 'Ist sie unsicher, liegt es im Eingang mit bis zu drei Vorschlägen. Ein Tipp genügt.', 'Wenn du etwas verschiebst, lernt die App daraus: ähnliche Dokumente (gleicher Absender, gleiche Wörter) landen künftig gleich richtig.', 'Unter Mehr → Sortierung stellst du ein, wie mutig sie automatisch ablegt.'] },
      'Fotos und Scans ohne Text lesen wir per Texterkennung (OCR). Beim ersten Mal lädt das Gerät dafür einmalig ca. 15 MB; danach funktioniert es ohne Internet.' ] },
    { h: '4 · Fristen, Erinnerungen und Aufbewahrung', p: [
      'Die App erkennt Datumsangaben wie „bis zum 14.04.2026“, „innerhalb von 2 Wochen“ oder „gültig bis …“ und zeigt sie als Karten auf der Startseite. Bei Bescheiden schlägt sie die übliche gesetzliche Frist vor (z. B. Einspruch: 1 Monat + 3 Tage). Das ist eine Orientierung – prüfe immer den Brief selbst.',
      'Tippe im Dokument auf „In Kalender“, um einen Termin mit Erinnerung anzulegen. Unter Mehr → Aufräumen siehst du, welche Dokumente die übliche Aufbewahrungsfrist überschritten haben.' ] },
    { h: '5 · Übersetzung', p: [
      'Jeder Ordner und jedes Dokument wird sofort erklärt: Was ist das? Was musst du tun? Das steht in Deutsch und – wenn eingestellt – parallel in Russisch oder Englisch. Wörter aus dem Dokument (Bescheid, Frist, Widerspruch …) werden automatisch übersetzt.',
      'Den ganzen Text übersetzen: (a) Reiter „Text“ → Text lange drücken → „Alles auswählen“ → „Übersetzen“ (iOS-Übersetzer, kostenlos, nach Download des Sprachpakets auch offline). (b) Wenn dein Browser eine eingebaute Übersetzung hat, erscheint sie im Reiter „Übersetzung“. (c) Optional: eigener Claude-API-Schlüssel unter Mehr → KI-Übersetzung. Achtung: dabei wird der Text an Anthropic gesendet.' ] },
    { h: '6 · Deine Daten – nur auf deinem Gerät', p: [
      'Alle Dokumente, Texte und Einstellungen liegen im geschützten Speicher dieser App auf deinem Gerät. Es gibt keinen Server und kein Konto. Wenn mehrere Personen die App nutzen (z. B. Partner oder Familie), hat jede Person ihre eigene, getrennte Ablage auf dem eigenen Handy.',
      'Nichts verlässt das Gerät, außer wenn du aktiv teilst, sicherst oder die optionale KI-Übersetzung nutzt. Nur die einmalige Texterkennungs-Komponente wird bei Bedarf aus dem Internet geladen.' ] },
    { h: '7 · Sichern & Cloud (iCloud Drive)', p: [
      'Mehr → Sicherung & Speicher → „Sicherung vorbereiten“ → „Sichern“ → im iOS-Menü „In Dateien sichern“ → iCloud Drive wählen. Die ZIP-Datei enthält deine Ordnerstruktur und alle Originale.',
      'Zum Wiederherstellen (neues Handy): App installieren → Mehr → „Sicherung wiederherstellen“ → ZIP aus iCloud Drive wählen.',
      'Safari kann auf dem iPhone nicht selbstständig in einen Cloud-Ordner schreiben; deshalb ist die Sicherung ein bewusster Schritt. Die App erinnert dich nach 30 Tagen. Auf Computer/Android (Chrome, Edge) kannst du zusätzlich einen Ordner verbinden, der automatisch gespiegelt wird.' ] },
    { h: '8 · An Partner oder Familie weitergeben', p: [
      'Schicke einfach die Adresse der App. Jede Person öffnet sie in Safari, installiert sie auf dem eigenen Home-Bildschirm und beginnt mit einer leeren, eigenen Ablage. Unter Mehr → Personen kannst du mehrere Personen anlegen (z. B. für Kinder), wenn du ihre Dokumente auf deinem Gerät mitführst.' ] },
    { h: '9 · Wenn etwas nicht klappt', p: [
      { ul: ['Dokument landet im Eingang: Ein Tipp auf einen Vorschlag genügt; die App merkt es sich.', 'Foto wird nicht gelesen: besseres Licht, gerade fotografieren, Texterkennung unter Mehr → Sortierung einschalten, oder Text einfügen.', 'Speicher voll: Mehr → Sicherung & Speicher; alte Dokumente über „Aufräumen“ löschen.', 'App zeigt alte Version: App komplett schließen und neu öffnen.'] },
      'Die Hinweise in der App sind allgemeine Orientierung und keine Rechts- oder Steuerberatung. Bei Fristen und Beträgen gilt immer das Originalschreiben.' ] },
    { h: 'App-Sperre', p: ['Unter „Mehr → Sperre“ legst du einen 6-stelligen Code fest und kannst Face ID / Touch ID als Abkürzung einschalten. Die Sperre verbirgt die App beim Zurückkehren oder im App-Umschalter. Sie verschlüsselt die Dokumente nicht – schalte zusätzlich die Gerätesperre deines iPhones ein. Code vergessen? Dann hilft nur Löschen der App-Daten; sichere deshalb vorher regelmäßig.' ] },
  ],
  ru: [
    { h: '1 · Установка на iPhone', p: [
      'Откройте страницу в Safari (не в другом приложении). Нажмите «Поделиться» внизу, затем «На экран “Домой”» и «Добавить».',
      { ol: ['Откройте Safari и перейдите по адресу приложения.', 'Нажмите значок «Поделиться» (квадрат со стрелкой).', 'Прокрутите вниз → «На экран “Домой”» → «Добавить».', 'Дальше всегда запускайте приложение через новый значок — так данные хранятся постоянно.'] },
      'Важно: только установленное приложение защищено от автоматического удаления данных iOS. В обычной вкладке Safari iOS может удалить данные сайта через 7 дней без использования.' ] },
    { h: '2 · Как добавить документы', p: [
      'Нажмите «+» или одну из трёх кнопок наверху главного экрана.',
      { ul: ['Файлы: PDF, фото, Word и текстовые файлы из «Файлов», iCloud Drive или Фото.', 'Фото: сфотографируйте письмо. Положите его на тёмный стол при хорошем свете, снимайте прямо сверху.', 'Текст: вставьте текст. Совет: долгое нажатие в поле → «Сканировать текст» читает письмо камерой и вставляет текст.'] },
      'Приложение читает текст, определяет тип документа, дату, отправителя и возможные сроки и кладёт документ в нужную папку.' ] },
    { h: '3 · Как работает сортировка', p: [
      'Приложение знает около 130 типов документов в 20 основных папках (например, Steuerbescheid, договор аренды, расчётный листок, прививочный паспорт). Оно ищет в тексте типичные слова и формулировки и начисляет баллы.',
      { ul: ['Если уверено — документ сразу попадает в нужную папку.', 'Если не уверено — документ лежит во «Входящих» с тремя вариантами. Достаточно одного нажатия.', 'Когда вы перекладываете документ, приложение учится: похожие документы (тот же отправитель, те же слова) дальше попадут куда нужно.', 'В Ещё → Сортировка можно настроить, насколько смело оно раскладывает автоматически.'] },
      'Фото и сканы без текста читаются распознаванием (OCR). В первый раз устройство один раз скачивает около 15 МБ, дальше работает без интернета.' ] },
    { h: '4 · Сроки, напоминания, хранение', p: [
      'Приложение находит даты вроде «до 14.04.2026», «в течение 2 недель» или «действителен до …» и показывает их карточками на главной. Для решений ведомств предлагает обычный законный срок (например, Einspruch: 1 месяц + 3 дня). Это ориентир — всегда проверяйте само письмо.',
      'В документе нажмите «В календарь», чтобы создать событие с напоминанием. В Ещё → Очистка видно, у каких документов истёк обычный срок хранения.' ] },
    { h: '5 · Перевод', p: [
      'Каждая папка и каждый документ сразу объясняются: что это и что нужно сделать. Текст показывается по-немецки и, если включено, параллельно на русском или английском. Слова из документа (Bescheid, Frist, Widerspruch …) переводятся автоматически.',
      'Перевести весь текст: (а) вкладка «Текст» → долго нажмите на текст → «Выбрать все» → «Перевести» (переводчик iOS, бесплатно, после загрузки языка работает и офлайн). (б) Если в вашем браузере есть встроенный перевод, он появится на вкладке «Перевод». (в) Необязательно: свой ключ Claude API в Ещё → ИИ-перевод. Внимание: при этом текст отправляется в Anthropic.' ] },
    { h: '6 · Ваши данные — только на вашем устройстве', p: [
      'Все документы, тексты и настройки лежат в защищённом хранилище приложения на вашем устройстве. Сервера и учётной записи нет. Если приложением пользуются несколько человек (например, партнёр или семья), у каждого своё отдельное хранилище на собственном телефоне.',
      'Ничто не покидает устройство, если вы сами не делитесь, не делаете резервную копию и не используете необязательный ИИ-перевод. Из интернета при необходимости один раз скачивается только компонент распознавания текста.' ] },
    { h: '7 · Резервная копия и облако (iCloud Drive)', p: [
      'Ещё → Резервная копия и память → «Подготовить копию» → «Сохранить» → в меню iOS «Сохранить в “Файлы”» → выберите iCloud Drive. В ZIP-архиве — ваша структура папок и все оригиналы.',
      'Восстановление (новый телефон): установить приложение → Ещё → «Восстановить копию» → выбрать ZIP из iCloud Drive.',
      'Safari на iPhone не умеет сам писать в облачную папку, поэтому копия делается осознанным шагом. Через 30 дней приложение напомнит. На компьютере/Android (Chrome, Edge) можно дополнительно подключить папку для автоматического зеркалирования.' ] },
    { h: '8 · Передать партнёру или семье', p: [
      'Просто отправьте адрес приложения. Каждый открывает его в Safari, ставит на свой экран «Домой» и начинает с пустого собственного хранилища. В Ещё → Люди можно завести несколько человек (например, детей), если вы храните их документы на своём устройстве.' ] },
    { h: '9 · Если что-то не получается', p: [
      { ul: ['Документ попал во «Входящие»: нажмите на подсказку — приложение запомнит.', 'Фото не читается: больше света, снимайте ровно, включите распознавание в Ещё → Сортировка или вставьте текст.', 'Память заполнена: Ещё → Резервная копия и память; удалите старое через «Очистку».', 'Показывается старая версия: полностью закройте приложение и откройте снова.'] },
      'Подсказки в приложении — общий ориентир, а не юридическая или налоговая консультация. По срокам и суммам всегда главное — оригинал письма.' ] },
    { h: 'Блокировка приложения', p: ['В «Ещё → Блокировка» задайте 6-значный код и при желании включите Face ID / Touch ID. Блокировка прячет приложение при возврате и в переключателе приложений. Документы она не шифрует — дополнительно включите блокировку самого iPhone. Забыли код? Поможет только удаление данных приложения, поэтому заранее делайте резервные копии.' ] },
  ],
  en: [
    { h: '1 · Install on iPhone', p: [
      'Open the page in Safari (not inside another app). Tap Share at the bottom, then “Add to Home Screen”, then “Add”.',
      { ol: ['Open Safari and go to the app’s address.', 'Tap the Share icon (square with arrow).', 'Scroll down → “Add to Home Screen” → “Add”.', 'From now on always launch via the new icon – this keeps your data stored permanently.'] },
      'Important: only the installed app is protected from iOS’s automatic clean-up. In a normal Safari tab, iOS may delete website data after 7 days without use.' ] },
    { h: '2 · Adding documents', p: [
      'Tap “+” or one of the three buttons at the top of the home screen.',
      { ul: ['Files: PDFs, photos, Word or text files from Files, iCloud Drive or Photos.', 'Photo: photograph a letter with the camera. Lay it on a dark table in good light, straight from above.', 'Text: paste text. Tip: long-press in the text field → “Scan Text” reads a letter with the camera and inserts the text.'] },
      'The app reads the text, recognises the document type, date, sender and possible deadlines and files the document in the matching folder.' ] },
    { h: '3 · How sorting works', p: [
      'The app knows about 130 document types in 20 main folders (e.g. tax assessment, tenancy agreement, payslip, vaccination record). It looks for typical words and phrases in the text and scores them.',
      { ul: ['If it is sure, the document goes straight into the right folder.', 'If unsure, it waits in the Inbox with up to three suggestions. One tap is enough.', 'When you move something, the app learns: similar documents (same sender, same words) will land correctly in future.', 'Under More → Sorting you set how boldly it files automatically.'] },
      'Photos and scans without text are read with OCR. The first time, your device downloads about 15 MB once; after that it works offline.' ] },
    { h: '4 · Deadlines, reminders and retention', p: [
      'The app spots dates such as “by 14.04.2026”, “within 2 weeks” or “valid until …” and shows them as cards on the home screen. For official decisions it suggests the usual statutory period (e.g. objection: 1 month + 3 days). It is guidance only – always check the letter itself.',
      'Tap “Add to calendar” in a document to create an event with a reminder. Under More → Clean up you see which documents have passed their usual retention period.' ] },
    { h: '5 · Translation', p: [
      'Every folder and document is explained immediately: what it is and what to do. This is shown in German and – if set – in parallel in Russian or English. Words from the document (Bescheid, Frist, Widerspruch …) are translated automatically.',
      'To translate the whole text: (a) “Text” tab → long-press the text → “Select All” → “Translate” (iOS Translate, free, offline once the language is downloaded). (b) If your browser has built-in translation it appears in the “Translation” tab. (c) Optional: your own Claude API key under More → AI translation. Note: this sends the text to Anthropic.' ] },
    { h: '6 · Your data – only on your device', p: [
      'All documents, texts and settings live in this app’s protected storage on your device. There is no server and no account. If several people use the app (e.g. partner or family), each person has their own separate store on their own phone.',
      'Nothing leaves the device unless you share, back up or use the optional AI translation. Only the one-off text-recognition component is downloaded from the internet when needed.' ] },
    { h: '7 · Backup & cloud (iCloud Drive)', p: [
      'More → Backup & storage → “Prepare backup” → “Save” → in the iOS menu “Save to Files” → choose iCloud Drive. The ZIP contains your folder structure and all originals.',
      'To restore (new phone): install the app → More → “Restore backup” → pick the ZIP from iCloud Drive.',
      'Safari on iPhone cannot write to a cloud folder on its own, so backing up is a deliberate step. The app reminds you after 30 days. On computer/Android (Chrome, Edge) you can additionally connect a folder that is mirrored automatically.' ] },
    { h: '8 · Sharing with a partner or family', p: [
      'Just send the app’s address. Each person opens it in Safari, installs it to their own Home Screen and starts with an empty store of their own. Under More → People you can add several people (e.g. children) if you keep their documents on your device.' ] },
    { h: '9 · If something goes wrong', p: [
      { ul: ['Document ended up in the Inbox: tap a suggestion; the app remembers it.', 'Photo not read: better light, shoot straight, enable OCR under More → Sorting, or paste the text.', 'Storage full: More → Backup & storage; delete old documents via “Clean up”.', 'App shows an old version: close the app completely and reopen it.'] },
      'Hints in the app are general guidance, not legal or tax advice. For deadlines and amounts the original letter always prevails.' ] },
    { h: 'App lock', p: ['Under “More → Lock” set a 6-digit code and optionally enable Face ID / Touch ID. The lock hides the app when you return to it and in the app switcher. It does not encrypt the documents – also turn on your iPhone’s own passcode. Forgot the code? Only deleting the app data helps, so back up regularly.' ] },
  ],
};

export const PRIVACY = {
  de: ['Alles lokal: Dokumente, Texte, Vorschaubilder, Einstellungen und das „Gelernte“ der Sortierung liegen ausschließlich auf deinem Gerät (IndexedDB im geschützten App-Speicher).', 'Kein Konto, kein Server, keine Analyse, keine Werbung, keine Cookies.', 'Netzwerk wird nur genutzt: (1) um die App zu laden/aktualisieren, (2) einmalig für die Texterkennung (Programm und Deutsch-Sprachdaten von öffentlichen Servern; dein Dokument wird dabei nicht hochgeladen – die Erkennung läuft auf dem Gerät), (3) wenn du die optionale KI-Übersetzung benutzt: dann wird der Dokumenttext an Anthropic gesendet.', 'Dein API-Schlüssel bleibt auf diesem Gerät. Wer Zugriff auf das entsperrte Gerät hat, kann die App öffnen – nutze Gerätesperre und Face ID.', 'Backups sind nicht verschlüsselt. Lege sie nur an Orten ab, denen du vertraust.'],
  ru: ['Всё локально: документы, тексты, превью, настройки и «обученное» сортировки хранятся только на вашем устройстве (IndexedDB в защищённом хранилище приложения).', 'Без учётной записи, сервера, аналитики, рекламы и cookies.', 'Сеть используется только: (1) для загрузки/обновления приложения, (2) один раз для распознавания текста (программа и немецкие языковые данные с публичных серверов; ваш документ при этом не загружается — распознавание идёт на устройстве), (3) если вы используете необязательный ИИ-перевод: тогда текст документа отправляется в Anthropic.', 'Ваш API-ключ остаётся на этом устройстве. Кто имеет доступ к разблокированному устройству, может открыть приложение — используйте код-пароль и Face ID.', 'Резервные копии не зашифрованы. Храните их только там, где вы доверяете.'],
  en: ['All local: documents, texts, thumbnails, settings and what the sorter has learned stay only on your device (IndexedDB in the app’s protected storage).', 'No account, no server, no analytics, no ads, no cookies.', 'The network is used only: (1) to load/update the app, (2) once for text recognition (the program and German language data from public servers; your document is not uploaded – recognition runs on the device), (3) if you use the optional AI translation: then the document text is sent to Anthropic.', 'Your API key stays on this device. Anyone with access to the unlocked device can open the app – use a passcode and Face ID.', 'Backups are not encrypted. Store them only where you trust.'],
};
