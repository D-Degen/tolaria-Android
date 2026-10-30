import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFallbackUrlMetadata,
  detectUrlPreviewInfo,
  extractChaptersFromDescription,
  extractUrlsFromText,
  extractYouTubePlayerResponse,
  extractYouTubeVideoId,
  parseHtmlDocumentContent,
  parseTranscriptPayload,
  parseYouTubeCaptionXml,
} from './urlContentGrabber'
import { generateSmartNoteDraft } from './smartNotesEngine'

describe('urlContentGrabber', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts any HTTP/HTTPS URLs and preserves accompanying user notes', () => {
    const raw =
      'Wichtiger Artikel fürs Architektur-Meeting:\nhttps://example.com/blog/local-ai-android?ref=share.\nTODO: Im Team besprechen'
    const extracted = extractUrlsFromText(raw)

    expect(extracted.firstUrl).toBe('https://example.com/blog/local-ai-android?ref=share')
    expect(extracted.urls).toEqual(['https://example.com/blog/local-ai-android?ref=share'])
    expect(extracted.userNotes).toContain('Wichtiger Artikel fürs Architektur-Meeting:')
    expect(extracted.userNotes).toContain('TODO: Im Team besprechen')
  })

  it('detects YouTube video IDs across watch, short, embed, and youtu.be URLs', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=123')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeVideoId('https://m.youtube.com/shorts/abc123XYZ_-')).toBe('abc123XYZ_-')
    expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
  })

  it('classifies URLs into website, repository, or youtube preview info', () => {
    expect(detectUrlPreviewInfo('https://heise.de/news/ki-artikel.html').kind).toBe('website')
    expect(detectUrlPreviewInfo('https://github.com/facebook/react').kind).toBe('repository')
    expect(detectUrlPreviewInfo('https://youtu.be/dQw4w9WgXcQ').kind).toBe('youtube')
  })

  it('parses general webpage and article HTML into structured metadata and readable text', () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Lokale KI auf Android nutzen - TechBlog</title>
          <meta property="og:title" content="Lokale KI auf Android nutzen" />
          <meta property="og:site_name" content="TechBlog" />
          <meta property="og:type" content="article" />
          <meta name="author" content="Max Mustermann" />
          <meta name="description" content="Ein Leitfaden für On-Device-Modelle mit Gemini Nano und ML Kit." />
          <meta name="keywords" content="android, gemini-nano, mlkit, offline" />
        </head>
        <body>
          <nav>Menü Startseite Kontakt</nav>
          <article>
            <h1>Lokale KI auf Android nutzen</h1>
            <p>Mit der neuen ML Kit GenAI Prompt API laufen Sprachmodelle direkt auf dem Smartphone ohne Cloud-Kosten.</p>
            <h2>Vorteile der lokalen Ausführung</h2>
            <ul>
              <li>Volle Privatsphäre da keine Daten das Gerät verlassen</li>
              <li>Keine laufenden API-Gebühren für Entwickler oder Nutzer</li>
            </ul>
          </article>
          <footer>Impressum &amp; Datenschutz</footer>
        </body>
      </html>
    `

    const parsed = parseHtmlDocumentContent('https://techblog.example.com/posts/lokale-ki', html)
    expect(parsed.fetched).toBe(true)
    expect(parsed.kind).toBe('article')
    expect(parsed.title).toBe('Lokale KI auf Android nutzen')
    expect(parsed.siteName).toBe('TechBlog')
    expect(parsed.author).toBe('Max Mustermann')
    expect(parsed.description).toContain('Leitfaden')
    expect(parsed.bodyText).toContain('Sprachmodelle direkt auf dem Smartphone')
    expect(parsed.bodyText).toContain('Volle Privatsphäre')
    expect(parsed.keywords).toContain('android')
  })

  it('extracts YouTube player response, chapters, and caption XML', () => {
    const playerHtml = `
      <script>
        var ytInitialPlayerResponse = {
          "videoDetails": {
            "title": "Kotlin Multiplatform & Android Architektur",
            "author": "Android Devs DE",
            "lengthSeconds": "755",
            "shortDescription": "In diesem Video zeigen wir moderne Android-Architektur.\\n00:00 Intro\\n02:30 Modul-Aufbau\\n08:15 Fazit",
            "keywords": ["kotlin", "android", "architektur"]
          },
          "captions": {
            "playerCaptionsTracklistRenderer": {
              "captionTracks": [
                { "baseUrl": "https://www.youtube.com/api/timedtext?v=123&lang=de", "languageCode": "de" }
              ]
            }
          }
        };
      </script>
    `
    const extracted = extractYouTubePlayerResponse(playerHtml)
    expect(extracted).not.toBeNull()
    expect(extracted?.title).toBe('Kotlin Multiplatform & Android Architektur')
    expect(extracted?.author).toBe('Android Devs DE')
    expect(extracted?.lengthSeconds).toBe(755)
    expect(extracted?.captionUrl).toContain('lang=de')

    const chapters = extractChaptersFromDescription(extracted?.shortDescription ?? '')
    expect(chapters).toEqual([
      { timestamp: '00:00', title: 'Intro' },
      { timestamp: '02:30', title: 'Modul-Aufbau' },
      { timestamp: '08:15', title: 'Fazit' },
    ])

    const captionXml = `<transcript><text start="0" dur="2.5">Hallo und herzlich willkommen</text><text start="2.5" dur="3.0">zu unserem Kotlin Tutorial &amp; Deep Dive.</text></transcript>`
    expect(parseYouTubeCaptionXml(captionXml)).toBe(
      'Hallo und herzlich willkommen zu unserem Kotlin Tutorial & Deep Dive.',
    )

    const srv3Xml = `<timedtext><body><p t="0" d="2000"><s>Erster Satz im Video.</s></p><p t="2000" d="3000"><s>Zweiter Satz mit wichtigen Fakten.</s></p></body></timedtext>`
    expect(parseTranscriptPayload(srv3Xml)).toBe(
      'Erster Satz im Video. Zweiter Satz mit wichtigen Fakten.',
    )

    const json3Payload = JSON.stringify({
      events: [
        { segs: [{ utf8: 'Willkommen ' }, { utf8: 'zum YouTube Transkript Test.' }] },
        { segs: [{ utf8: 'Hier werden alle Inhalte zusammengefasst.' }] },
      ],
    })
    expect(parseTranscriptPayload(json3Payload)).toBe(
      'Willkommen zum YouTube Transkript Test. Hier werden alle Inhalte zusammengefasst.',
    )

    const vttPayload = `WEBVTT

00:00:01.000 --> 00:00:04.000
Das ist ein WebVTT Untertitel für HTML5 Videos.

00:00:04.500 --> 00:00:08.000
Damit lassen sich auch andere Video-Plattformen zusammenfassen.`
    expect(parseTranscriptPayload(vttPayload)).toBe(
      'Das ist ein WebVTT Untertitel für HTML5 Videos. Damit lassen sich auch andere Video-Plattformen zusammenfassen.',
    )
  })

  it('builds a clean fallback from the URL slug when offline or blocked', () => {
    const fallback = buildFallbackUrlMetadata('https://developer.android.com/ai/gemini-nano-guide')
    expect(fallback.title).toBe('Gemini nano guide')
    expect(fallback.domain).toBe('developer.android.com')
    expect(fallback.fetched).toBe(false)
  })

  it('generates a structured smart note draft from any URL with grabbed content and user notes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `
          <html>
            <head>
              <title> Offline First Apps mit SQLite und Git </title>
              <meta name="description" content="Architektur-Überblick für lokale Synchronisation auf Mobilgeräten." />
            </head>
            <body>
              <article>
                <p>Lokale Datenhaltung sorgt für sofortige Reaktionszeiten und Unabhängigkeit vom Mobilfunknetz.</p>
              </article>
            </body>
          </html>
        `,
      }),
    )

    const draft = await generateSmartNoteDraft(
      'https://architecture.example.org/offline-first-apps\nTODO: Konzept für Tolaria prüfen',
      ['Note', 'Article', 'Task'],
    )

    expect(draft.title).toBe('Offline First Apps mit SQLite und Git')
    expect(draft.type).toBe('Article')
    expect(draft.markdownBody).toContain('https://architecture.example.org/offline-first-apps')
    expect(draft.markdownBody).toContain('## Kernaussagen (KI-Analyse)')
    expect(draft.todos).toContain('- [ ] Konzept für Tolaria prüfen')
  })
})
