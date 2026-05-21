import hashlib

from .base import BaseScraper


class RandstadScraper(BaseScraper):
    BASE_URL = "https://www.randstad.it/offerte-di-lavoro/"

    def search(self, keywords: str, location: str, remote_only: bool) -> list[dict]:
        page = self._start()
        jobs = []
        try:
            url = f"{self.BASE_URL}?query={keywords.replace(' ', '+')}"
            if location and location.lower() != "italia":
                url += f"&city={location.replace(' ', '+')}"
            if remote_only:
                url += "&workMode=remote"

            page.goto(url)
            page.wait_for_load_state("domcontentloaded", timeout=15000)
            self._delay()

            # Accept cookies
            try:
                page.click("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll", timeout=3000)
                self._delay(0.5, 1.0)
            except Exception:
                pass

            self._scroll(page, 5)
            self._delay(1.0, 2.0)

            cards = page.query_selector_all(
                "[class*='job-card'], article, [class*='jobCard'], [class*='offer-card']"
            )

            for card in cards[:30]:
                try:
                    title_el = card.query_selector("h2, h3, [class*='title'], [class*='Title']")
                    company_el = card.query_selector("[class*='company'], [class*='Company']")
                    loc_el = card.query_selector("[class*='location'], [class*='city'], [class*='place']")
                    link_el = card.query_selector("a[href]")

                    title = title_el.inner_text().strip() if title_el else ""
                    company = company_el.inner_text().strip() if company_el else "Randstad"
                    loc = loc_el.inner_text().strip() if loc_el else location

                    if not title:
                        continue

                    href = link_el.get_attribute("href") if link_el else ""
                    job_url = href if href.startswith("http") else f"https://www.randstad.it{href}"
                    external_id = hashlib.md5(job_url.encode()).hexdigest()[:16]

                    description = ""
                    if job_url and job_url != "https://www.randstad.it":
                        try:
                            page.goto(job_url)
                            page.wait_for_load_state("domcontentloaded", timeout=10000)
                            self._delay(1.0, 2.0)
                            desc_el = page.query_selector(
                                "[class*='description'], [class*='content'], [class*='detail'], main"
                            )
                            if desc_el:
                                description = desc_el.inner_text().strip()[:3000]
                            page.go_back()
                            self._delay(0.8, 1.5)
                        except Exception:
                            pass

                    jobs.append({
                        "source": "randstad",
                        "external_id": external_id,
                        "title": title,
                        "company": company,
                        "location": loc,
                        "description": description,
                        "url": job_url,
                        "remote": remote_only or "remoto" in loc.lower() or "smart" in loc.lower(),
                    })
                except Exception:
                    continue
        finally:
            self._stop()
        return jobs
