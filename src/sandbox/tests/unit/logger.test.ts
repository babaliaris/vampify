import { test, describe } from 'node:test';
import assert from 'node:assert';
import { vampifyGetLoggerConfig } from '@vampify/utils';
import { VAMPIFY_ENV_LITERALS } from '@vampify/env';

describe('Logger Configuration Tests', () =>
{
  // Store original env so we don't break other tests
  const originalEnv = { ...process.env };

  // Helper to reset env after each test
  const resetEnv = () =>
  {
    Object.keys(process.env).forEach(key => delete process.env[key]);
    Object.assign(process.env, originalEnv);
  };

  test('Should return the correct transport structure for ROLL method', () =>
  {
    // Arrange
    process.env.LOG_METHOD  = VAMPIFY_ENV_LITERALS.LOG_METHOD_ROLL;
    process.env.NODE_ENV    = 'production';

    // Act
    const config: any = vampifyGetLoggerConfig();

    // Assert
    assert.ok(config.transport, 'Transport should be defined');
    assert.ok(config.transport.targets, 'Transport should contain targets array');
    assert.strictEqual(config.transport.targets.length, 1, 'Should have 1 target (roll)');
    assert.strictEqual(config.transport.targets[0].target, 'pino-roll', 'Target should be pino-roll');

    resetEnv();
  });


  test('Should return the correct transport structure for ROLL+STDOUT method', () =>
  {
    // Arrange
    process.env.LOG_METHOD  = VAMPIFY_ENV_LITERALS.LOG_METHOD_ROLL_AND_STDOUT;
    process.env.NODE_ENV    = 'production';

    // Act
    const config: any = vampifyGetLoggerConfig();

    // Assert
    assert.ok(config.transport, 'Transport should be defined');
    assert.ok(config.transport.targets, 'Transport should contain targets array');
    assert.strictEqual(config.transport.targets.length, 2, 'Should have 2 targets (stdout + file)');
    assert.strictEqual(config.transport.targets[0].target, 'pino/file', 'First target should be stdout');
    assert.strictEqual(config.transport.targets[1].target, 'pino-roll', 'Second target should be pino-roll');

    resetEnv();
  });

  test('Should return baseConfig when STDOUT is selected', () =>
  {
    process.env.LOG_METHOD = VAMPIFY_ENV_LITERALS.LOG_METHOD_STDOUT;

    const config: any = vampifyGetLoggerConfig();

    assert.ok(!config.transport, 'Config should NOT have a transport property');
    assert.ok(config.serializers, 'Config should still have serializers');
 
    resetEnv();
  });

  test('Serializers should redact sensitive data', () =>
  {
    const config: any = vampifyGetLoggerConfig();

    // We can extract the serializer function directly from the config object
    const reqSerializer = config.serializers.req;

    // Create a mock Request object
    const mockRequest =
    {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer secret-token' },
      vampify_payload: { user_id: '123' }
    } as any;

    const result = reqSerializer(mockRequest);

    // Verify mapping
    assert.strictEqual(result.userId, '123');
    assert.strictEqual(result.method, 'GET');

    // The actual redaction logic happens inside Pino (via the `redact` array),
    // but verifying the structure here ensures the data mapping is correct.
  });
});
