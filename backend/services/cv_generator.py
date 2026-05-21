"""CV and cover letter generation via Claude API."""
import json

import anthropic

from ..config import settings

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _profile_to_text(profile) -> str:
    lines = [
        f"Nome: {profile.name}",
        f"Email: {profile.email}",
    ]
    if profile.phone:
        lines.append(f"Telefono: {profile.phone}")
    if profile.location:
        lines.append(f"Luogo: {profile.location}")
    if profile.linkedin_url:
        lines.append(f"LinkedIn: {profile.linkedin_url}")
    if profile.summary:
        lines.append(f"\nSommario professionale:\n{profile.summary}")
    if profile.skills:
        lines.append(f"\nCompetenze: {', '.join(profile.skills)}")
    if profile.experience:
        lines.append("\nEsperienze lavorative:")
        for exp in profile.experience:
            lines.append(
                f"  - {exp.get('title', '')} @ {exp.get('company', '')} "
                f"({exp.get('start', '')} – {exp.get('end', 'presente')}): "
                f"{exp.get('description', '')}"
            )
    if profile.education:
        lines.append("\nFormazione:")
        for edu in profile.education:
            lines.append(
                f"  - {edu.get('degree', '')} in {edu.get('field', '')} @ "
                f"{edu.get('institution', '')} ({edu.get('year', '')})"
            )
    if profile.languages:
        lines.append("\nLingue:")
        for lang in profile.languages:
            lines.append(f"  - {lang.get('language', '')}: {lang.get('level', '')}")
    if profile.certifications:
        lines.append("\nCertificazioni:")
        for cert in profile.certifications:
            lines.append(f"  - {cert.get('name', '')} ({cert.get('issuer', '')} {cert.get('year', '')})")
    return "\n".join(lines)


def score_job_against_profile(job, profile) -> dict:
    client = _get_client()
    profile_text = _profile_to_text(profile)

    prompt = f"""Analizza la compatibilità tra questo candidato e questa offerta di lavoro.

PROFILO CANDIDATO:
{profile_text}

OFFERTA DI LAVORO:
Titolo: {job.title}
Azienda: {job.company}
Luogo: {job.location}
Descrizione:
{job.description[:2000]}

Rispondi SOLO con un JSON valido in questo formato (nessun testo aggiuntivo):
{{
  "match_score": <numero 0-100>,
  "match_reason": "<spiegazione breve in italiano di 1-2 frasi>"
}}"""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    # Extract JSON even if there's surrounding text
    start = text.find("{")
    end = text.rfind("}") + 1
    data = json.loads(text[start:end])
    return {
        "match_score": float(data["match_score"]),
        "match_reason": data["match_reason"],
    }


_CV_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #222; background: #fff; padding: 2cm; max-width: 21cm; margin: 0 auto; }}
  h1 {{ font-size: 22pt; color: #1e3a8a; margin-bottom: 2px; }}
  .subtitle {{ color: #64748b; font-size: 10pt; margin-bottom: 12px; }}
  .contact {{ color: #334155; font-size: 9.5pt; margin-bottom: 20px; }}
  .contact span {{ margin-right: 16px; }}
  h2 {{ font-size: 12pt; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 3px; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }}
  .summary {{ line-height: 1.6; margin-bottom: 8px; }}
  .entry {{ margin-bottom: 12px; }}
  .entry-header {{ display: flex; justify-content: space-between; align-items: baseline; }}
  .entry-title {{ font-weight: 600; color: #1e293b; }}
  .entry-org {{ color: #475569; }}
  .entry-date {{ color: #64748b; font-size: 9.5pt; white-space: nowrap; }}
  .entry-body {{ margin-top: 4px; line-height: 1.5; color: #334155; }}
  .skills {{ display: flex; flex-wrap: wrap; gap: 6px; }}
  .skill {{ background: #eff6ff; color: #1e40af; padding: 2px 10px; border-radius: 12px; font-size: 9.5pt; }}
  .lang-table {{ width: 100%; border-collapse: collapse; }}
  .lang-table td {{ padding: 3px 8px; font-size: 10pt; }}
  .lang-table td:first-child {{ font-weight: 600; width: 40%; }}
  @media print {{ body {{ padding: 1cm; }} }}
</style>
</head>
<body>
{body}
</body>
</html>"""


def generate_cv_and_letter(job, profile) -> dict:
    client = _get_client()
    profile_text = _profile_to_text(profile)

    # --- Score ---
    try:
        scored = score_job_against_profile(job, profile)
    except Exception:
        scored = {"match_score": 75.0, "match_reason": "Profilo adatto all'offerta."}

    # --- CV ---
    cv_prompt = f"""Sei un esperto HR italiano. Genera il BODY di un CV professionale in HTML per questa persona,
personalizzato per l'offerta di lavoro specificata. Enfatizza le competenze e le esperienze più rilevanti per questa offerta.

PROFILO:
{profile_text}

OFFERTA:
Titolo: {job.title} @ {job.company}
{job.description[:2000]}

Genera SOLO il contenuto HTML da inserire dentro <body> (no tag html/head/body).
Usa queste classi CSS già definite: h1, .subtitle, .contact, h2, .entry, .entry-header, .entry-title, .entry-org, .entry-date, .entry-body, .skills, .skill, .lang-table.
Includi: nome/contatti, sommario professionale (riadattato per questa offerta), esperienze, formazione, competenze, lingue.
Testo in italiano. Solo HTML, nessun testo aggiuntivo."""

    cv_msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": cv_prompt}],
    )
    cv_body = cv_msg.content[0].text.strip()
    cv_html = _CV_HTML_TEMPLATE.format(body=cv_body)

    # --- Cover letter ---
    letter_prompt = f"""Scrivi una lettera di presentazione professionale in italiano per questa candidatura.

CANDIDATO: {profile.name}
OFFERTA: {job.title} @ {job.company} ({job.location})
DESCRIZIONE OFFERTA (estratto): {job.description[:1500]}
PROFILO: {profile_text}

La lettera deve:
- Essere di massimo 3 paragrafi (circa 200 parole)
- Essere diretta e convincente
- Evidenziare la compatibilità specifica con questa offerta
- Avere un tono professionale ma personale
- Iniziare con "Gentili Responsabili," e terminare con "Cordiali saluti,"
Scrivi SOLO la lettera, nessuna istruzione aggiuntiva."""

    letter_msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": letter_prompt}],
    )
    cover_letter = letter_msg.content[0].text.strip()

    return {
        "cv_html": cv_html,
        "cover_letter": cover_letter,
        "match_score": scored["match_score"],
        "match_reason": scored["match_reason"],
    }
