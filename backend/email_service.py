"""
Servei d'enviament d'emails per El Tomb de Reus
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# Configuració SMTP
SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.ionos.es')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL', SMTP_USER)
SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME', 'El Tomb de Reus')


def send_email(to_email: str, subject: str, html_content: str, text_content: str = None) -> bool:
    """
    Envia un email utilitzant SMTP
    
    Args:
        to_email: Adreça de destí
        subject: Assumpte de l'email
        html_content: Contingut HTML de l'email
        text_content: Contingut en text pla (opcional)
    
    Returns:
        True si s'ha enviat correctament, False en cas contrari
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning(f"[EMAIL SIMULAT] To: {to_email}, Subject: {subject}")
        return True  # Simular èxit si no hi ha configuració
    
    try:
        # Crear missatge
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
        msg['To'] = to_email
        
        # Afegir versió text pla
        if text_content:
            part1 = MIMEText(text_content, 'plain', 'utf-8')
            msg.attach(part1)
        
        # Afegir versió HTML
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part2)
        
        # Connectar i enviar
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM_EMAIL, to_email, msg.as_string())
        
        logger.info(f"✅ Email enviat a {to_email}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error enviant email a {to_email}: {str(e)}")
        return False


def send_welcome_email(to_email: str, name: str, temp_password: str) -> bool:
    """
    Envia email de benvinguda amb la contrasenya temporal
    """
    subject = "Benvingut/da a El Tomb de Reus - Les teves credencials"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #e87308; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .credentials {{ background-color: #fff; border: 2px solid #e87308; border-radius: 8px; padding: 20px; margin: 20px 0; }}
            .password {{ font-size: 24px; font-weight: bold; color: #e87308; background: #fff3e0; padding: 10px; border-radius: 5px; text-align: center; }}
            .button {{ display: inline-block; background-color: #e87308; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Benvingut/da a El Tomb de Reus!</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{name}</strong>,</p>
                
                <p>El teu compte a l'aplicació <strong>El Tomb de Reus</strong> ha estat creat correctament. Ara pots accedir a totes les ofertes, esdeveniments i avantatges dels comerços associats.</p>
                
                <div class="credentials">
                    <p><strong>📧 El teu email:</strong> {to_email}</p>
                    <p><strong>🔐 La teva contrasenya temporal:</strong></p>
                    <div class="password">{temp_password}</div>
                </div>
                
                <p>⚠️ <strong>Important:</strong> Aquesta és una contrasenya temporal. Quan entris per primera vegada, se't demanarà que la canviïs per una de nova.</p>
                
                <p>Pots descarregar l'app o accedir des del navegador:</p>
                <p style="text-align: center;">
                    <a href="https://reusapp.com" class="button">Accedir a l'App</a>
                </p>
                
                <p>Si tens qualsevol dubte, no dubtis en contactar-nos.</p>
                
                <p>Salutacions cordials,<br>
                <strong>L'equip d'El Tomb de Reus</strong></p>
            </div>
            <div class="footer">
                <p>Aquest email s'ha enviat automàticament. Si no has sol·licitat aquest compte, pots ignorar aquest missatge.</p>
                <p>© 2025 El Tomb de Reus - Reus Comerç i Futur</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Benvingut/da a El Tomb de Reus!
    
    Hola {name},
    
    El teu compte ha estat creat correctament.
    
    Email: {to_email}
    Contrasenya temporal: {temp_password}
    
    Important: Aquesta és una contrasenya temporal. Quan entris per primera vegada, 
    se't demanarà que la canviïs.
    
    Accedeix a: https://reusapp.com
    
    Salutacions,
    L'equip d'El Tomb de Reus
    """
    
    return send_email(to_email, subject, html_content, text_content)


def send_password_reset_email(to_email: str, name: str, reset_token: str) -> bool:
    """
    Envia email per restablir la contrasenya
    """
    reset_link = f"https://reusapp.com/auth/reset-password?token={reset_token}"
    subject = "Restablir contrasenya - El Tomb de Reus"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #e87308; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background-color: #e87308; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Restablir Contrasenya</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{name}</strong>,</p>
                
                <p>Hem rebut una sol·licitud per restablir la contrasenya del teu compte a El Tomb de Reus.</p>
                
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Restablir Contrasenya</a>
                </p>
                
                <p>Si no has sol·licitat aquest canvi, pots ignorar aquest email. La teva contrasenya no canviarà.</p>
                
                <p>Aquest enllaç caducarà en 24 hores.</p>
                
                <p>Salutacions,<br>
                <strong>L'equip d'El Tomb de Reus</strong></p>
            </div>
            <div class="footer">
                <p>© 2025 El Tomb de Reus - Reus Comerç i Futur</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


# Test de connexió
def test_smtp_connection() -> bool:
    """Prova la connexió SMTP"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("No hi ha configuració SMTP")
        return False
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
        logger.info("✅ Connexió SMTP correcta")
        return True
    except Exception as e:
        logger.error(f"❌ Error de connexió SMTP: {str(e)}")
        return False
