import html
import re
import urllib.request

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


ACCUWEATHER_URL = "https://www.accuweather.com/en/ph/cubacub/776048/weather-forecast/776048?type=locality&city=cubacub"
CACHE_KEY = "public_weather_cubacub_accuweather"


def _page_text(raw_html: str) -> str:
    text = re.sub(r"<script[\s\S]*?</script>", " ", raw_html, flags=re.IGNORECASE)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "\n", text)
    text = html.unescape(text)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def _extract_weather(text: str) -> dict:
    temp_match = re.search(r"Cubacub,?\s+Cebu\s+(\d+)\s*°\s*C", text, re.IGNORECASE)
    if not temp_match:
        temp_match = re.search(r"Cubacub\s+Cebu\s+(\d+)\s*°", text, re.IGNORECASE)

    daily_match = re.search(
        r"(?:Today|Thu|Fri|Sat|Sun|Mon|Tue|Wed)\s+\d{1,2}/\d{1,2}\s+"
        r"(\d+)\s*°\s*/\s*(\d+)\s*°\s+(\d+)%\s*\n([^\n]+)",
        text,
        re.IGNORECASE,
    )

    return {
        "location": "Cubacub, Cebu",
        "temperature": int(temp_match.group(1)) if temp_match else None,
        "condition": daily_match.group(4).strip() if daily_match else "View forecast",
        "high": int(daily_match.group(1)) if daily_match else None,
        "low": int(daily_match.group(2)) if daily_match else None,
        "precipitation": int(daily_match.group(3)) if daily_match else None,
        "source": "AccuWeather",
        "source_url": ACCUWEATHER_URL,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def public_weather(request):
    cached = cache.get(CACHE_KEY)
    if cached:
        return Response(cached)

    try:
        request_obj = urllib.request.Request(
            ACCUWEATHER_URL,
            headers={
                "User-Agent": "Mozilla/5.0 (compatible; BarangayPortal/1.0)",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        with urllib.request.urlopen(request_obj, timeout=8) as response:
            raw_html = response.read().decode("utf-8", errors="ignore")
    except Exception as exc:
        return Response(
            {"detail": "Unable to fetch AccuWeather forecast.", "error": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    weather = _extract_weather(_page_text(raw_html))
    if weather["temperature"] is None:
        return Response(
            {"detail": "Unable to parse AccuWeather forecast."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    cache.set(CACHE_KEY, weather, 10 * 60)
    return Response(weather)
