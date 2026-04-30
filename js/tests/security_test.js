import assert from 'node:assert';
import test from 'node:test';
import { sanitizeUsername, sanitizeRef } from '../core/webring.js';

test('Username Validation', () => {
    assert.strictEqual(sanitizeUsername('valid_user'), 'VALID_USER');
    assert.strictEqual(sanitizeUsername('too_long_username_here'), 'TOO_LONG_USE');
    assert.strictEqual(sanitizeUsername('user!@#$%^&*()'), 'USER');
    assert.strictEqual(sanitizeUsername('<script>alert(1)</script>'), 'SCRIPTALERT1');
    assert.strictEqual(sanitizeUsername(''), '');
});

test('Ref Parameter Validation', () => {
    assert.strictEqual(sanitizeRef('https://example.com/path'), 'example.com');
    assert.strictEqual(sanitizeRef('valid-domain.co.uk'), 'valid-domain.co.uk');
    assert.strictEqual(sanitizeRef('domain_with_bad_chars!@#'), 'domainwithbadchars');
    assert.strictEqual(sanitizeRef('a'.repeat(50)), 'a'.repeat(32));
    assert.strictEqual(sanitizeRef('javascript:alert(1)'), null);
});
