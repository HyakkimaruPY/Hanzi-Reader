#!/usr/bin/env node
const handler=require('../api/tts-edge.js');

function mockRes(){
  return {
    statusCode:200,headers:{},body:null,
    setHeader(k,v){this.headers[String(k).toLowerCase()]=v;},
    end(v=''){this.body=v;this.ended=true;}
  };
}
async function run(req){const res=mockRes();await handler(req,res);return res;}

(async()=>{
  const health=await run({method:'GET',url:'/api/tts-edge?health=1'});
  const data=JSON.parse(String(health.body));
  if(health.statusCode!==200||data.ok!==true||data.service!=='tts-edge')throw new Error('health check inválido');

  const empty=await run({method:'POST',body:{}});
  const emptyData=JSON.parse(String(empty.body));
  if(empty.statusCode!==400||emptyData.step!=='input')throw new Error('validação de SSML vazio falhou');

  const options=await run({method:'OPTIONS'});
  if(options.statusCode!==204)throw new Error('CORS OPTIONS falhou');
  if(!String(options.headers['access-control-allow-methods']).includes('GET'))throw new Error('CORS não permite GET');

  console.log('✓ API TTS: health, CORS e validação de entrada aprovados');
})().catch(e=>{console.error('✗ '+e.message);process.exit(1);});
