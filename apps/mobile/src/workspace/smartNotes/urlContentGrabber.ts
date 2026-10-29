export type GrabbedUrlKind = 'website' | 'article' | 'youtube' | 'repository'

export type GrabbedUrlChapter = {
  timestamp: string
  title: string
}

export type GrabbedUrlContent = {
  url: string
  domain: string
  kind: GrabbedUrlKind
  title: string
  siteName?: string
  author?: string
  duration?: string
  description: string
  bodyText: string
  transcript?: string
  chapters: GrabbedUrlChapter[]
  keywords: string[]
  fetched: boolean
}

const URL_REGEX = /https?:\/\/[^\s<>)"'`]+/gi
const FETCH_TIMEOUT_MS = 8_000
const MAX_BODY_CHARS = 3_800
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'

/**
 * Extracts all HTTP/HTTPS URLs from raw user text and returns both the URLs
 * and any remaining user notes/comments outside the URLs.
 */
export function extractUrlsFromText(text: string): {
  urls: string[]
  firstUrl: string | null
  userNotes: string
} {
  const matches = text.match(URL_REGEX) ?? []
  const cleanedUrls = Array.from(
    new Set(
      matches
        .map((raw) => raw.replace(/[.,;:!?)\]]+$/, '').trim())
        .filter((candidate) => isValidHttpUrl(candidate)),
    ),
  )

  let remaining = text
  for (const url of cleanedUrls) {
    remaining = remaining.split(url).join(' ')
  }
  const userNotes = remaining
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')

  return {
    urls: cleanedUrls,
    firstUrl: cleanedUrls[0] ?? null,
    userNotes,
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^(?:www\.|m\.)/, '').toLowerCase()
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id && /^[a-zA-Z0-9_-]{6,15}$/.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const vParam = parsed.searchParams.get('v')
      if (vParam && /^[a-zA-Z0-9_-]{6,15}$/.test(vParam)) return vParam
      const parts = parsed.pathname.split('/').filter(Boolean)
      if ((parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') && parts[1]) {
        return /^[a-zA-Z0-9_-]{6,15}$/.test(parts[1]) ? parts[1] : null
      }
    }
  } catch {
    // Ignore invalid URLs
  }
  return null
}

export function detectUrlPreviewInfo(url: string): {
  url: string
  domain: string
  kind: GrabbedUrlKind
  label: string
} {
  const domain = extractDomain(url)
  if (extractYouTubeVideoId(url)) {
    return { url, domain, kind: 'youtube', label: `YouTube-Video (${domain})` }
  }
  if (domain === 'github.com' || domain === 'gitlab.com') {
    return { url, domain, kind: 'repository', label: `Repository / Code (${domain})` }
  }
  return { url, domain, kind: 'website', label: `Webseite (${domain})` }
}

/**
 * Universal URL grabber: fetches and extracts structured content from any URL
 * (standard websites, blogs, articles, repositories, or YouTube videos),
 * falling back gracefully to URL metadata if offline or blocked.
 */
export async function grabUrlContent(url: string): Promise<GrabbedUrlContent> {
  const videoId = extractYouTubeVideoId(url)
  if (videoId) {
    return grabYouTubeContent(url, videoId)
  }
  return grabWebpageContent(url)
}

async function grabWebpageContent(url: string): Promise<GrabbedUrlContent> {
  const fallback = buildFallbackUrlMetadata(url)
  const html = await fetchTextWithTimeout(url)
  if (!html) return fallback

  return parseHtmlDocumentContent(url, html)
}

