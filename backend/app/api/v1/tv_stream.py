from urllib.parse import quote, unquote, urljoin

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response, StreamingResponse

from app.core.config import settings

router = APIRouter()

DEFAULT_STREAM_URL = "https://1.tvlibre.pe/premiere2/mono.m3u8?token=1974db3b1caba098d00d05ad127056cbf7aadb6f-b4-1786327215-1786309215"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Connection": "keep-alive",
    "Origin": "https://1.tvlibre.pe",
    "Referer": "https://1.tvlibre.pe/",
}


def _stream_url() -> str:
    return settings.tv_corinthians_stream_url or DEFAULT_STREAM_URL


def _public_headers() -> dict[str, str]:
    return {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
    }


def _proxy_url(url: str) -> str:
    return f"/api/v1/tvcorinthians/proxy?url={quote(url, safe='')}"


def _rewrite_playlist(content: str, base_url: str) -> str:
    lines: list[str] = []
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line:
            lines.append(raw_line)
            continue

        if line.startswith("#"):
            if 'URI="' in line:
                prefix, rest = line.split('URI="', 1)
                uri, suffix = rest.split('"', 1)
                absolute_uri = urljoin(base_url, uri)
                lines.append(f'{prefix}URI="{_proxy_url(absolute_uri)}"{suffix}')
            else:
                lines.append(raw_line)
            continue

        lines.append(_proxy_url(urljoin(base_url, line)))

    return "\n".join(lines) + "\n"


@router.get("/stream.m3u8")
def stream_playlist():
    try:
        response = httpx.get(_stream_url(), headers=REQUEST_HEADERS, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Transmissao indisponivel") from exc

    playlist = _rewrite_playlist(response.text, str(response.url))
    return Response(
        playlist,
        media_type="application/vnd.apple.mpegurl",
        headers=_public_headers(),
    )


@router.get("/proxy")
def stream_proxy(url: str = Query(..., min_length=8)):
    target_url = unquote(url)
    if not target_url.startswith(("https://1.tvlibre.pe/", "http://1.tvlibre.pe/")):
        raise HTTPException(status_code=400, detail="Origem de transmissao invalida")

    client = httpx.Client(headers=REQUEST_HEADERS, timeout=20.0, follow_redirects=True)
    try:
        response = client.build_request("GET", target_url)
        upstream = client.send(response, stream=True)
        upstream.raise_for_status()
    except httpx.HTTPError as exc:
        client.close()
        raise HTTPException(status_code=502, detail="Trecho da transmissao indisponivel") from exc

    content_type = upstream.headers.get("content-type", "application/octet-stream")
    if "mpegurl" in content_type or target_url.endswith(".m3u8"):
        body = _rewrite_playlist(upstream.read().decode("utf-8", errors="ignore"), str(upstream.url))
        client.close()
        return Response(body, media_type="application/vnd.apple.mpegurl", headers=_public_headers())

    def body_iterator():
        try:
            yield from upstream.iter_bytes()
        finally:
            upstream.close()
            client.close()

    return StreamingResponse(body_iterator(), media_type=content_type, headers=_public_headers())
