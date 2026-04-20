import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import GMAIL_USER, GMAIL_PASS, OTP_EXPIRY_SECONDS

logger = logging.getLogger(__name__)


def _send_email(to_email: str, subject: str, body: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_USER
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_USER, GMAIL_PASS)
        server.sendmail(GMAIL_USER, to_email, msg.as_string())


def send_status_change_email(
    to_email: str,
    applicant_name: str,
    internship_title: str,
    company_name: str,
    new_status: str,
) -> None:
    """Email the applicant when a recruiter changes their application status."""
    status_config = {
        "accepted": {
            "color": "#16a34a",
            "bg": "#f0fdf4",
            "icon": "🎉",
            "headline": "Congratulations! Your application was accepted",
            "message": (
                f"Great news, {applicant_name}! <strong>{company_name}</strong> has accepted your "
                f"application for <strong>{internship_title}</strong>. "
                "They will be in touch with the next steps soon."
            ),
        },
        "rejected": {
            "color": "#dc2626",
            "bg": "#fef2f2",
            "icon": "📋",
            "headline": "Application status update",
            "message": (
                f"Hi {applicant_name}, after reviewing your application for "
                f"<strong>{internship_title}</strong> at <strong>{company_name}</strong>, "
                "they have decided to move forward with other candidates. "
                "Keep applying — the right opportunity is out there!"
            ),
        },
    }
    cfg = status_config.get(new_status)
    if not cfg:
        return

    subject = f"InternMatch — Application {new_status.capitalize()}: {internship_title}"
    body = f"""
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1d4ed8; margin-bottom: 4px;">InternMatch</h2>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;">
      <div style="background:{cfg['bg']}; border-radius:8px; padding:24px; text-align:center; margin-bottom:24px;">
        <div style="font-size:48px;">{cfg['icon']}</div>
        <h3 style="color:{cfg['color']}; margin:12px 0;">{cfg['headline']}</h3>
      </div>
      <p style="color:#374151; line-height:1.6;">{cfg['message']}</p>
      <a href="http://localhost:5173/dashboard/student"
         style="display:inline-block; margin-top:20px; padding:12px 24px;
                background:#1d4ed8; color:white; border-radius:6px; text-decoration:none;">
        View My Applications
      </a>
      <p style="color:#9ca3af; font-size:12px; margin-top:32px;">
        You received this email because you applied via InternMatch.
      </p>
    </div>
    """
    try:
        _send_email(to_email, subject, body)
        logger.info("Status-change email (%s) sent to %s", new_status, to_email)
    except Exception as e:
        logger.error("Failed to send status-change email to %s: %s", to_email, str(e))

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
        
    try:
        _send_email(to_email, subject, body)
        logger.info("OTP email sent to %s", to_email)
    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", to_email, str(e))
        raise