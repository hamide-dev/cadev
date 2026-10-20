import { isUniqueViolation } from './is-unique-violation.js';

describe('isUniqueViolation', () => {
  it('recognizes the PostgreSQL driver error wrapped by TypeORM', () => {
    expect(
      isUniqueViolation({
        driverError: { code: '23505' },
      }),
    ).toBe(true);
  });

  it('does not classify unrelated database failures as conflicts', () => {
    expect(
      isUniqueViolation({
        driverError: { code: '08006' },
      }),
    ).toBe(false);
  });
});
