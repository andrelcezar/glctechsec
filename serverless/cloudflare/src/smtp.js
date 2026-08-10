/**
 * Minimal SMTP client for Cloudflare Workers.
 *
 * Workers have no Node TCP stack, so nodemailer cannot run there. What Workers
 * do have is `connect()` from `cloudflare:sockets`, which speaks raw TCP with
 * implicit TLS — and Zoho's port 465 is implicit TLS, so the socket is already
 * encrypted before the first byte. That makes the dialogue short enough to
 * implement directly, with no STARTTLS upgrade to negotiate.
 *
 * `connect` is a parameter rather than an import so the whole exchange can be
 * driven by a mock socket in tests.
 */

const CRLF = '\r\n';
const enc = new TextEncoder();
const dec = new TextDecoder();

/** Reads whole SMTP replies, which may span several lines ("250-" then "250 "). */
function makeReader(readable) {
  const reader = readable.getReader();
  let buffer = '';

  return {
    async read() {
      for (;;) {
        // A reply is complete once a line starts with "NNN " (space, not hyphen).
        const lines = buffer.split(CRLF);
        for (let i = 0; i < lines.length; i++) {
          if (/^\d{3} /.test(lines[i])) {
            const reply = lines.slice(0, i + 1).join(CRLF);
            buffer = lines.slice(i + 1).join(CRLF);
            return { code: Number(reply.slice(0, 3)), text: reply };
          }
        }
        const { value, done } = await reader.read();
        if (done) throw new Error('SMTP connection closed unexpectedly');
        buffer += typeof value === 'string' ? value : dec.decode(value, { stream: true });
      }
    },
    release() { try { reader.releaseLock(); } catch { /* already gone */ } },
  };
}

const b64 = (s) => btoa(String.fromCharCode(...enc.encode(s)));

/** Strips CR/LF so a crafted value cannot inject extra SMTP headers. */
const header = (v) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();

/**
 * RFC 5321 requires a line consisting of a single "." to end DATA, so any body
 * line that already starts with "." must be doubled or it truncates the message.
 */
const dotStuff = (body) =>
  body.replace(/\r?\n/g, CRLF).split(CRLF).map((l) => (l.startsWith('.') ? '.' + l : l)).join(CRLF);

export async function sendMail(options) {
  const {
    connect, hostname = 'smtppro.zoho.com', port = 465,
    user, pass, from, to, replyTo, subject, text,
  } = options;

  const socket = connect({ hostname, port }, { secureTransport: 'on', allowHalfOpen: false });
  const writer = socket.writable.getWriter();
  const reader = makeReader(socket.readable);

  const send = async (line) => { await writer.write(enc.encode(line + CRLF)); };

  const expect = async (wanted, step) => {
    const reply = await reader.read();
    if (!wanted.includes(reply.code)) {
      throw new Error(`SMTP ${step} failed: ${reply.text.split(CRLF)[0]}`);
    }
    return reply;
  };

  try {
    await expect([220], 'greeting');

    await send('EHLO glctechsec.com');
    await expect([250], 'EHLO');

    await send('AUTH LOGIN');
    await expect([334], 'AUTH');
    await send(b64(user));
    await expect([334], 'username');
    await send(b64(pass));
    await expect([235], 'password');

    await send(`MAIL FROM:<${user}>`);
    await expect([250], 'MAIL FROM');

    await send(`RCPT TO:<${to}>`);
    await expect([250, 251], 'RCPT TO');

    await send('DATA');
    await expect([354], 'DATA');

    const headers = [
      `From: ${header(from)}`,
      `To: <${header(to)}>`,
      replyTo ? `Reply-To: ${header(replyTo)}` : null,
      `Subject: ${header(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
    ].filter(Boolean).join(CRLF);

    await send(headers + CRLF + CRLF + dotStuff(text) + CRLF + '.');
    await expect([250], 'message body');

    await send('QUIT');
    return { ok: true };
  } finally {
    reader.release();
    try { await writer.close(); } catch { /* server may have closed first */ }
  }
}
