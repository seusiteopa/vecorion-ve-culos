import{getStore,getDeployStore}from'@netlify/blobs';
const env=k=>Netlify.env.get(k)||'',te=new TextEncoder();
const R=(d,s=200,h={})=>new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','cache-control':'no-store',...h}});
const bad=(s,m)=>R({ok:false,error:{message:m}},s);
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sign=async t=>{const k=await crypto.subtle.importKey('raw',te.encode(env('SESSION_SECRET')),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(await crypto.subtle.sign('HMAC',k,te.encode(t)))};
const same=(a,b)=>{let r=a.length^b.length;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return!r};
const cl=(v,n)=>String(v??'').trim().slice(0,n),dg=v=>String(v??'').replace(/\D/g,'').slice(0,15);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const ID=/^[\w-]{1,40}$/,UU=/^[0-9a-f-]{36}$/,CAT=['Hatch','Sedã','SUV','Picape','Utilitário','Esportivo','Outros'];
const FUEL=['Flex','Gasolina','Diesel','Etanol','Elétrico','Híbrido'],GEAR=['Manual','Automático','Automatizado','CVT'];
const CONF='Os dados foram alterados em outro lugar. Recarregue para ver a versão mais recente antes de salvar.';
const open=c=>{const o={name:'loja',consistency:'strong'};return c?.deploy?.context&&c.deploy.context!=='production'?getDeployStore(o):getStore(o)};
const load=async s=>{const r=await s.getWithMetadata('catalog',{type:'json'});return{cat:r?.data||{rev:0,vehicles:[]},etag:r?.etag}};
const cfgOf=async s=>(await s.get('settings',{type:'json'}))||{};
const slug=t=>t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function clean(b,old){
 const Y=new Date().getFullYear()+1,y=+b.yearFab,m=+b.yearModel,p=+b.price||0,k=+b.mileage||0,brand=cl(b.brand,40),model=cl(b.model,60);
 if(!brand||!model)throw'Preencha marca e modelo.';
 if(!(y>=1950&&y<=Y&&m>=y&&m<=Y))throw'Informe anos válidos (o do modelo não pode ser menor que o de fabricação).';
 if(p<0||k<0||p>1e9||k>3e6)throw'Informe preço e quilometragem válidos.';
 const ph=(Array.isArray(b.photos)?b.photos:[]).map(x=>String(x?.id||x)).filter(x=>UU.test(x)).slice(0,12).map(id=>({id}));
 const st=['draft','published','sold'].includes(b.status)?b.status:'draft';
 if(st==='published'&&!ph.length)throw'Adicione ao menos uma foto para publicar.';
 return{id:b.id,slug:old?.slug||slug(brand+' '+model+' '+m)+'-'+b.id.slice(0,4),brand,model,version:cl(b.version,60),yearFab:y,yearModel:m,price:p,mileage:k,
  fuel:FUEL.includes(b.fuel)?b.fuel:'Flex',transmission:GEAR.includes(b.transmission)?b.transmission:'Manual',color:cl(b.color,30),category:cl(b.category,24),
  description:cl(b.description,2000),options:(Array.isArray(b.options)?b.options:[]).map(o=>cl(o,40)).filter(Boolean).slice(0,30),
  featured:st==='published'&&!!b.featured,status:st,photos:ph,createdAt:old?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}}
export default async(req,ctx)=>{try{
 const u=new URL(req.url),p=u.pathname.split('/').filter(Boolean),m=req.method,s=open(ctx),H={'content-type':'text/html;charset=utf-8'};
 if(p[0]==='robots.txt')return new Response(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ${u.origin}/sitemap.xml`,{headers:{'content-type':'text/plain'}});
 if(p[0]==='sitemap.xml'){const{cat}=await load(s),l=['/','/estoque',...cat.vehicles.filter(v=>v.status==='published').map(v=>'/veiculo/'+v.slug)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${l.map(x=>`<url><loc>${esc(u.origin+x)}</loc></url>`).join('')}</urlset>`,{headers:{'content-type':'application/xml'}})}
 if(p[0]==='v'){const{cat}=await load(s),v=cat.vehicles.find(x=>x.slug===p[1]&&x.status!=='draft'),c=await cfgOf(s);
  if(!v)return new Response('<meta http-equiv="refresh" content="0;url=/estoque">',{status:404,headers:H});
  const t=`${v.brand} ${v.model} ${v.version} ${v.yearModel}`.replace(/\s+/g,' ')+' · '+(c.name||''),L='/veiculo/'+v.slug,
   d=`${v.yearModel} · ${v.mileage.toLocaleString('pt-BR')} km · ${v.transmission} · ${v.fuel}`+(v.price>0?' · R$ '+v.price.toLocaleString('pt-BR'):'')+'. Veja as fotos e fale com a loja.',
   img=v.photos[0]?`${u.origin}/api/photo/${v.id}/${v.photos[0].id}/t`:'';
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${esc(t)}</title><meta name="description" content="${esc(d)}"><meta property="og:title" content="${esc(t)}"><meta property="og:description" content="${esc(d)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(u.origin+L)}">${img?`<meta property="og:image" content="${esc(img)}">`:''}<meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${esc(L)}"><meta http-equiv="refresh" content="0;url=${esc(L)}"><a href="${esc(L)}">Abrir veículo</a>`,{headers:{...H,'netlify-cdn-cache-control':'public, s-maxage=60'}})}
 if(p[1]==='catalog'&&m==='GET'){const{cat}=await load(s);return R({ok:true,data:{settings:await cfgOf(s),vehicles:cat.vehicles.filter(v=>v.status!=='draft')}})}
 if(p[1]==='photo'&&m==='GET'){const[,,a,b,c]=p;if(!ID.test(a)||!ID.test(b)||!['f','t'].includes(c))return bad(404,'Não encontrado.');
  const r=await s.getWithMetadata(`p/${a}/${b}.${c}`,{type:'arrayBuffer'});if(!r)return bad(404,'Não encontrado.');const im=a!=='s';
  return new Response(r.data,{headers:{'content-type':r.metadata?.type||'image/jpeg','cache-control':im?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate','netlify-cdn-cache-control':im?'public, s-maxage=31536000, durable':'public, max-age=0, must-revalidate'}})}
 if(p[1]==='login'&&m==='POST'){
  if(!env('ADMIN_PASSWORD')||!env('SESSION_SECRET'))return bad(503,'Configure as variáveis ADMIN_PASSWORD e SESSION_SECRET na Netlify.');
  const b=await req.json().catch(()=>({}));
  if(!same(await sign(String(b.password??'')),await sign(env('ADMIN_PASSWORD')))){await new Promise(r=>setTimeout(r,700));return bad(401,'Senha incorreta.')}
  const e=Date.now()+432e5;return R({ok:true,data:{token:e+'.'+await sign(String(e))}})}
 if(p[1]!=='admin')return bad(404,'Não encontrado.');
 const[e,g]=(req.headers.get('authorization')||'').slice(7).split('.');
 if(!env('SESSION_SECRET')||!g||+e<Date.now()||!same(g,await sign(e)))return bad(401,'Sua sessão terminou. Entre de novo para continuar.');
 if(p[2]==='catalog'&&m==='GET'){const{cat}=await load(s);return R({ok:true,data:{settings:await cfgOf(s),vehicles:cat.vehicles,rev:cat.rev}})}
 if(p[2]==='vehicle'&&m==='PUT'){const b=await req.json(),v=b.vehicle;if(!UU.test(v?.id))throw'Dados inválidos.';
  const{cat,etag}=await load(s);if(+b.rev!==cat.rev)return bad(409,CONF);
  const i=cat.vehicles.findIndex(x=>x.id===v.id),c=clean(v,cat.vehicles[i]);
  if(i<0&&cat.vehicles.some(x=>x.slug===c.slug))c.slug=c.slug.slice(0,-4)+v.id.slice(0,8);
  i<0?cat.vehicles.unshift(c):cat.vehicles[i]=c;cat.rev++;
  const body=JSON.stringify(cat);if(body.length>1.5e6)throw'Limite de veículos atingido. Exclua veículos antigos.';
  const w=await s.set('catalog',body,etag?{onlyIfMatch:etag}:{onlyIfNew:true});if(w&&w.modified===false)return bad(409,CONF);
  const keep=new Set(c.photos.map(x=>x.id)),{blobs}=await s.list({prefix:`p/${c.id}/`});
  await Promise.all(blobs.filter(k=>!keep.has(k.key.split('/')[2].split('.')[0])).map(k=>s.delete(k.key)));
  return R({ok:true,data:{rev:cat.rev,vehicle:c}})}
 if(p[2]==='vehicle'&&m==='DELETE'){if(!ID.test(p[3]))throw'Dados inválidos.';const{cat,etag}=await load(s);
  cat.vehicles=cat.vehicles.filter(x=>x.id!==p[3]);cat.rev++;
  const w=await s.set('catalog',JSON.stringify(cat),etag?{onlyIfMatch:etag}:{});if(w&&w.modified===false)return bad(409,CONF);
  const{blobs}=await s.list({prefix:`p/${p[3]}/`});await Promise.all(blobs.map(k=>s.delete(k.key)));return R({ok:true,data:{rev:cat.rev}})}
 if(p[2]==='photo'&&m==='POST'){const[,,,a,b,c]=p;if(!ID.test(a)||!ID.test(b)||!['f','t'].includes(c))return bad(400,'Dados inválidos.');
  const d=await req.arrayBuffer();if(d.byteLength>1.5e6)return bad(413,'A foto é grande demais para enviar.');
  const h=[...new Uint8Array(d.slice(0,12))],t=h[0]==255&&h[1]==216?'image/jpeg':h[0]==137&&h[1]==80?'image/png':String.fromCharCode(...h.slice(8,12))==='WEBP'?'image/webp':'';
  if(!t)return bad(400,'Use uma imagem JPG, PNG ou WebP.');
  if(a!=='s'){const{blobs}=await s.list({prefix:`p/${a}/`});if(blobs.length>=24)return bad(400,'O limite é de 12 fotos por veículo.')}
  await s.set(`p/${a}/${b}.${c}`,d,{metadata:{type:t}});return R({ok:true,data:{}})}
 if(p[2]==='settings'&&m==='PUT'){const b=await req.json(),ln=(a,n,z)=>(Array.isArray(a)?a:[]).map(x=>cl(x,z)).filter(Boolean).slice(0,n),w=dg(b.whatsapp);
  const c={name:cl(b.name,60)||'Nome da sua loja',tagline:cl(b.tagline,120),accent:/^#[0-9a-f]{6}$/i.test(b.accent)?b.accent:'#1F5FBF',corners:b.corners==='reto'?'reto':'suave',
   whatsapp:w&&w.length<=11?'55'+w:w,phone:dg(b.phone),address:cl(b.address,160),hours:cl(b.hours,120),instagram:cl(b.instagram,80),differentials:ln(b.differentials,8,80),categories:ln(b.categories,12,24),logo:+b.logo||0};
  if(!c.categories.length)c.categories=CAT;await s.set('settings',JSON.stringify(c));return R({ok:true,data:c})}
 return bad(404,'Não encontrado.')
}catch(x){return typeof x==='string'?bad(400,x):bad(500,'Algo deu errado do nosso lado. Tente novamente em instantes.')}};
export const config={path:['/api/*','/v/*','/sitemap.xml','/robots.txt']};
