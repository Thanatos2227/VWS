
import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Firestore Declarative Security Rules (VER-10 / DOC-006)', () => {
  const templatePath = resolve(__dirname, '../../firestore.rules.template');
  let templateContent: string;

  beforeAll(() => {
    expect(existsSync(templatePath)).toBe(true);
    templateContent = readFileSync(templatePath, 'utf-8');
  });

  describe('Rule Template Static Integrity & Default-Deny', () => {
    it('contains the single-owner email placeholder __VWS_OWNER_EMAIL__', () => {
      expect(templateContent).toContain('__VWS_OWNER_EMAIL__');
    });

    it('enforces rules_version = \'2\'', () => {
      expect(templateContent).toContain("rules_version = '2'");
    });

    it('defines isAuthorizedOwner helper validating request.auth.token.email', () => {
      expect(templateContent).toContain('function isAuthorizedOwner()');
      expect(templateContent).toContain('request.auth.token.email == "__VWS_OWNER_EMAIL__"');
    });

    it('strictly denies all direct client writes to sites collection', () => {
      const sitesSection = templateContent.slice(
        templateContent.indexOf('match /sites/{siteId}'),
        templateContent.indexOf('match /accounts_daily/{dateId}')
      );
      expect(sitesSection).toContain('allow read: if isAuthorizedOwner()');
      expect(sitesSection).toContain('allow write: if false');
    });

    it('strictly denies direct client writes to accounts_daily and audit_log', () => {
      const accountsSection = templateContent.slice(
        templateContent.indexOf('match /accounts_daily/{dateId}'),
        templateContent.indexOf('match /system_counters/{counterId}')
      );
      expect(accountsSection).toContain('allow read: if isAuthorizedOwner()');
      expect(accountsSection).toContain('allow write: if false');
      expect(accountsSection).toContain('match /audit_log/{revisionId}');
    });

    it('strictly denies ALL direct client access (read and write) to committed_operations', () => {
      const committedSection = templateContent.slice(
        templateContent.indexOf('match /committed_operations/{idempotencyKey}')
      );
      expect(committedSection).toContain('allow read, write: if false');
    });

    it('enforces canonical task queue create rules on system_tasks', () => {
      const tasksSection = templateContent.slice(
        templateContent.indexOf('match /system_tasks/{taskId}')
      );
      expect(tasksSection).toContain('allow read: if isAuthorizedOwner()');
      expect(tasksSection).toContain('allow update, delete: if false');
      expect(tasksSection).toContain("request.resource.data.status == 'PENDING'");
      expect(tasksSection).toContain('request.resource.data.attempts == 0');
    });
  });

  describe('Compiled firestore.rules Single-Owner Identity Verification', () => {
    const compiledPath = resolve(__dirname, '../../firestore.rules');
    let compiledContent: string;

    beforeAll(() => {
      expect(existsSync(compiledPath)).toBe(true);
      compiledContent = readFileSync(compiledPath, 'utf-8');
    });

    it('contains no unreplaced __VWS_OWNER_EMAIL__ placeholder in compiled rules', () => {
      expect(compiledContent).not.toContain('__VWS_OWNER_EMAIL__');
    });

    it('enforces authoritative owner email vetriwatersolution@gmail.com in compiled rules', () => {
      expect(compiledContent).toContain('request.auth.token.email == "vetriwatersolution@gmail.com"');
    });

    it('strictly does not contain the old owner email vetriwatersolutions@gmail.com in compiled rules', () => {
      expect(compiledContent).not.toContain('vetriwatersolutions@gmail.com');
    });
  });
});
