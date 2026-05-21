import json
import re

from .base import BaseScraper
from ..config import settings


class LinkedInScraper(BaseScraper):
    def _login(self, page):
        if not settings.linkedin_email or not settings.linkedin_password:
            return False
        page.goto("https://www.linkedin.com/login")
        self._delay(1.5, 3.0)
        page.fill("#username", settings.linkedin_email)
        self._delay(0.4, 0.9)
        page.fill("#password", settings.linkedin_password)
        self._delay(0.3, 0.7)
        page.click('[type="submit"]')
        page.wait_for_load_state("networkidle", timeout=15000)
        return "feed" in page.url or "mynetwork" in page.url

    def search(self, keywords: str, location: str, remote_only: bool) -> list[dict]:
        page = self._start()
        jobs = []
        try:
            logged_in = self._login(page)
            params = f"keywords={keywords.replace(' ', '%20')}&location={location.replace(' ', '%20')}&f_AL=true"
            if remote_only:
                params += "&f_WT=2"
            if not logged_in:
                base_url = f"https://www.linkedin.com/jobs/search/?{params}"
            else:
                base_url = f"https://www.linkedin.com/jobs/search/?{params}"

            page.goto(base_url)
            page.wait_for_load_state("domcontentloaded", timeout=15000)
            self._delay()
            self._scroll(page)

            cards = page.query_selector_all("[data-job-id]")
            for card in cards[:30]:
                job_id = card.get_attribute("data-job-id")
                if not job_id:
                    continue
                title_el = card.query_selector(".base-search-card__title, .job-card-list__title")
                company_el = card.query_selector(".base-search-card__subtitle, .job-card-container__primary-description")
                location_el = card.query_selector(".job-search-card__location, .job-card-container__metadata-item")
                title = title_el.inner_text().strip() if title_el else "N/A"
                company = company_el.inner_text().strip() if company_el else "N/A"
                loc = location_el.inner_text().strip() if location_el else location
                url = f"https://www.linkedin.com/jobs/view/{job_id}/"

                # Fetch description
                description = ""
                try:
                    page.goto(url)
                    page.wait_for_load_state("domcontentloaded", timeout=10000)
                    self._delay(1.0, 2.0)
                    desc_el = page.query_selector(".description__text, .show-more-less-html__markup")
                    if desc_el:
                        description = desc_el.inner_text().strip()[:3000]
                    page.go_back()
                    self._delay(0.8, 1.5)
                except Exception:
                    pass

                jobs.append({
                    "source": "linkedin",
                    "external_id": job_id,
                    "title": title,
                    "company": company,
                    "location": loc,
                    "description": description,
                    "url": url,
                    "remote": remote_only or "remote" in loc.lower() or "da casa" in loc.lower(),
                })
        finally:
            self._stop()
        return jobs
