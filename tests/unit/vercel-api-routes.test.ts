import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const read = (name: string) => readFileSync(join(process.cwd(),name),'utf8');
describe('Vercel Hobby deployment routing',()=>{
 it('routes all API paths to a single serverless function',()=>{
  const config=JSON.parse(read('vercel.json'));
  expect(config.rewrites[0]).toEqual({source:'/api/(.*)',destination:'/api/router?route=$1'});
  expect(Object.keys(config.functions)).toEqual(['api/router.ts']);
 });
 it('keeps all existing auth and stock-lot endpoints',()=>{
  const source=read('api/router.ts');
  for(const path of ['auth/login','auth/signup','auth/session','workspace/list','workspace/create','stocklots','stocklots-status']){
   expect(source).toContain("register('/api/"+path+"'");
  }
  expect(source).toContain('databaseConfigured');
 });
});
