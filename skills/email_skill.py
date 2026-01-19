import imaplib
import email
import os
from skills.base_skill import BaseSkill

class EmailSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant
        self.imap_server = os.getenv("IMAP_SERVER")
        self.email_address = os.getenv("EMAIL_ADDRESS")
        self.email_password = os.getenv("EMAIL_PASSWORD")

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'read_email'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        if not all([self.imap_server, self.email_address, self.email_password]):
            return "Email credentials are not fully configured. Please set IMAP_SERVER, EMAIL_ADDRESS, and EMAIL_PASSWORD."

        return self.read_unread_emails()

    def read_unread_emails(self):
        """Reads unread emails from the inbox."""
        try:
            mail = imaplib.IMAP4_SSL(self.imap_server)
            mail.login(self.email_address, self.email_password)
            mail.select("inbox")

            status, messages = mail.search(None, "UNSEEN")
            if status != "OK":
                return "Could not search for unread emails."

            unread_count = len(messages[0].split())
            if unread_count == 0:
                return "You have no unread emails."

            email_summaries = []
            for num in messages[0].split()[:5]: # Limit to 5 emails
                status, data = mail.fetch(num, "(RFC822)")
                if status != "OK":
                    continue

                msg = email.message_from_bytes(data[0][1])
                sender = msg["From"]
                subject = msg["Subject"]
                email_summaries.append(f"From {sender}, subject: {subject}")

            response = f"You have {unread_count} unread emails. Here are the latest {len(email_summaries)}:\n"
            response += "\n".join(email_summaries)
            return response

        except imaplib.IMAP4.error as e:
            print(f"❌ IMAP error: {e}")
            return "Could not connect to your email account. Please check your credentials and IMAP settings."
        except Exception as e:
            print(f"❌ Email error: {e}")
            return "Sorry, I couldn't read your emails."
        finally:
            if 'mail' in locals() and mail.state == 'SELECTED':
                mail.logout()
