export interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  DATABASE_SSL: boolean;
  JWT_ACCESS_SECRET: string;
  CORS_ORIGINS: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  BREVO_SMTP_USER?: string;
  BREVO_SMTP_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  BREVO_SENDER_NAME?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_CALLBACK_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_CALLBACK_URL?: string;
}

type RawEnvironment = Record<string, unknown>;

export function validateEnvironment(raw: RawEnvironment): Environment {
  const nodeEnv = raw.NODE_ENV ?? 'development';
  if (
    nodeEnv !== 'development' &&
    nodeEnv !== 'test' &&
    nodeEnv !== 'production'
  ) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const portValue = raw.PORT ?? '3000';
  const port =
    typeof portValue === 'number'
      ? portValue
      : typeof portValue === 'string' && /^\d+$/.test(portValue)
        ? Number(portValue)
        : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const databaseUrl = requiredString(raw, 'DATABASE_URL');
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (
    parsedDatabaseUrl.protocol !== 'postgres:' &&
    parsedDatabaseUrl.protocol !== 'postgresql:'
  ) {
    throw new Error('DATABASE_URL must use the postgres or postgresql scheme');
  }
  if (
    !parsedDatabaseUrl.hostname ||
    !parsedDatabaseUrl.username ||
    parsedDatabaseUrl.pathname.length < 2
  ) {
    throw new Error(
      'DATABASE_URL must include a host, username, and database name',
    );
  }

  const databaseSslValue = raw.DATABASE_SSL ?? 'false';
  if (
    databaseSslValue !== 'true' &&
    databaseSslValue !== 'false' &&
    databaseSslValue !== true &&
    databaseSslValue !== false
  ) {
    throw new Error('DATABASE_SSL must be true or false');
  }
  const databaseSsl = databaseSslValue === 'true' || databaseSslValue === true;

  const accessSecret = validateSecret(raw, 'JWT_ACCESS_SECRET');
  const cloudinaryValues = [
    raw.CLOUDINARY_CLOUD_NAME,
    raw.CLOUDINARY_API_KEY,
    raw.CLOUDINARY_API_SECRET,
  ];
  const configuredCloudinaryValues = cloudinaryValues.filter(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );
  if (
    configuredCloudinaryValues.length > 0 &&
    configuredCloudinaryValues.length !== cloudinaryValues.length
  ) {
    throw new Error(
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must be configured together',
    );
  }
  const cloudinaryCloudName = optionalString(raw, 'CLOUDINARY_CLOUD_NAME');
  const cloudinaryApiKey = optionalString(raw, 'CLOUDINARY_API_KEY');
  const cloudinaryApiSecret = optionalString(raw, 'CLOUDINARY_API_SECRET');
  if (cloudinaryCloudName && !/^[a-zA-Z0-9_-]+$/.test(cloudinaryCloudName)) {
    throw new Error('CLOUDINARY_CLOUD_NAME has an invalid format');
  }
  const brevoValues = [
    optionalString(raw, 'BREVO_SMTP_USER'),
    optionalString(raw, 'BREVO_SMTP_KEY'),
    optionalString(raw, 'BREVO_SENDER_EMAIL'),
  ];
  assertOptionalGroup(
    brevoValues,
    'BREVO_SMTP_USER, BREVO_SMTP_KEY, and BREVO_SENDER_EMAIL must be configured together',
  );
  if (brevoValues[2] && !isEmailAddress(brevoValues[2])) {
    throw new Error('BREVO_SENDER_EMAIL must be a valid email address');
  }
  const googleValues = [
    optionalString(raw, 'GOOGLE_CLIENT_ID'),
    optionalString(raw, 'GOOGLE_CLIENT_SECRET'),
    optionalString(raw, 'GOOGLE_CALLBACK_URL'),
  ];
  assertOptionalGroup(
    googleValues,
    'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL must be configured together',
  );
  if (googleValues[2])
    validateCallbackUrl(googleValues[2], 'GOOGLE_CALLBACK_URL');
  const githubValues = [
    optionalString(raw, 'GITHUB_CLIENT_ID'),
    optionalString(raw, 'GITHUB_CLIENT_SECRET'),
    optionalString(raw, 'GITHUB_CALLBACK_URL'),
  ];
  assertOptionalGroup(
    githubValues,
    'GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL must be configured together',
  );
  if (githubValues[2])
    validateCallbackUrl(githubValues[2], 'GITHUB_CALLBACK_URL');

  const corsOrigins = raw.CORS_ORIGINS ?? 'http://localhost:3001';
  if (typeof corsOrigins !== 'string' || corsOrigins.trim().length === 0) {
    throw new Error('CORS_ORIGINS must be a comma-separated list of origins');
  }
  const normalizedOrigins: string[] = [];
  for (const origin of corsOrigins.split(',')) {
    try {
      const parsedOrigin = new URL(origin.trim());
      if (
        parsedOrigin.protocol !== 'http:' &&
        parsedOrigin.protocol !== 'https:'
      ) {
        throw new Error();
      }
      if (
        parsedOrigin.username ||
        parsedOrigin.password ||
        parsedOrigin.pathname !== '/' ||
        parsedOrigin.search ||
        parsedOrigin.hash
      ) {
        throw new Error();
      }
      normalizedOrigins.push(parsedOrigin.origin);
    } catch {
      throw new Error('CORS_ORIGINS contains an invalid HTTP(S) origin');
    }
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: databaseSsl,
    JWT_ACCESS_SECRET: accessSecret,
    CORS_ORIGINS: normalizedOrigins.join(','),
    ...(cloudinaryCloudName
      ? {
          CLOUDINARY_CLOUD_NAME: cloudinaryCloudName,
          CLOUDINARY_API_KEY: cloudinaryApiKey,
          CLOUDINARY_API_SECRET: cloudinaryApiSecret,
        }
      : {}),
    ...(brevoValues[0]
      ? {
          BREVO_SMTP_USER: brevoValues[0],
          BREVO_SMTP_KEY: brevoValues[1],
          BREVO_SENDER_EMAIL: brevoValues[2],
          ...(optionalString(raw, 'BREVO_SENDER_NAME')
            ? { BREVO_SENDER_NAME: optionalString(raw, 'BREVO_SENDER_NAME') }
            : {}),
        }
      : {}),
    ...(googleValues[0]
      ? {
          GOOGLE_CLIENT_ID: googleValues[0],
          GOOGLE_CLIENT_SECRET: googleValues[1],
          GOOGLE_CALLBACK_URL: googleValues[2],
        }
      : {}),
    ...(githubValues[0]
      ? {
          GITHUB_CLIENT_ID: githubValues[0],
          GITHUB_CLIENT_SECRET: githubValues[1],
          GITHUB_CALLBACK_URL: githubValues[2],
        }
      : {}),
  };
}

function assertOptionalGroup(
  values: Array<string | undefined>,
  message: string,
): void {
  const configuredCount = values.filter(Boolean).length;
  if (configuredCount > 0 && configuredCount !== values.length) {
    throw new Error(message);
  }
}

function isEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateCallbackUrl(value: string, key: string): void {
  let callback: URL;
  try {
    callback = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid HTTP(S) URL`);
  }
  if (
    callback.protocol !== 'https:' &&
    !(callback.protocol === 'http:' && callback.hostname === 'localhost')
  ) {
    throw new Error(`${key} must use HTTPS (HTTP is allowed for localhost)`);
  }
}

function requiredString(raw: RawEnvironment, key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function optionalString(raw: RawEnvironment, key: string): string | undefined {
  const value = raw[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function validateSecret(raw: RawEnvironment, key: string): string {
  const value = requiredString(raw, key);
  if (
    value.length < 32 ||
    /change[_ -]?me|example|replace|your[_ -]/i.test(value)
  ) {
    throw new Error(
      `${key} must be a non-placeholder secret of at least 32 characters`,
    );
  }
  return value;
}
