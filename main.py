import os
from dotenv import load_dotenv
from linkedin_bot import run

load_dotenv()

if __name__ == "__main__":
    run(
        email=os.environ["LINKEDIN_EMAIL"],
        password=os.environ["LINKEDIN_PASSWORD"],
        keywords=os.environ.get("JOB_KEYWORDS", "Python Developer"),
        location=os.environ.get("JOB_LOCATION", "Italia"),
        remote=os.environ.get("JOB_REMOTE", "true").lower() == "true",
        max_applications=int(os.environ.get("MAX_APPLICATIONS_PER_RUN", "15")),
        delay_min=float(os.environ.get("DELAY_MIN", "2")),
        delay_max=float(os.environ.get("DELAY_MAX", "6")),
        headless=False,  # True = browser invisibile (sconsigliato: più rischio ban)
    )
