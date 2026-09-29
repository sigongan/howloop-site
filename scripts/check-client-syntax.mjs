// Validate what browsers actually receive, independently of the build parser.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('../dist/_astro/',import.meta.url));
const files=(await fs.readdir(directory)).filter(name=>name.endsWith('.js'));
if(!files.length)throw new Error('Build the website before checking client syntax.');
const failures=[];
for(const file of files){
  const result=spawnSync(process.execPath,['--check',path.join(directory,file)],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)failures.push({file,error:result.error?.message||result.stderr||'Syntax check did not finish.'});
}
if(failures.length)throw new Error('Client JavaScript syntax failures: '+JSON.stringify(failures));
console.log(JSON.stringify({clientSyntaxPassed:true,scripts:files.length}));
