import { describe, expect, it } from 'vitest';

import { classifyTurnModule, salesRequirementsFor } from './turn-classifier.js';

describe('classifyTurnModule', () => {
  it('routes the demo shopping prompt to Sales without a provider classification', () => {
    expect(classifyTurnModule('I need a laptop under 20 million VND for graphic design.', undefined)).toBe('sales');
    expect(classifyTurnModule('Tư vấn điện thoại dưới 20 triệu để chơi game', undefined)).toBe('sales');
  });

  it('keeps support first when the same message also reports a problem with an existing order', () => {
    expect(classifyTurnModule('My laptop order is broken and not working', undefined)).toBe('support');
    expect(classifyTurnModule('Where is my order? I still need a laptop', undefined)).toBe('support');
  });

  it('leaves an unclassified message with Customer Care', () => {
    expect(classifyTurnModule('Hello, are you there?', undefined)).toBe('support');
    expect(classifyTurnModule('Hello', 'marketing')).toBe('marketing');
  });
});

describe('salesRequirementsFor', () => {
  it('parses English fractional-million budgets without losing the fraction', () => {
    expect(salesRequirementsFor('Recommend a laptop under 1.5m for graphic design')).toEqual({
      category: 'laptops',
      budget_vnd: 1_500_000,
      use_case: 'graphic design',
    });
  });

  it('parses Vietnamese budget wording', () => {
    expect(salesRequirementsFor('Tư vấn điện thoại dưới 20 triệu để chơi game')).toEqual({
      category: 'phones',
      budget_vnd: 20_000_000,
      use_case: 'gaming',
    });
  });

  it('fails closed when a required requirement is absent', () => {
    expect(salesRequirementsFor('Recommend a laptop under 20m')).toBeUndefined();
  });
});
