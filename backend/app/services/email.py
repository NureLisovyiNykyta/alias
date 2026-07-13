from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings
from app.core.messages import EmailContent

_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    TEMPLATE_FOLDER=Path(__file__).parent.parent / "templates" / "email",
)

_fm = FastMail(_conf)


async def send_code_email(email_to: str, code: str, template: EmailContent) -> None:
    message = MessageSchema(
        subject=template.subject,
        recipients=[email_to],
        template_body={"code": code, "title": template.title, "description": template.description},
        subtype=MessageType.html,
    )
    await _fm.send_message(message, template_name="code_email.html")
