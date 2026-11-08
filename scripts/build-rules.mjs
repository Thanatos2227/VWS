#!/usr/bin/env node
/**
 * scripts/build-rules.mjs
 * 
 * Fail-Closed Pre-Deploy Security Rules Compiler for Vetri Water Solutions (VWS)
 * Implements strict deployment invariants from VWS_SECURITY_ARCHITECTURE.md (DOC-006 Section 8.1)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const templatePath = path.join(projectRoot, 'firestore.rules.template');
const outputPath = path.join(projectRoot, 'firestore.rules');

const rawOwnerEmail = process.env.VWS_OWNER_EMAIL;
const nodeEnv = process.env.NODE_ENV || 'development';

console.log('[build-rules] Initializing pre-deploy security rules compilation...');

// Invariant 1: Presence & Non-Empty Check
if (!rawOwnerEmail || rawOwnerEmail.trim().length === 0) {
  console.error('FATAL: VWS_OWNER_EMAIL environment variable is missing or empty. Rules build aborted.');
  process.exit(1);
}

const ownerEmail = rawOwnerEmail.trim();

// Invariant 2: Email Format Validation (RFC 5322 pattern)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(ownerEmail)) {
  console.error(`FATAL: VWS_OWNER_EMAIL ('${ownerEmail}') is not a valid email syntax. Rules build aborted.`);
  process.exit(1);
}

// Invariant 3: Canonical Production Identity Invariant
if (nodeEnv === 'production') {
  const canonicalEmail = 'vetriwatersolutions@gmail.com';
  if (ownerEmail !== canonicalEmail) {
    console.error(`FATAL: VWS_OWNER_EMAIL mismatch in production. Expected canonical owner '${canonicalEmail}' but received '${ownerEmail}'. Deployment aborted to prevent unauthorized access.`);
    process.exit(1);
  }
}

// Read template file
if (!fs.existsSync(templatePath)) {
  console.error(`FATAL: Security rules template not found at '${templatePath}'. Rules build aborted.`);
  process.exit(1);
}

const templateContent = fs.readFileSync(templatePath, 'utf8');

if (!templateContent.includes('__VWS_OWNER_EMAIL__')) {
  console.error('FATAL: Template does not contain placeholder __VWS_OWNER_EMAIL__. Rules build aborted.');
  process.exit(1);
}

// Substitute placeholder
const compiledContent = templateContent.replaceAll('__VWS_OWNER_EMAIL__', ownerEmail);

// Invariant 4: Complete Substitution Assertion
if (compiledContent.includes('__VWS_OWNER_EMAIL__')) {
  console.error('FATAL: Incomplete placeholder substitution detected. Rules build aborted.');
  process.exit(1);
}

// Write ephemeral firestore.rules
fs.writeFileSync(outputPath, compiledContent, 'utf8');
console.log(`[build-rules] Successfully compiled ephemeral 'firestore.rules' for owner: ${ownerEmail} (${nodeEnv})`);
