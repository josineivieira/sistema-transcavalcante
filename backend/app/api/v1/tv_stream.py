from urllib.parse import quote, unquote, urljoin

import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

router = APIRouter()

STREAM_URL = "https://1.tvlibre.pe/premiere2/mono.m3u8?token=1974db3b1caba098d00d05ad127056cbf7aadb6f-b4-1786327215-1786309215"
REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Accept": "*/*",
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
        response = httpx.get(STREAM_URL, headers=REQUEST_HEADERS, timeout=10.0, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Transmissao indisponivel") from exc

    playlist = _rewrite_playlist(response.text, str(response.url))
    return Response(
        playlist,
        media_type="application/vnd.apple.mpegurl",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/proxy")
def stream_proxy(url: str = Query(..., min_length=8)):
    target_url = unquote(url)
    if not target_url.startswith(("https://1.tvlibre.pe/", "http://1.tvlibre.pe/")):
        raise HTTPException(status_code=400, detail="Origem de transmissao invalida")

    try:
        response = httpx.get(target_url, headers=REQUEST_HEADERS, timeout=15.0, follow_redirects=True)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Trecho da transmissao indisponivel") from exc

    content_type = response.headers.get("content-type", "application/octet-stream")
    if "mpegurl" in content_type or target_url.endswith(".m3u8"):
        body = _rewrite_playlist(response.text, str(response.url)).encode("utf-8")
        content_type = "application/vnd.apple.mpegurl"
    else:
        body = response.content

    return Response(
        body,
        media_type=content_type,
        headers={"Cache-Control": "no-store"},
    )
