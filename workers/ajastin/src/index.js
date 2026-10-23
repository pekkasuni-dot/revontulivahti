// AuroraAwesome-ajastin (Cloudflare Worker, 2026-10-23).
// GitHub Actionsin oma ajastus (schedule) toteutui vain 3-5 h välein (ks.
// MUISTIO-halytykset.md "Ajastusten harvuus"). Tämä Worker herää 5 min
// välein (wrangler.toml crons) ja käynnistää kunkin työnkulun omalla
// välillään (schedule.js) GitHubin workflow_dispatch-kutsulla.
//
// Salaisuus GH_DISPATCH_TOKEN (fine-grained PAT: vain tämä repo, vain
// Actions: Read and write) asetetaan Cloudflaren hallintapaneelissa, EI
// repoon eikä wrangler.toml:iin. Ks. OHJE-ajastin.md.
import {dueWorkflows, hasActiveRun} from './schedule.js';

const API = 'https://api.github.com';

async function gh(env, path, init = {}){
  return fetch(API + path, {...init, headers: {
    'Authorization': 'Bearer ' + env.GH_DISPATCH_TOKEN,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'auroraawesome-ajastin',
    ...(init.body ? {'Content-Type': 'application/json'} : {}),
  }});
}

// 401/403 = avainongelma (vanhentunut, peruttu, väärä oikeus) tai GitHubin
// käyttöraja (403 + x-ratelimit-remaining 0) -> selvä virherivi lokiin.
// Uusiminen: OHJE-ajastin.md "Avaimen uusiminen".
async function failure(r, wf, what){
  const body = (await r.text()).slice(0, 200);
  if(r.status === 401 || r.status === 403){
    const limited = r.headers.get('x-ratelimit-remaining') === '0';
    const msg = limited
      ? `GITHUB KÄYTTÖRAJA (${r.status}) - ${wf} ${what}, raja nollautuu ${new Date(1000 * r.headers.get('x-ratelimit-reset')).toISOString()}`
      : `GITHUB-AVAIN EI KELPAA (${r.status}) - avain vanhentunut, peruttu tai väärä oikeus. Uusi GH_DISPATCH_TOKEN (OHJE-ajastin.md "Avaimen uusiminen"). ${wf} ${what}: ${body}`;
    console.error(msg);
    return {msg, auth: !limited};
  }
  return {msg: `${wf}: ${what} epäonnistui ${r.status} ${body}`};
}

// Käynnistää yhden työnkulun, ellei sen edellinen ajo (main) ole kesken.
async function trigger(env, wf){
  const repo = env.GH_REPO, ref = env.GH_REF || 'main';
  const runs = await gh(env, `/repos/${repo}/actions/workflows/${wf}/runs?branch=${encodeURIComponent(ref)}&per_page=5`);
  if(!runs.ok) return (await failure(runs, wf, 'tilan haku')).msg;
  if(hasActiveRun(await runs.json())) return `${wf}: edellinen ajo kesken, ohitetaan`;
  const r = await gh(env, `/repos/${repo}/actions/workflows/${wf}/dispatches`, {method: 'POST', body: JSON.stringify({ref})});
  return r.status === 204 ? `${wf}: käynnistetty` : (await failure(r, wf, 'käynnistys')).msg;
}

export default {
  async scheduled(controller, env, ctx){
    const due = dueWorkflows(controller.scheduledTime);
    if(!due.length) return;
    if(!env.GH_DISPATCH_TOKEN){ console.error('GH_DISPATCH_TOKEN puuttuu (Workerin salaisuus) - ei käynnistetä: ' + due.join(', ')); return; }
    const res = await Promise.all(due.map(wf => trigger(env, wf).catch(e => `${wf}: virhe ${e.message}`)));
    console.log(new Date(controller.scheduledTime).toISOString() + ' ' + res.join(' | '));
  },
};
