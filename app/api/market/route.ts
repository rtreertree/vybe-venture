const MARKET_SYMBOLS = [
  'ACWI', '^GSPC', '^STOXX50E', '^N225',
  'XLK', 'XLF', 'XLV', 'XLY', 'XLI', 'XLC', 'XLP', 'XLE', 'XLU', 'XLRE', 'XLB',
  'NVDA', 'TSLA', 'PLTR', 'AMD', 'NKE', 'INTC', 'BA', 'CVS', 'AAPL',
] as const;
const SHORT_HISTORY_SYMBOLS = new Set([
  'NVDA', 'TSLA', 'PLTR', 'AMD', 'NKE', 'INTC', 'BA', 'CVS', 'AAPL',
]);
const NEWS_IMAGE_HOSTS = new Set(['s.yimg.com', 'media.zenfs.com']);

type YahooChartResponse = {
  chart?: {
    error?: { description?: string } | null;
    result?: Array<{
      meta?: { longName?: string; regularMarketPrice?: number; regularMarketTime?: number };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null>; volume?: Array<number | null> }> };
    } | null> | null;
  };
};

async function fetchYahooChart(symbol: string) {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set('range', SHORT_HISTORY_SYMBOLS.has(symbol) ? '5d' : '1y');
  url.searchParams.set('interval', '1d');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Origin: 'https://finance.yahoo.com',
          'User-Agent': 'Mozilla/5.0',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) continue;

      const payload = await response.json() as YahooChartResponse;
      const result = payload.chart?.result?.[0];
      const quote = result?.indicators?.quote?.[0];
      if (!result?.timestamp || !quote?.close) continue;

      return {
        symbol,
        name: result.meta?.longName ?? null,
        regularMarketPrice: result.meta?.regularMarketPrice ?? null,
        regularMarketTime: result.meta?.regularMarketTime ?? null,
        timestamps: result.timestamp,
        closes: quote.close,
        volumes: quote.volume ?? [],
      };
    } catch {
      // The unofficial feed occasionally rejects requests; the second attempt is best-effort.
    }
  }

  return null;
}

async function fetchMarketNews() {
  try {
    const url = new URL('https://query1.finance.yahoo.com/v1/finance/search');
    url.searchParams.set('q', 'stock market');
    url.searchParams.set('newsCount', '8');
    url.searchParams.set('quotesCount', '0');
    const response = await fetch(url, {
      headers: { Accept: 'application/json', Origin: 'https://finance.yahoo.com', 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];

    const payload: {
      news?: Array<{
        title?: string;
        publisher?: string;
        link?: string;
        providerPublishTime?: number;
        thumbnail?: { resolutions?: Array<{ url?: string; tag?: string }> };
      }>;
    } = await response.json();
    return (payload.news ?? []).filter((item) => item.title && item.link).slice(0, 8).map((item) => ({
      title: item.title!,
      publisher: item.publisher ?? 'Yahoo Finance',
      link: item.link!,
      publishedAt: item.providerPublishTime ?? null,
      image: item.thumbnail?.resolutions?.find((resolution) => resolution.tag === '140x140')?.url
        ?? item.thumbnail?.resolutions?.[0]?.url
        ?? null,
    }));
  } catch {
    return [];
  }
}

async function serveNewsImage(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return new Response('Invalid image URL', { status: 400 });
  }

  if (url.protocol !== 'https:' || !NEWS_IMAGE_HOSTS.has(url.hostname)) {
    return new Response('Image host not allowed', { status: 403 });
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'image/*', 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      return new Response('Image unavailable', { status: 502 });
    }

    const image = await upstream.arrayBuffer();
    if (image.byteLength > 2_000_000) return new Response('Image too large', { status: 413 });

    return new Response(image, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Image unavailable', { status: 502 });
  }
}

export async function GET(request: Request) {
  const imageUrl = new URL(request.url).searchParams.get('image');
  if (imageUrl) return serveNewsImage(imageUrl);

  const symbols: Record<string, Awaited<ReturnType<typeof fetchYahooChart>>> = {};
  let nextIndex = 0;
  const workers = Array.from({ length: 8 }, async () => {
    while (nextIndex < MARKET_SYMBOLS.length) {
      const symbol = MARKET_SYMBOLS[nextIndex++];
      symbols[symbol] = await fetchYahooChart(symbol);
    }
  });

  const [ , news ] = await Promise.all([Promise.all(workers), fetchMarketNews()]);
  return Response.json({ symbols, news }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  });
}