export function parseHtmlDocumentContent(url: string, html: string): GrabbedUrlContent {
  const fallback = buildFallbackUrlMetadata(url)
  if (!html?.trim()) return fallback

  const ogTitle = extractMetaContent(html, ['og:title', 'twitter:title'])
  const titleTag = extractTagText(html, 'title')
  const rawTitle = ogTitle || titleTag || fallback.title
  const title = cleanPageTitle(rawTitle) || fallback.title

  const siteName =
    extractMetaContent(html, ['og:site_name', 'application-name']) || fallback.domain
  const author = extractMetaContent(html, ['author', 'article:author', 'twitter:creator'])
  const description =
    extractMetaContent(html, ['og:description', 'twitter:description', 'description']) || ''
  const ogType = extractMetaContent(html, ['og:type'])?.toLowerCase() ?? ''
  const metaKeywords = extractMetaContent(html, ['keywords', 'news_keywords'])
  const keywords = parseKeywordsList(metaKeywords, fallback.domain)

  const bodyText = extractReadableBodyFromHtml(html)
  const isArticle =
    ogType.includes('article') ||
    /<article\b/i.test(html) ||
    bodyText.length > 600

  const kind: GrabbedUrlKind =
    fallback.domain === 'github.com' || fallback.domain === 'gitlab.com'
      ? 'repository'
      : isArticle
        ? 'article'
        : 'website'

  return {
    url,
    domain: fallback.domain,
    kind,
    title,
    siteName,
    author: author || undefined,
    description: truncateText(description, 600),
    bodyText: truncateText(bodyText, MAX_BODY_CHARS),
    chapters: [],
    keywords,
    fetched: Boolean(ogTitle || titleTag || description || bodyText),
  }
}

