import { validateEnvironment } from './environment.js';

const validEnvironment = {
  NODE_ENV: 'test',
  PORT: '3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/hello_world',
  DATABASE_SSL: 'false',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
  CORS_ORIGINS: 'http://localhost:3001',
};

describe('validateEnvironment', () => {
  it('parses valid environment values', () => {
    expect(validateEnvironment(validEnvironment)).toEqual({
      ...validEnvironment,
      PORT: 3000,
      DATABASE_SSL: false,
    });
  });

  it('rejects a missing PostgreSQL URL', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_URL: undefined }),
    ).toThrow('DATABASE_URL is required');
  });

  it('rejects placeholder JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_ACCESS_SECRET:
          'replace_with_a_random_access_secret_of_at_least_32_chars',
      }),
    ).toThrow('JWT_ACCESS_SECRET must be a non-placeholder secret');
  });

  it('rejects non-PostgreSQL URLs', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: 'mysql://user:password@localhost:3306/hello_world',
      }),
    ).toThrow('DATABASE_URL must use the postgres or postgresql scheme');
  });

  it('rejects an origin that includes a path', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        CORS_ORIGINS: 'https://frontend.example/path',
      }),
    ).toThrow('CORS_ORIGINS contains an invalid HTTP(S) origin');
  });
});
