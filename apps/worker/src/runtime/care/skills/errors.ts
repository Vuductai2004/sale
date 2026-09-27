/** Canonical error thrown by the Care skill tool port. */
export class CareSkillToolError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'CareSkillToolError';
    this.code = code;
  }
}
