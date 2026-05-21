import json
import os
import random
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

APPLIED_JOBS_FILE = Path("applied_jobs.json")


def load_applied_jobs() -> set[str]:
    if APPLIED_JOBS_FILE.exists():
        with open(APPLIED_JOBS_FILE) as f:
            return set(json.load(f))
    return set()


def save_applied_jobs(job_ids: set[str]) -> None:
    with open(APPLIED_JOBS_FILE, "w") as f:
        json.dump(list(job_ids), f, indent=2)


def human_delay(min_s: float, max_s: float) -> None:
    time.sleep(random.uniform(min_s, max_s))


def human_type(page: Page, selector: str, text: str) -> None:
    """Digita carattere per carattere simulando la velocità umana."""
    page.click(selector)
    page.fill(selector, "")
    for char in text:
        page.type(selector, char, delay=random.randint(50, 150))


def login(page: Page, email: str, password: str) -> bool:
    page.goto("https://www.linkedin.com/login")
    human_delay(1.5, 3.0)

    human_type(page, "#username", email)
    human_delay(0.5, 1.2)
    human_type(page, "#password", password)
    human_delay(0.5, 1.0)

    page.click('[type="submit"]')
    page.wait_for_load_state("networkidle", timeout=15000)

    if "checkpoint" in page.url or "challenge" in page.url:
        print("[!] LinkedIn ha richiesto verifica identità. Completa manualmente.")
        input("    Premi INVIO quando hai completato la verifica...")
        page.wait_for_load_state("networkidle", timeout=30000)

    if "feed" in page.url or "mynetwork" in page.url:
        print("[+] Login effettuato.")
        return True

    print(f"[-] Login fallito. URL attuale: {page.url}")
    return False


def build_search_url(keywords: str, location: str, remote: bool) -> str:
    base = "https://www.linkedin.com/jobs/search/"
    params = f"?keywords={keywords.replace(' ', '%20')}&location={location.replace(' ', '%20')}&f_AL=true"
    if remote:
        params += "&f_WT=2"
    return base + params


def get_job_ids_on_page(page: Page) -> list[str]:
    """Raccoglie gli ID delle offerte visibili nella lista."""
    job_cards = page.query_selector_all("[data-job-id]")
    ids = []
    for card in job_cards:
        job_id = card.get_attribute("data-job-id")
        if job_id:
            ids.append(job_id)
    return ids


def apply_to_job(page: Page, job_id: str, delay_min: float, delay_max: float) -> bool:
    """
    Prova ad applicare a un'offerta Easy Apply.
    Ritorna True se la candidatura è stata inviata con successo.
    """
    job_url = f"https://www.linkedin.com/jobs/view/{job_id}/"
    page.goto(job_url)
    page.wait_for_load_state("domcontentloaded", timeout=15000)
    human_delay(delay_min, delay_max)

    easy_apply_btn = page.query_selector("button.jobs-apply-button")
    if not easy_apply_btn:
        return False

    btn_text = easy_apply_btn.inner_text().strip().lower()
    if "easy apply" not in btn_text and "candidatura rapida" not in btn_text:
        return False

    easy_apply_btn.click()
    human_delay(1.5, 2.5)

    for step in range(5):
        submit_btn = page.query_selector(
            "button[aria-label='Invia candidatura'], button[aria-label='Submit application']"
        )
        if submit_btn:
            submit_btn.click()
            human_delay(1.0, 2.0)
            print(f"  [OK] Candidatura inviata: job {job_id}")
            dismiss = page.query_selector("button[aria-label='Ignora'], button[aria-label='Dismiss']")
            if dismiss:
                dismiss.click()
            return True

        next_btn = page.query_selector(
            "button[aria-label='Continua al passaggio successivo'], "
            "button[aria-label='Continue to next step'], "
            "button[aria-label='Review your application'], "
            "button[aria-label='Rivedi la candidatura']"
        )
        if not next_btn:
            break

        next_btn.click()
        human_delay(1.0, 2.0)

    generic_submit = page.query_selector("button[data-easy-apply-next-button]")
    if generic_submit and "invia" in generic_submit.inner_text().lower():
        generic_submit.click()
        human_delay(1.0, 2.0)
        return True

    close_btn = page.query_selector("button[aria-label='Ignora'], button[aria-label='Dismiss']")
    if close_btn:
        close_btn.click()
    return False


def run(
    email: str,
    password: str,
    keywords: str,
    location: str,
    remote: bool,
    max_applications: int,
    delay_min: float,
    delay_max: float,
    headless: bool = False,
) -> None:
    applied_jobs = load_applied_jobs()
    submitted = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        page = context.new_page()

        if not login(page, email, password):
            browser.close()
            return

        search_url = build_search_url(keywords, location, remote)
        print(f"[*] Ricerca offerte: {search_url}")

        page_num = 0
        while submitted < max_applications:
            paginated_url = search_url + f"&start={page_num * 25}"
            page.goto(paginated_url)
            page.wait_for_load_state("domcontentloaded", timeout=15000)
            human_delay(delay_min, delay_max)

            for _ in range(3):
                page.mouse.wheel(0, 500)
                human_delay(0.5, 1.0)

            job_ids = get_job_ids_on_page(page)
            if not job_ids:
                print("[*] Nessuna altra offerta trovata.")
                break

            print(f"[*] Pagina {page_num + 1}: trovate {len(job_ids)} offerte.")

            for job_id in job_ids:
                if submitted >= max_applications:
                    break
                if job_id in applied_jobs:
                    continue

                print(f"  -> Candidatura a job {job_id}...")
                success = apply_to_job(page, job_id, delay_min, delay_max)
                applied_jobs.add(job_id)

                if success:
                    submitted += 1
                    print(f"  [✓] Totale inviate: {submitted}/{max_applications}")
                else:
                    print(f"  [~] Saltata (non Easy Apply o form complesso).")

                save_applied_jobs(applied_jobs)
                human_delay(delay_min * 1.5, delay_max * 2)

            page_num += 1

        print(f"\n[DONE] Candidature inviate in questa sessione: {submitted}")
        browser.close()
