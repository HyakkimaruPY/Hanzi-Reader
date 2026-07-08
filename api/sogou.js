const DIRECT = 'https://fanyi.sogou.com/reventondc/suggV3';
function formFor(text){ return 'from=auto&to=en&client=wap&text='+encodeURIComponent(String(text||'').replace(/[^\u3400-\u9fff]/g,'').trim())+'&uuid=null&pid=sogou-dict-vr&addSugg=on'; }
module.exports = async function handler(req,res){
  try{
    if(req.method === 'OPTIONS'){ res.setHeader('access-control-allow-methods','POST,OPTIONS'); res.setHeader('access-control-allow-headers','content-type,x-hz-app'); return res.status(204).end(); }
    if(req.method !== 'POST') return res.status(405).json({error:'method not allowed'});
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');
    const rawBody = body.rawBody || formFor(body.text || '');
    if(!rawBody || !/text=/.test(rawBody)) return res.status(400).json({error:'empty text'});
    const r = await fetch(DIRECT, { method:'POST', headers:{
      'accept':'application/json,text/plain,*/*',
      'accept-language':'zh-CN,zh;q=0.9,en;q=0.8',
      'content-type':'application/x-www-form-urlencoded; charset=UTF-8',
      'origin':'https://fanyi.sogou.com',
      'referer': body.referer || 'https://fanyi.sogou.com/text',
      'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
    }, body:rawBody });
    const text = await r.text();
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('cache-control','s-maxage=86400, stale-while-revalidate=604800');
    return res.status(r.status).send(text);
  }catch(e){ return res.status(502).json({error:'sogou upstream failed', message:e.message || String(e)}); }
};
