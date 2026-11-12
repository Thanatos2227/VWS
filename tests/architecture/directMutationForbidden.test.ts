
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architectural Enforcement: No Direct Client Writes', () => {
  const servicesDir = path.resolve(__dirname, '../../src/services');

  it('ensures siteService.ts contains NO direct Firestore mutation calls', () => {
    const siteServicePath = path.join(servicesDir, 'siteService.ts');
    const content = fs.readFileSync(siteServicePath, 'utf-8');

    const prohibitedCalls = [
      /\bsetDoc\s*\(/g,
      /\bupdateDoc\s*\(/g,
      /\bdeleteDoc\s*\(/g,
      /\baddDoc\s*\(/g,
      /\brunTransaction\s*\(/g,
      /\bwriteBatch\s*\(/g
    ];

    for (const pattern of prohibitedCalls) {
      const matches = content.match(pattern);
      expect(matches, `siteService.ts must not contain direct write call matching ${pattern}`).toBeNull();
    }
  });

  it('ensures accountService.ts contains NO direct Firestore mutation calls', () => {
    const accountServicePath = path.join(servicesDir, 'accountService.ts');
    const content = fs.readFileSync(accountServicePath, 'utf-8');

    const prohibitedCalls = [
      /\bsetDoc\s*\(/g,
      /\bupdateDoc\s*\(/g,
      /\bdeleteDoc\s*\(/g,
      /\baddDoc\s*\(/g,
      /\brunTransaction\s*\(/g,
      /\bwriteBatch\s*\(/g
    ];

    for (const pattern of prohibitedCalls) {
      const matches = content.match(pattern);
      expect(matches, `accountService.ts must not contain direct write call matching ${pattern}`).toBeNull();
    }
  });

  it('verifies that siteService.ts imports and calls callableClient wrappers', () => {
    const siteServicePath = path.join(servicesDir, 'siteService.ts');
    const content = fs.readFileSync(siteServicePath, 'utf-8');

    expect(content).toContain('callCommitSiteJob');
    expect(content).toContain('callCommitSiteCorrection');
    expect(content).toContain('callCommitSiteStatusChange');
  });

  it('verifies that accountService.ts imports and calls callableClient wrappers', () => {
    const accountServicePath = path.join(servicesDir, 'accountService.ts');
    const content = fs.readFileSync(accountServicePath, 'utf-8');

    expect(content).toContain('callCommitDailyAccountsUpdate');
  });
});

