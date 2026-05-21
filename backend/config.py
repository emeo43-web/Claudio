from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    linkedin_email: str = ""
    linkedin_password: str = ""
    adecco_email: str = ""
    adecco_password: str = ""
    randstad_email: str = ""
    randstad_password: str = ""
    database_url: str = "sqlite:///./claudio.db"
    scrape_interval_hours: int = 6
    delay_min: float = 2.0
    delay_max: float = 5.0
    headless: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
