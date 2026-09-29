#!/usr/bin/env node
import { loadDemoPack, NOVAMART_TENANT_ID } from './seed.mjs';

const REQUIRED = [
  'DEMO_MODE',
  'APP_ENV',
  'DEMO_TENANT_ID',
  'DEMO_TENANT_OPERATOR_PASSWORD',
  'DEMO_MARKETING_APPROVER_PASSWORD',
  'DEMO_PLATFORM_ADMIN_PASSWORD',
  'DATABASE_URL',
  'MOCK_SECRET_KEY',
  'ERP_API_BASE_URL',
];

function requireValue(env, key) {
  if (typeof env[key] !== 'string' || env[key].trim() === '') throw new Error(`DEMO_PREFLIGHT_FAILED: ${key} is required`);
}

export async function runDemoPreflight(env = process.env) {
  if (env.DEMO_MODE !== 'true') throw new Error('DEMO_PREFLIGHT_FAILED: DEMO_MODE=true is required');
  if (env.APP_ENV !== 'local' && env.APP_ENV !== 'ci') throw new Error('DEMO_PREFLIGHT_FAILED: APP_ENV must be local or ci');
  for (const key of REQUIRED) requireValue(env, key);
  if (env.DEMO_TENANT_ID !== NOVAMART_TENANT_ID) throw new Error('DEMO_PREFLIGHT_FAILED: DEMO_TENANT_ID is not the canonical NovaMart tenant');
  if (env.MOCK_ERP_ENABLED !== 'true') throw new Error('DEMO_PREFLIGHT_FAILED: MOCK_ERP_ENABLED=true is required for NovaMart');
  const origins = String(env.DEMO_WIDGET_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  if (origins.length === 0 || origins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin))) {
    throw new Error('DEMO_PREFLIGHT_FAILED: DEMO_WIDGET_ORIGINS must contain at least one bare HTTP(S) origin');
  }
  const pack = await loadDemoPack();
  return {
    tenant_id: NOVAMART_TENANT_ID,
    pack_version: pack.pack_version,
    demo_as_of: pack.demo_as_of,
    required_values_checked: REQUIRED.length,
    widget_origins: origins,
  };
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/demo/preflight.mjs')) {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(); } catch { /* ignore if .env is missing */ }
  }
  runDemoPreflight().then((result) => {
    console.log(`NovaMart demo preflight passed: ${JSON.stringify(result)}`);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : 'DEMO_PREFLIGHT_FAILED');
    process.exitCode = 1;
  });
}
