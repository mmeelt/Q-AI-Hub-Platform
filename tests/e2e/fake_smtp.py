"""Fake SMTP server for the test copy of Q-AI Hub: every e-mail is saved as a file, nothing is sent."""
import email, json, sys, time
from email import policy
from pathlib import Path
from aiosmtpd.controller import Controller

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)


class Saver:
    async def handle_DATA(self, server, session, envelope):
        msg = email.message_from_bytes(envelope.content, policy=policy.default)
        body = msg.get_body(preferencelist=('plain', 'html'))
        record = {
            'to': [r.lower() for r in envelope.rcpt_tos],
            'subject': str(msg['subject'] or ''),
            'body': body.get_content() if body else '',
            'at': time.time(),
        }
        name = OUT / f"{time.time_ns()}.json"
        name.write_text(json.dumps(record, ensure_ascii=False), encoding='utf-8')
        return '250 OK'


controller = Controller(Saver(), hostname='127.0.0.1', port=2525)
controller.start()
print('fake SMTP listening on 2525', flush=True)
try:
    while True:
        time.sleep(3600)
finally:
    controller.stop()
