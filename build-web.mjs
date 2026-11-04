import { cpSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
JSON.parse(readFileSync(join(root,'web/manifest.webmanifest'),'utf8'));
rmSync(join(root,'dist'),{recursive:true,force:true});
mkdirSync(join(root,'dist'),{recursive:true});
cpSync(join(root,'web'),join(root,'dist'),{recursive:true});
console.log('Phone browser app built in app/dist. Host this folder over HTTPS.');
