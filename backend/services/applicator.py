"""Playwright-based job application submission for each source."""
import random
import time

from ..config import settings


def _human_delay(min_s=2.0, max_s=5.0):
    time.sleep(random.uniform(min_s, max_s))


def _apply_linkedin(page, job, profile, cv_html: str) -> bool:
    """Submit a LinkedIn Easy Apply application."""
    page.goto(job.url)
    page.wait_for_load_state("domcontentloaded", timeout=15000)
    _human_delay()

    btn = page.query_selector("button.jobs-apply-button")
    if not btn:
        return False
    btn_text = btn.inner_text().strip().lower()
    if "easy apply" not in btn_text and "candidatura rapida" not in btn_text:
        return False

    btn.click()
    _human_delay(1.5, 2.5)

    for _ in range(6):
        submit = page.query_selector(
            "button[aria-label='Invia candidatura'], button[aria-label='Submit application']"
        )
        if submit:
            submit.click()
            _human_delay(1.0, 2.0)
            dismiss = page.query_selector("button[aria-label='Ignora'], button[aria-label='Dismiss']")
            if dismiss:
                dismiss.click()
            return True

        nxt = page.query_selector(
            "button[aria-label='Continua al passaggio successivo'], "
            "button[aria-label='Continue to next step'], "
            "button[aria-label='Review your application'], "
            "button[aria-label='Rivedi la candidatura']"
        )
        if not nxt:
            break
        nxt.click()
        _human_delay(1.0, 2.0)

    return False


def _apply_adecco(page, job, profile) -> bool:
    """Fill and submit an Adecco application form."""
    page.goto(job.url)
    page.wait_for_load_state("domcontentloaded", timeout=15000)
    _human_delay()

    apply_btn = page.query_selector(
        "a[href*='candidat'], button:has-text('Candidati'), a:has-text('Candidati')"
    )
    if not apply_btn:
        return False
    apply_btn.click()
    page.wait_for_load_state("domcontentloaded", timeout=10000)
    _human_delay()

    # Fill basic fields if present
    for selector, value in [
        ("input[name='firstName'], input[placeholder*='Nome']", profile.name.split()[0] if profile.name else ""),
        ("input[name='lastName'], input[placeholder*='Cognome']", profile.name.split()[-1] if profile.name else ""),
        ("input[type='email'], input[name='email']", profile.email or ""),
        ("input[type='tel'], input[name='phone']", profile.phone or ""),
    ]:
        try:
            el = page.query_selector(selector)
            if el and value:
                el.fill(value)
                _human_delay(0.3, 0.7)
        except Exception:
            pass

    submit = page.query_selector("button[type='submit'], input[type='submit'], button:has-text('Invia')")
    if submit:
        submit.click()
        _human_delay(2.0, 4.0)
        return True
    return False


def _apply_randstad(page, job, profile) -> bool:
    """Fill and submit a Randstad application form."""
    page.goto(job.url)
    page.wait_for_load_state("domcontentloaded", timeout=15000)
    _human_delay()

    apply_btn = page.query_selector(
        "button:has-text('Candidati'), a:has-text('Candidati'), button:has-text('Invia')"
    )
    if not apply_btn:
        return False
    apply_btn.click()
    page.wait_for_load_state("domcontentloaded", timeout=10000)
    _human_delay()

    for selector, value in [
        ("input[name='name'], input[placeholder*='Nome']", profile.name or ""),
        ("input[type='email']", profile.email or ""),
        ("input[type='tel']", profile.phone or ""),
    ]:
        try:
            el = page.query_selector(selector)
            if el and value:
                el.fill(value)
                _human_delay(0.3, 0.7)
        except Exception:
            pass

    submit = page.query_selector("button[type='submit'], input[type='submit']")
    if submit:
        submit.click()
        _human_delay(2.0, 4.0)
        return True
    return False


def submit_application(job, profile, cv_html: str) -> bool:
    """Entry point called as a background task."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=settings.headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = context.new_page()

        # LinkedIn needs login first
        if job.source == "linkedin" and settings.linkedin_email:
            page.goto("https://www.linkedin.com/login")
            page.fill("#username", settings.linkedin_email)
            page.fill("#password", settings.linkedin_password)
            page.click('[type="submit"]')
            page.wait_for_load_state("networkidle", timeout=15000)

        try:
            if job.source == "linkedin":
                result = _apply_linkedin(page, job, profile, cv_html)
            elif job.source == "adecco":
                result = _apply_adecco(page, job, profile)
            elif job.source == "randstad":
                result = _apply_randstad(page, job, profile)
            else:
                result = False
        except Exception:
            result = False
        finally:
            browser.close()

    # Update application status in DB
    from ..database import SessionLocal
    from ..models import Application
    db = SessionLocal()
    try:
        app = db.query(Application).filter(Application.job_id == job.id).first()
        if app:
            app.status = "sent" if result else "failed"
            db.commit()
    finally:
        db.close()

    return result
