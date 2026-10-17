import { describe,expect,it } from 'vitest';
import { existsSync,readFileSync } from 'node:fs';
import { join } from 'node:path';

// Vite is not Next.js: explicit nested Vercel Functions are required.
// Avoid silently relying on api/[...slug].ts for arbitrary-depth routes.
const required = ["auth/login","auth/signup","auth/logout","auth/session","billing/entitlements","billing/usage","integrations/configure","integrations/proxy","integrations/status","analyses/list","analyses/save","analyses/delete","listings/list","listings/save","listings/delete","notes/save","projects/create","projects/get","projects/list","projects/update","workspace/create","workspace/list","workspace/update","stocklots"];
describe('Vite production API routing',()=>{
  it('has a concrete function entrypoint for every registered backend endpoint',()=>{
    for(const route of required){
      const p=join(process.cwd(),'api',route+'.ts');
      expect(existsSync(p),route).toBe(true);
      expect(readFileSync(p,'utf8')).toContain('server/api/');
    }
  });
  it('provides a database configuration probe without disclosing secrets',()=>{
    const p=join(process.cwd(),'api','stocklots-status.ts');
    const source=readFileSync(p,'utf8');
    expect(source).toContain('databaseConfigured');
    expect(source).not.toContain('process.env.DATABASE_URL,');
    expect(source).not.toContain('connectionString:');
  });
});
