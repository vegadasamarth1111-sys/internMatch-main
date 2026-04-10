import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import GMAIL_USER, GMAIL_PASS, OTP_EXPIRY_SECONDS

logger = logging.getLogger(__name__)


def send_otp_email(to_email: str, otp: str, purpose: str = "verify") -> None:
    """
    Send an OTP email via Resend.
    Raises Exception on failure - callers should handle it.
    """
    if purpose == "reset":
        subject = "Reset your InternMatch password"
        body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1d4ed8;">Reset your password</h2>
            <p>Use the code below to reset your InternMatch password.
            It expires in <strong>{OTP_EXPIRY_SECONDS//60} minutes</strong>.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                        color: #1d4ed8; padding: 24px; background: #eff6ff;
                        border-radius: 8px; text-align: center; margin: 24px 0;">
                {otp}
            </div>
            <p style="color: #6b7280; font-size: 14px;">
                If you didn't request a password reset, ignore this email.
            </p>
        </div>
        """
    else:
        subject = "Verify your InternMatch account"
        body = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #1d4ed8;">Verify your email</h2>
            <p>Use the code below to complete your InternMatch registration.
            It expires in <strong>{OTP_EXPIRY_SECONDS//60} minutes</strong>.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                        color: #1d4ed8; padding: 24px; background: #eff6ff;
                        border-radius: 8px; text-align: center; margin: 24px 0;">
                {otp}
            </div>
            <p style="color: #6b7280; font-size: 14px;">
                If you didn't create an account, ignore this email.
            </p>
        </div>
        """
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))
    
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_PASS)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        logger.info("OTP email sent to %s", to_email)
        """response = resend.Emails.send({
            "from": FROM_EMAIL,
            "to": to_email,
            "subject": subject,
            "html": body,
        })
        logger.info("OTP email sent to %s, resend id: %s", to_email, response.get("id"))"""
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", to_email, str(e))
        raise