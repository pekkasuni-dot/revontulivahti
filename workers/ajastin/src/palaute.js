// Hälytysten palaute (2026-10-24, kenttätesti): ntfy-ilmoituksen napit
// ("Näkyi" / "Ei näkynyt" / "Pilvessä") lähettävät POST-pyynnön osoitteeseen
// /palaute?h=<hälytys>&v=<vastaus>&k=<vastaaja>&s=<allekirjoitus>.
// Allekirjoitus = HMAC-SHA256(PALAUTE_AVAIN, "h|k") heksana, 24 merkkiä
// (sama kuin alerts/notify.js sign). Vain hälytysajon itse allekirjoittamat
// tunnisteet kelpaavat -> lokiin ei voi kirjoittaa vapaasti. Hyväksytty
// palaute käynnistää työnkulun palaute.yml (workflow_dispatch), joka kirjaa
// sen lokihaaraan (PALAUTE.md). Ei henkilötietoja: vain pekka/opas.
export const ID_RE = /^(testi-[a-z0-9-]{1,40}|\d{8}T\d{4}-[a-z0-9_]{2,30}-(now|coming|tonight))$/;
export const ANSWERS = new Set(['nakyi', 'ei', 'pilvessa']);
export const WHO = new Set(['pekka', 'opas']);

export async function sign(key, text){
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
async function verify(key, text, sig){
  if(!key || typeof sig !== 'string' || sig.length !== 24) return false;
  const want = await sign(key, text);
  let d = 0; for(let i = 0; i < 24; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i);
  return d === 0;
}

const text = (status, body) => new Response(body, {status, headers: {'Content-Type': 'text/plain; charset=utf-8'}});

// dispatch(inputs) -> Promise<{ok, msg}> käynnistää palaute.yml:n (index.js).
export async function handlePalaute(request, env, dispatch){
  const url = new URL(request.url);
  if(url.pathname !== '/palaute') return text(404, 'Ei löydy');
  if(request.method !== 'POST' && request.method !== 'GET') return text(405, 'Vain POST');
  const h = url.searchParams.get('h') || '', v = url.searchParams.get('v') || '', k = url.searchParams.get('k') || '', s = url.searchParams.get('s') || '';
  if(!ID_RE.test(h) || !ANSWERS.has(v) || !WHO.has(k)) return text(400, 'Virheellinen palaute');
  if(!env.PALAUTE_AVAIN){ console.error('PALAUTE_AVAIN puuttuu (Workerin salaisuus, OHJE-ntfy.md)'); return text(503, 'Palautetta ei voi nyt tallentaa'); }
  if(!(await verify(env.PALAUTE_AVAIN, h + '|' + k, s))) return text(403, 'Tuntematon hälytys');
  const r = await dispatch({halytys: h, vastaus: v, kuka: k});
  console.log('palaute ' + h + ' ' + v + ' ' + k + ': ' + r.msg);
  return r.ok ? text(200, 'Kiitos! Palaute tallennetaan.') : text(502, 'Palautteen tallennus epäonnistui, yritä myöhemmin');
}
