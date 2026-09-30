import { describe, expect, it } from 'vitest';

import { mapError } from './http.js';

describe('gateway approval refusal mapping', () => {
  it('preserves the core REQUIRE_HUMAN_APPROVAL decision code', () => {
    const response = mapError(
      { name: 'SkillError', code: 'REQUIRE_HUMAN_APPROVAL' },
      'correlation-approval',
    );

    expect(response.error_code).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(response.correlation_id).toBe('correlation-approval');
  });
});