async function grabYouTubeContent(url: string, videoId: string): Promise<GrabbedUrlContent> {
  const fallback = buildFallbackUrlMetadata(url, 'youtube')
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`

  const [oembedJson, watchHtml] = await Promise.all([
    fetchTextWithTimeout(oembedUrl),
    fetchTextWithTimeout(watchUrl),
  ])

  let title = fallback.title
  let author: string | undefined

  if (oembedJson) {
    try {
      const parsed = JSON.parse(oembedJson) as { title?: string; author_name?: string }
      if (parsed.title?.trim()) title = parsed.title.trim()
      if (parsed.author_name?.trim()) author = parsed.author_name.trim()
    } catch {
      // Ignore invalid oEmbed JSON
    }
  }

  let description = ''
  let duration: string | undefined
  let keywords: string[] = ['youtube', 'video']
  let captionUrl: string | null = null

  if (watchHtml) {
    const playerData = extractYouTubePlayerResponse(watchHtml)
    if (playerData) {
      if (playerData.title) title = playerData.title
      if (playerData.author) author = playerData.author
      if (playerData.shortDescription) description = playerData.shortDescription
      if (playerData.lengthSeconds) duration = formatDurationSeconds(playerData.lengthSeconds)
      if (playerData.keywords.length > 0) {
        keywords = Array.from(new Set(['youtube', 'video', ...playerData.keywords]))
      }
      captionUrl = playerData.captionUrl
    } else {
      const ogTitle = extractMetaContent(watchHtml, ['og:title', 'title'])
      const ogDesc = extractMetaContent(watchHtml, ['og:description', 'description'])
      if (ogTitle) title = cleanPageTitle(ogTitle)
      if (ogDesc) description = ogDesc
    }
  }

  let transcript: string | undefined
  if (captionUrl) {
    const captionXml = await fetchTextWithTimeout(captionUrl)
    if (captionXml) {
      const parsedTranscript = parseYouTubeCaptionXml(captionXml)
      if (parsedTranscript) {
        transcript = truncateText(parsedTranscript, MAX_BODY_CHARS)
      }
    }
  }

  const chapters = extractChaptersFromDescription(description)
  const bodyParts = [
    description ? truncateText(description, 1_800) : '',
    transcript ? `Transkript-Auszug:\n${transcript}` : '',
  ].filter(Boolean)

  return {
    url,
    domain: 'youtube.com',
    kind: 'youtube',
    title: title || `YouTube Video (${videoId})`,
    siteName: 'YouTube',
    author,
    duration,
    description: truncateText(description, 800),
    bodyText: truncateText(bodyParts.join('\n\n'), MAX_BODY_CHARS),
    transcript,
    chapters,
    keywords: keywords.slice(0, 8),
    fetched: Boolean(oembedJson || watchHtml),
  }
}

type YouTubePlayerExtract = {
  title?: string
  author?: string
  shortDescription?: string
  lengthSeconds?: number
  keywords: string[]
  captionUrl: string | null
}

export function extractYouTubePlayerResponse(html: string): YouTubePlayerExtract | null {
  const marker = 'ytInitialPlayerResponse'
  const markerIdx = html.indexOf(marker)
  if (markerIdx < 0) return null

  const braceStart = html.indexOf('{', markerIdx)
  if (braceStart < 0) return null

  const jsonSlice = extractBalancedJsonObject(html, braceStart)
  if (!jsonSlice) return null

  try {
    const data = JSON.parse(jsonSlice) as {
      videoDetails?: {
        title?: string
        author?: string
        shortDescription?: string
        lengthSeconds?: string
        keywords?: string[]
      }
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{
            baseUrl?: string
            languageCode?: string
          }>
        }
      }
    }

    const details = data.videoDetails
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
    const preferredTrack =
      tracks.find((t) => t.languageCode?.startsWith('de')) ??
      tracks.find((t) => t.languageCode?.startsWith('en')) ??
      tracks[0]

    const rawKeywords = (details?.keywords ?? [])
      .map((k) => k.trim().toLowerCase().replace(/[^a-z0-9äöüß-]/gi, ''))
      .filter((k) => k.length >= 3 && k.length <= 24)

    return {
      title: details?.title?.trim(),
      author: details?.author?.trim(),
      shortDescription: details?.shortDescription?.trim(),
      lengthSeconds: details?.lengthSeconds ? Number(details.lengthSeconds) : undefined,
      keywords: rawKeywords.slice(0, 6),
      captionUrl: preferredTrack?.baseUrl ?? null,
    }
  } catch {
    return null
  }
}

function extractBalancedJsonObject(source: string, startIndex: number): string | null {
  let depth = 0
  let inString = false
  let escaped = false
  const maxEnd = Math.min(source.length, startIndex + 500_000)

  for (let i = startIndex; i < maxEnd; i++) {
    const ch = source[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (ch === '\\' && inString) {
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(startIndex, i + 1)
      }
    }
  }
  return null
}

export function parseYouTubeCaptionXml(xml: string): string {
  const segments: string[] = []
  const textRegex = /<text\b[^>]*>([\s\S]*?)<\/text>/gi
  let match = textRegex.exec(xml)
  while (match) {
    const decoded = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
    if (decoded) segments.push(decoded)
    match = textRegex.exec(xml)
  }
  return segments.join(' ')
}

export function extractChaptersFromDescription(description: string): GrabbedUrlChapter[] {
  if (!description) return []
  const chapters: GrabbedUrlChapter[] = []
  const lines = description.split(/\r?\n/)
  const chapterPattern = /^(?:[-*•]\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(?:[-–—|:]\s*)?(.{2,90})$/

  for (const rawLine of lines) {
    const match = rawLine.trim().match(chapterPattern)
    if (match) {
      chapters.push({
        timestamp: match[1],
        title: match[2].trim(),
      })
    }
    if (chapters.length >= 15) break
  }
  return chapters
}

export function extractReadableBodyFromHtml(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|canvas|iframe|form|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ')

  const articleMatch =
    stripped.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ??
    stripped.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ??
    stripped.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)

  const targetHtml = articleMatch ? articleMatch[1] : stripped

  const formatted = targetHtml
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, '\n### $1\n')
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, '\n### $1\n')
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, '\n#### $1\n')
    .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1\n')
    .replace(/<(?:p|div|section|blockquote|br|tr)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')

  const lines = decodeHtmlEntities(formatted)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => {
      if (!line) return false
      if (line.startsWith('###') || line.startsWith('- ')) return line.length > 4
      return line.length >= 25
    })

  const deduplicated: string[] = []
  for (const line of lines) {
    if (deduplicated[deduplicated.length - 1] !== line) {
      deduplicated.push(line)
    }
  }

  return deduplicated.join('\n\n')
}

function extractMetaContent(html: string, names: string[]): string | null {
  const metaTagRegex = /<meta\b[^>]+>/gi
  let match = metaTagRegex.exec(html)
  while (match) {
    const tag = match[0]
    const propMatch =
      tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? ''
    if (names.some((target) => target.toLowerCase() === propMatch)) {
      const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]
      if (content?.trim()) {
        return decodeHtmlEntities(content.trim())
      }
    }
    match = metaTagRegex.exec(html)
  }
  return null
}

function extractTagText(html: string, tagName: 'title' | 'h1' | 'article' | 'p'): string | null {
  const lowerHtml = html.toLowerCase()
  const openTag = `<${tagName}`
  const openIndex = lowerHtml.indexOf(openTag)
  if (openIndex === -1) return null

  const afterOpenTag = lowerHtml.indexOf('>', openIndex)
  if (afterOpenTag === -1) return null

  const closeTag = `</${tagName}>`
  const closeIndex = lowerHtml.indexOf(closeTag, afterOpenTag)
  if (closeIndex === -1) return null

  const inner = html.slice(afterOpenTag + 1, closeIndex)
  return decodeHtmlEntities(inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

function cleanPageTitle(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/\s+(?:[-|–—•·]\s+[^-|–—•·]{2,35})$/, (suffix) => {
      return suffix.length < rawTitle.length * 0.45 ? '' : suffix
    })
    .replace(/\s*-\s*YouTube$/i, '')
    .trim()
  return cleaned || rawTitle.trim()
}

export function buildFallbackUrlMetadata(
  url: string,
  forcedKind?: GrabbedUrlKind,
): GrabbedUrlContent {
  const domain = extractDomain(url)
  let derivedTitle = domain
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean)
    const lastSegment = segments[segments.length - 1]
    if (lastSegment && lastSegment !== 'watch') {
      const humanized = decodeURIComponent(lastSegment)
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      if (humanized.length >= 3) {
        derivedTitle = humanized.charAt(0).toUpperCase() + humanized.slice(1)
      }
    }
  } catch {
    // Keep domain as fallback title
  }

  const domainTag = domain.split('.')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'web'
  const kind: GrabbedUrlKind =
    forcedKind ??
    (extractYouTubeVideoId(url)
      ? 'youtube'
      : domain === 'github.com' || domain === 'gitlab.com'
        ? 'repository'
        : 'website')

  return {
    url,
    domain,
    kind,
    title: derivedTitle,
    siteName: domain,
    description: '',
    bodyText: '',
    chapters: [],
    keywords: Array.from(new Set([domainTag, kind === 'youtube' ? 'video' : 'link'])).filter(Boolean),
    fetched: false,
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return 'web'
  }
}

function parseKeywordsList(rawKeywords: string | null, domain: string): string[] {
  const domainTag = domain.split('.')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? ''
  const items = (rawKeywords ?? '')
    .split(/[,;#]+/)
    .map((item) => item.trim().toLowerCase().replace(/[^a-z0-9äöüß-]/gi, ''))
    .filter((item) => item.length >= 3 && item.length <= 24)
  return Array.from(new Set([domainTag, ...items].filter((item) => item.length >= 3))).slice(0, 6)
}

function formatDurationSeconds(totalSeconds: number): string | undefined {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return undefined
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

function truncateText(value: string, maxChars: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxChars) return trimmed
  return `${trimmed.slice(0, maxChars).trimEnd()}…`
}

export function decodeHtmlEntities(input: string): string {
  const namedEntities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
    '&hellip;': '…',
    '&auml;': 'ä',
    '&ouml;': 'ö',
    '&uuml;': 'ü',
    '&Auml;': 'Ä',
    '&Ouml;': 'Ö',
    '&Uuml;': 'Ü',
    '&szlig;': 'ß',
  }

  return input
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number(dec)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m
    })
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|ndash|mdash|hellip|[aouAOU]uml|szlig);/g, (entity) => {
      return namedEntities[entity] ?? entity
    })
}

async function fetchTextWithTimeout(url: string): Promise<string | null> {
  if (typeof fetch !== 'function') return null
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'User-Agent': BROWSER_USER_AGENT,
      },
      signal: controller?.signal,
    })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  } finally {
    if (timer) clearTimeout(timer)
  }
}
