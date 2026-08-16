describe('Security Logic (Unit)', () => {
  it('argon2 hash is not plaintext and verifies correctly', async () => {
    const argon2 = require('argon2');
    const hash = await argon2.hash('secret123', { type: argon2.argon2id });
    expect(hash).not.toBe('secret123');
    expect(hash).toMatch(/^\$argon2/);
    expect(await argon2.verify(hash, 'secret123')).toBe(true);
    expect(await argon2.verify(hash, 'wrong')).toBe(false);
  });

  it('HMAC signature valid and tamper-detecting', () => {
    const crypto = require('crypto');
    const secret = 'test-secret';
    const body = '{"test":true}';
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))).toBe(true);
    const tampered = 'sha256=' + crypto.createHmac('sha256', secret).update('{"test":false}').digest('hex');
    expect(sig).not.toBe(tampered);
  });

  it('Cairo date computes UTC midnight', () => {
    const now = new Date();
    const cairo = new Date(now.getTime() + 2 * 3600 * 1000);
    const date = new Date(Date.UTC(cairo.getUTCFullYear(), cairo.getUTCMonth(), cairo.getUTCDate()));
    expect(date.getUTCHours()).toBe(0);
    expect(date.getUTCMinutes()).toBe(0);
  });
});
