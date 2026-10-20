export function isUniqueViolation(error: unknown): boolean {
  if (!isRecord(error)) return false;
  if (error.code === '23505') return true;
  return isRecord(error.driverError) && error.driverError.code === '23505';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
