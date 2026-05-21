import random
import time
from abc import ABC, abstractmethod

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

from ..config import settings


class BaseScraper(ABC):
    def __init__(self):
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None

    def _start(self) -> Page:
        self._playwright = sync_playwright().start()
        self._browser = self._playwright.chromium.launch(
            headless=settings.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        self._context = self._browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 768},
            locale="it-IT",
        )
        self._context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        return self._context.new_page()

    def _stop(self):
        if self._browser:
            self._browser.close()
        if self._playwright:
            self._playwright.stop()

    def _delay(self, min_s: float | None = None, max_s: float | None = None):
        lo = min_s if min_s is not None else settings.delay_min
        hi = max_s if max_s is not None else settings.delay_max
        time.sleep(random.uniform(lo, hi))

    def _scroll(self, page: Page, times: int = 3):
        for _ in range(times):
            page.mouse.wheel(0, random.randint(400, 700))
            self._delay(0.4, 0.9)

    @abstractmethod
    def search(self, keywords: str, location: str, remote_only: bool) -> list[dict]:
        """Return a list of job dicts with keys matching the Job model."""
