import {mkdtemp,symlink,writeFile,rm} from 'node:fs/promises';
import {tmpdir,platform} from 'node:os';
import {join,resolve,sep,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Pool} from 'pg';
import EmbeddedPostgres from 'embedded-postgres';
const run=promisify(execFile);

/** Disposable test DB; Windows uses an ASCII junction because initdb cannot
 * re-execute itself from Vietnamese directory names on some Windows locales. */
export async function temporaryPostgres({port,password}) {
  const directory=await mkdtemp(join(tmpdir(),'vietcraft-c4-'));
  let child,embedded,stopped=false;
  async function stop() {
    if(stopped) return;
    stopped=true;
    if(embedded) await embedded.stop();
    if(child && child.exitCode===null) {
      const binary=join(directory,'native','bin','pg_ctl.exe');
      await run(binary,['stop','-D',join(directory,'db'),'-m','fast','-w']);
    }
    // Verify the generated target is confined to the system temporary directory.
    const target=resolve(directory), parent=resolve(tmpdir())+sep;
    if(!target.startsWith(parent) || !target.slice(parent.length).startsWith('vietcraft-c4-')) throw new Error('Unsafe temporary DB cleanup path');
    // Remove the junction itself first; never traverse its package-directory target.
    if(platform()==='win32') await rm(join(directory,'native'),{force:true}).catch(()=>{});
    await rm(target,{recursive:true,force:true});
  }
  try {
    if(platform()!=='win32') {
      embedded=new EmbeddedPostgres({databaseDir:join(directory,'db'),user:'postgres',password,port,persistent:true,
        authMethod:'scram-sha-256',autoRehydrateSymlinks:true,postgresFlags:['-h','127.0.0.1'],
        initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:()=>{}});
      await embedded.initialise();await embedded.start();
    } else {
      const {default:getBinaries}=await import(new URL('./binary.js',import.meta.resolve('embedded-postgres')));
      const {postgres}=await getBinaries();
      await symlink(resolve(dirname(postgres),'..'),join(directory,'native'),'junction');
      const passwordFile=join(directory,'password');await writeFile(passwordFile,password+'\n');
      try {await run(join(directory,'native','bin','initdb.exe'),['-D',join(directory,'db'),'--auth=scram-sha-256','--username=postgres',`--pwfile=${passwordFile}`,'--encoding=UTF8','--locale=C']);}
      finally {await rm(passwordFile,{force:true});}
      child=spawn(join(directory,'native','bin','postgres.exe'),['-D',join(directory,'db'),'-p',String(port),'-h','127.0.0.1'],{stdio:'ignore',windowsHide:true});
      let spawnError;child.on('error',e=>{spawnError=e;});
      const probe=new Pool({host:'127.0.0.1',port,user:'postgres',password,database:'postgres',connectionTimeoutMillis:1000});
      try {
        const deadline=Date.now()+20000;
        for(;;) {
          if(spawnError) throw spawnError;
          if(child.exitCode!==null) throw new Error(`PostgreSQL exited: ${child.exitCode}`);
          try {await probe.query('SELECT 1');break;}
          catch(e) {if(Date.now()>deadline) throw e;await new Promise(r=>setTimeout(r,100));}
        }
      } finally {await probe.end();}
    }
    return {stop};
  } catch(error) {
    await stop().catch(()=>{});
    if(platform()==='win32' && error?.code===3221225781) {
      const dependencyError=new Error('Embedded PostgreSQL cannot start on Windows because the Visual C++ 2015-2022 Redistributable (x64) is missing. Install it, then rerun the C4 integration tests.',{cause:error});
      throw dependencyError;
    }
    throw error;
  }
}
