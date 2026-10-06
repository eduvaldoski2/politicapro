(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const APURACAO = 'https://eduvaldoski2.github.io/apuracao-4013/';
const CARGO = {1:'Presidente',3:'Governador',5:'Senador',6:'Deputado federal',7:'Deputado estadual',11:'Prefeito',13:'Vereador'};
const CURTO = {1:'Presidente',3:'Governador',5:'Senador',6:'Dep. federal',7:'Dep. estadual',11:'Prefeito',13:'Vereador'};
const MUN = new Set([11, 13]);
const fmt = n => Number(n).toLocaleString('pt-BR');
const pct = (v, t) => t ? (v / t * 100).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '%' : '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const store = {
  get(k, d) { try { const v = localStorage.getItem('pp.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pp.' + k, JSON.stringify(v)); } catch (e) {} }
};
const ICON = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  analisar: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  comparar: '<path d="M7 4v16M17 4v16M3 9l4-4 4 4M13 15l4 4 4-4"/>',
  campanha: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  mapas: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  relatorios: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const NAV = [['/', 'Início', 'inicio'], ['/buscar', 'Buscar', 'buscar'], ['/analisar', 'Analisar', 'analisar'], ['/comparar', 'Comparar', 'comparar'], ['/campanha', 'Campanha', 'campanha']];

// ---------- dados ----------
let DB = null, IDX = null, loading = null;
function carregar() {
  if (DB) return Promise.resolve(DB);
  if (!loading) loading = fetch('data/cap_busca.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(d => {
    DB = d;
    IDX = d.p.map(p => {
      const nome = norm(p[1]); const toks = nome.split(' ');
      const sig = [...new Set(p[2].map(e => norm(e[3])))]; const nrs = [...new Set(p[2].map(e => String(e[2])))];
      const pop = Math.max(...p[2].map(e => e[7] || 0));
      return {p, nome, toks, sig, nrs, pop, anos: new Set(p[2].map(e => e[0])), cargos: new Set(p[2].map(e => e[1]))};
    });
    return d;
  });
  return loading;
}
// distância de edição limitada (Damerau simplificada)
function dist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length, n = b.length; let prev = Array.from({length: n + 1}, (_, j) => j), prev2 = null;
  for (let i = 1; i <= m; i++) {
    const cur = [i]; let min = i;
    for (let j = 1; j <= n; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if (v < min) min = v;
    }
    if (min > max) return max + 1; prev2 = prev; prev = cur;
  }
  return prev[n];
}
function pontoToken(q, it) {
  let best = 0;
  if (/^\d+$/.test(q)) { for (const nr of it.nrs) { if (nr === q) best = Math.max(best, 3); else if (nr.startsWith(q)) best = Math.max(best, 1.5); } return best; }
  for (const t of it.toks) {
    if (t === q) best = Math.max(best, 3);
    else if (t.startsWith(q)) best = Math.max(best, 2.2);
    else if (q.length >= 3 && t.includes(q)) best = Math.max(best, 1.2);
    else if (q.length >= 4) { const mx = q.length >= 7 ? 2 : 1; const d = Math.min(dist(q, t, mx), dist(q, t.slice(0, q.length), mx)); if (d <= mx) best = Math.max(best, 1.6 - d * .3); }
  }
  for (const s of it.sig) if (s === q) best = Math.max(best, 2);
  return best;
}
function buscar(q, f) {
  const qs = norm(q).split(' ').filter(Boolean); if (!qs.length) return [];
  const out = [];
  for (const it of IDX) {
    if (f.ano && !it.anos.has(f.ano)) continue;
    if (f.cargo && !it.cargos.has(f.cargo)) continue;
    let tot = 0, ok = true;
    for (const t of qs) { const s = pontoToken(t, it); if (!s) { ok = false; break; } tot += s; }
    if (ok) out.push([tot + Math.log10(it.pop + 10) * .15, it]);
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, 40).map(x => x[1]);
}
const sitClasse = s => /^NÃO/.test(s) ? 'no' : /^ELEITO/.test(s) ? 'ok' : /SUPLENTE/.test(s) ? 'sup' : /2º TURNO/.test(s) ? 'seg' : '';
const sitTexto = s => s === '2º TURNO' ? 'Foi ao 2º turno' : (s.charAt(0) + s.slice(1).toLowerCase()).replace(/ qp$/, ' QP');
const COR = ['#5b3fa8','#2f7fb8','#2fa84f','#c9830a','#c0392b','#8a4fb3','#0e8a7d','#4a6fd0'];
const cor = id => COR[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COR.length];
const ini = n => n.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join('').toUpperCase() || n[0];
const destaque = (txt, q) => { let h = esc(txt); for (const t of norm(q).split(' ').filter(x => x.length > 1 && !/^\d+$/.test(x))) { const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'); const base = txt.normalize('NFD').replace(/[̀-ͯ]/g, ''); const m = re.exec(base); if (m) { h = esc(txt.slice(0, m.index)) + '<mark>' + esc(txt.slice(m.index, m.index + m[0].length)) + '</mark>' + esc(txt.slice(m.index + m[0].length)); } } return h; };

// ---------- telas ----------
const main = $('#main');
function aviso(msg) { main.innerHTML = `<div class="err" role="alert">${esc(msg)}</div>`; }
function itemRes(it, q) {
  const p = it.p, ult = p[2][p[2].length - 1], sigs = [...new Set(p[2].map(e => e[3]))].join(', ');
  const anos = [...it.anos].sort(); const elei = p[2].filter(e => sitClasse(e[6]) === 'ok').length;
  return `<li><a class="card" href="#/pessoa/${p[0]}"><span class="av" style="--c:${cor(p[0])}" aria-hidden="true">${esc(ini(p[1]))}</span><span><span class="nm">${destaque(p[1], q)}</span><span class="sub">${esc(sigs)} · ${anos.length} eleiç${anos.length > 1 ? 'ões' : 'ão'} (${anos[0]}${anos.length > 1 ? '–' + anos[anos.length - 1] : ''})${elei ? ' · eleito' + (elei > 1 ? ' ' + elei + '×' : '') : ''}</span></span><span class="vt">${fmt(ult[7])}<small>${ult[0]} · ${esc(CURTO[ult[1]])}</small></span></a></li>`;
}
function telaInicio() {
  const rec = store.get('rec', []);
  main.innerHTML = `<section class="hero"><div class="hero-card"><img class="hero-img" src="logo.png" alt="POLÍTICApro" width="900" height="380"></div>
<h1>Resultados eleitorais, <span class="grad">cruzados e prontos</span> para decidir.</h1>
<p class="lead">Busque qualquer candidatura, veja a carreira eleitoral e compare eleições. Dados do TSE de 2018 a 2026.</p>
<form class="sb" role="search" id="fInicio"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="qInicio" type="search" placeholder="Nome, número ou partido" autocomplete="off" aria-label="Buscar candidatura"></form></section>
${rec.length ? `<h2>Vistos recentemente</h2><div class="rec">${rec.map(r => `<a href="#/pessoa/${esc(r[0])}">${esc(r[1])}</a>`).join('')}</div>` : ''}
<h2>Módulos</h2>
<div class="mods">
<a class="card mod" href="#/buscar">${svg('buscar')}<b>Buscar</b><span class="d">Qualquer candidatura em todas as eleições, com tolerância a erro de digitação.</span><span class="chip ok">Disponível</span></a>
<a class="card mod" href="#/analisar">${svg('analisar')}<b>Analisar</b><span class="d">Ranking completo por eleição e cargo, com situação de cada candidatura.</span><span class="chip ok">Disponível</span></a>
<a class="card mod" href="#/comparar">${svg('comparar')}<b>Comparar</b><span class="d">Cruzar candidaturas de anos e cargos diferentes, com variação.</span><span class="chip soon">Fase 2</span></a>
<a class="card mod" href="#/campanha">${svg('campanha')}<b>Campanha</b><span class="d">Apuração ao vivo, evolução e comparação com eleições anteriores.</span><span class="chip ok">Disponível</span></a>
<a class="card mod" href="#/analisar">${svg('mapas')}<b>Mapas</b><span class="d">Calor e pizza por município e bairro.</span><span class="chip soon">Fase 4</span></a>
<a class="card mod" href="#/analisar">${svg('relatorios')}<b>Relatórios</b><span class="d">PDF e Excel com a marca da campanha.</span><span class="chip soon">Fase 3</span></a>
</div>
<h2>Base de dados</h2><div class="card pad base" id="base"><div><b>…</b><span>pessoas</span></div><div><b>…</b><span>candidaturas</span></div><div><b>5</b><span>eleições (2018–2026)</span></div></div>
<p class="aviso">Cobertura atual: Rio de Janeiro (estado e capital). Outros estados entram em fases seguintes.</p>`;
  const f = $('#fInicio'); f.addEventListener('submit', e => { e.preventDefault(); const q = $('#qInicio').value.trim(); location.hash = '#/buscar/' + encodeURIComponent(q); });
  carregar().then(() => { const b = $('#base'); if (b) b.innerHTML = `<div><b>${fmt(DB.p.length)}</b><span>pessoas</span></div><div><b>${fmt(DB.p.reduce((a, p) => a + p[2].length, 0))}</b><span>candidaturas</span></div><div><b>5</b><span>eleições (2018–2026)</span></div>`; }).catch(() => {});
}
function telaBuscar(q0) {
  const f = {ano: 0, cargo: 0}; const anos = [2018, 2020, 2022, 2024, 2026];
  main.innerHTML = `<h1>Buscar</h1><p class="lead">Digite parte do nome, o número ou o partido. Pode errar uma letra que a gente acha.</p>
<form class="sb" role="search" id="fB"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="qB" type="search" placeholder="Ex.: tatiana roque, 4013, psb" autocomplete="off" aria-label="Buscar candidatura" value="${esc(q0)}"></form>
<div class="filtros" id="flA" role="group" aria-label="Filtrar por ano"></div><div class="filtros" id="flC" role="group" aria-label="Filtrar por cargo"></div>
<div id="out" aria-live="polite"><p class="vazio">Carregando a base…</p></div>`;
  const chips = () => {
    $('#flA').innerHTML = [['Todos os anos', 0], ...anos.map(a => [String(a), a])].map(([t, v]) => `<button type="button" class="fl" data-a="${v}" aria-pressed="${f.ano === v}">${t}</button>`).join('');
    $('#flC').innerHTML = [['Todos os cargos', 0], ...Object.entries(CURTO).map(([k, t]) => [t, +k])].map(([t, v]) => `<button type="button" class="fl" data-c="${v}" aria-pressed="${f.cargo === v}">${t}</button>`).join('');
  };
  const rodar = () => {
    const q = $('#qB').value, out = $('#out'); if (!IDX) return;
    if (!q.trim()) { out.innerHTML = '<p class="vazio">Comece digitando um nome ou número.</p>'; return; }
    const r = buscar(q, f);
    out.innerHTML = r.length ? `<ul class="res">${r.map(it => itemRes(it, q)).join('')}</ul>${r.length === 40 ? '<p class="aviso">Mostrando os 40 primeiros. Refine a busca ou use os filtros.</p>' : ''}` : '<p class="vazio">Nenhuma candidatura encontrada. Tente menos letras ou tire um filtro.</p>';
  };
  chips();
  let t; $('#qB').addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { history.replaceState(null, '', '#/buscar/' + encodeURIComponent($('#qB').value)); rodar(); }, 120); });
  $('#fB').addEventListener('submit', e => e.preventDefault());
  main.addEventListener('click', e => { const b = e.target.closest('.fl'); if (!b) return; if (b.dataset.a !== undefined) f.ano = +b.dataset.a; else f.cargo = +b.dataset.c; chips(); rodar(); });
  carregar().then(() => { rodar(); }).catch(e => aviso('Não foi possível carregar a base de dados (' + e.message + ').'));
  if (!q0) setTimeout(() => { const i = $('#qB'); if (i) i.focus(); }, 50);
}
function telaPessoa(id) {
  main.innerHTML = '<p class="vazio">Carregando…</p>';
  carregar().then(() => {
    const it = IDX.find(x => x.p[0] === id); if (!it) { main.innerHTML = '<div class="card pad"><h1>Pessoa não encontrada</h1><p class="lead">Esse perfil não existe na base.</p><a class="btn pri" href="#/buscar">Buscar de novo</a></div>'; return; }
    const p = it.p, es = p[2].slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const rec = store.get('rec', []).filter(r => r[0] !== id); rec.unshift([id, p[1]]); store.set('rec', rec.slice(0, 6));
    const vc = e => e[5], val = e => (DB.val[e[0]] || {})[e[1]] || 0;
    const maior = es.reduce((m, e) => vc(e) > vc(m) ? e : m, es[0]);
    const eleitoN = es.filter(e => sitClasse(e[6]) === 'ok').length;
    const max = Math.max(...es.map(vc));
    const sigs = [...new Set(es.map(e => e[3]))];
    const cmp = store.get('cmp', []); const noCmp = cmp.includes(id);
    main.innerHTML = `<a class="sub" href="#/buscar" style="text-decoration:none">← Buscar</a>
<div class="ph"><span class="av" style="--c:${cor(id)}" aria-hidden="true">${esc(ini(p[1]))}</span><div><h1>${esc(p[1])}</h1><span class="sub">${esc(sigs.join(' · '))} · ${es.length} candidatura${es.length > 1 ? 's' : ''}</span></div></div>
<div class="kpis"><div class="card kpi"><b>${es.length}</b><span>candidaturas</span></div><div class="card kpi"><b>${eleitoN}</b><span>${eleitoN === 1 ? 'vez eleito(a)' : 'vezes eleito(a)'}</span></div><div class="card kpi"><b>${fmt(vc(maior))}</b><span>maior votação na capital (${maior[0]})</span></div></div>
<div class="acoes"><button class="btn" id="bCmp">${noCmp ? '✓ No comparativo' : '+ Adicionar ao comparativo'}</button><button class="btn" id="bShare">Compartilhar</button><button class="btn" id="bPdf">Salvar PDF</button></div>
<h2>Votos na capital, por candidatura</h2>
<div class="card barras">${es.map(e => `<div class="br"><span>${e[0]} · ${esc(CURTO[e[1]])}</span><span class="tr"><i style="width:${Math.max(2, vc(e) / max * 100)}%"></i></span><b>${fmt(vc(e))}</b></div>`).join('')}</div>
<h2>Carreira eleitoral</h2>
<div class="carr">${es.map(e => { const mun = MUN.has(e[1]); const cl = sitClasse(e[6]); return `<article class="card cd"><div class="l1"><span>${e[0]} · ${esc(CARGO[e[1]])}</span><span class="chip ${cl}">${esc(sitTexto(e[6]))}</span></div>
<div class="big">${fmt(vc(e))}<small>${pct(vc(e), val(e))} dos válidos na capital</small></div>
<div class="l3">${mun ? 'Votação no município do Rio de Janeiro' : 'No estado (RJ): <b>' + fmt(e[7]) + '</b> votos'} · ${e[3]} ${e[2]}</div></article>`; }).join('')}</div>
<p class="aviso">Votos e % referentes à cidade do Rio de Janeiro; cargos estaduais e federais mostram também o total no estado. Fonte: TSE.</p>`;
    $('#bCmp').onclick = () => { let c = store.get('cmp', []); c = c.includes(id) ? c.filter(x => x !== id) : [...c, id]; store.set('cmp', c); $('#bCmp').textContent = c.includes(id) ? '✓ No comparativo' : '+ Adicionar ao comparativo'; };
    $('#bShare').onclick = async () => { const u = location.href; try { if (navigator.share) await navigator.share({title: p[1] + ' · POLITICApro', url: u}); else { await navigator.clipboard.writeText(u); $('#bShare').textContent = 'Link copiado'; } } catch (e) {} };
    $('#bPdf').onclick = () => window.print();
    document.title = p[1] + ' · POLITICApro';
  }).catch(e => aviso('Não foi possível carregar a base de dados (' + e.message + ').'));
}

// ---------- Analisar: ranking por eleição e cargo ----------
const EL = {}; let MUNN = null;
const cargarEl = a => EL[a] ? Promise.resolve(EL[a]) : fetch('data/e' + a + '.json').then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(d => (EL[a] = d));
const cargarMun = () => MUNN ? Promise.resolve(MUNN) : fetch('data/mun.json').then(r => r.json()).then(d => (MUNN = d));
function telaAnalisar(ano, c, t, ue, mais) {
  const anos = [2026, 2024, 2022, 2020, 2018];
  ano = +ano || 2026; mais = +mais || 60;
  main.innerHTML = `<h1>Analisar</h1><p class="lead">Escolha a eleição e o cargo para ver o ranking completo com a situação de cada candidatura.</p>
<div class="filtros" id="aA" role="group" aria-label="Eleição">${anos.map(a => `<button type="button" class="fl" data-a="${a}" aria-pressed="${a === ano}">${a}</button>`).join('')}</div>
<div class="filtros" id="aC" role="group" aria-label="Cargo"></div><div id="aM"></div><div id="aR" aria-live="polite"><p class="vazio">Carregando…</p></div>`;
  $('#aA').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) location.hash = '#/analisar/' + b.dataset.a; });
  Promise.all([cargarEl(ano), cargarMun(), carregar()]).then(([E]) => {
    const cs = E.cargos.map(x => ({...x, k: x.c + '-' + x.t}));
    const cur = cs.find(x => x.c === +c && x.t === +t) || cs[0];
    $('#aC').innerHTML = cs.map(x => `<button type="button" class="fl" data-k="${x.c}/${x.t}" aria-pressed="${x === cur}">${esc(x.n)}${x.t === 2 ? ' · 2º turno' : ''}</button>`).join('');
    $('#aC').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) location.hash = '#/analisar/' + ano + '/' + b.dataset.k; });
    const mun = MUN.has(cur.c);
    let lista = E.cands.filter(x => x[0] === cur.c && x[1] === cur.t);
    let rotulo = 'RJ';
    if (mun) {
      const ues = [...new Set(lista.map(x => x[2]))].sort((a, b) => (MUNN[a] || a).localeCompare(MUNN[b] || b, 'pt-BR'));
      ue = ue && ues.includes(ue) ? ue : (ues.includes('60011') ? '60011' : ues[0]);
      $('#aM').innerHTML = `<label class="sub" for="selM">Município</label><select class="sel" id="selM">${ues.map(u => `<option value="${u}"${u === ue ? ' selected' : ''}>${esc(MUNN[u] || u)}</option>`).join('')}</select>`;
      $('#selM').onchange = e => { location.hash = '#/analisar/' + ano + '/' + cur.c + '/' + cur.t + '/' + e.target.value; };
      lista = lista.filter(x => x[2] === ue); rotulo = MUNN[ue] || ue;
    }
    lista.sort((a, b) => b[8] - a[8]);
    const nom = lista.reduce((s, x) => s + x[8], 0); const base = !mun && cur.tv ? cur.tv : nom; const baseT = !mun && cur.tv ? 'dos válidos' : (cur.c === 13 ? 'nominais' : 'dos válidos');
    const eleitos = lista.filter(x => sitClasse(x[6]) === 'ok').length;
    const pids = new Set(IDX.map(x => x.p[0]));
    const quem = (x, i) => { const cl = sitClasse(x[6]); const lk = pids.has(x[7]);
      const inner = `<span class="pos">${i + 1}º</span><span><span class="nm">${esc(x[4])}</span><span class="sub">${esc(x[5])} · ${x[3]} <span class="chip ${cl}" style="margin-left:4px">${esc(sitTexto(x[6]))}</span></span></span><span class="vt">${fmt(x[8])}<small>${pct(x[8], base)}</small></span>`;
      return `<li>${lk ? `<a class="card" href="#/pessoa/${x[7]}">${inner}</a>` : `<div class="card r">${inner}</div>`}</li>`; };
    $('#aR').innerHTML = `<h2>${esc(cur.n)}${cur.t === 2 ? ' · 2º turno' : ''} · ${esc(rotulo)} · ${ano}</h2>
<div class="resumo"><div class="card kpi"><b>${fmt(lista.length)}</b><span>candidaturas</span></div><div class="card kpi"><b>${fmt(eleitos)}</b><span>eleitos</span></div><div class="card kpi"><b>${fmt(base)}</b><span>votos ${baseT}</span></div></div>
<form class="sb" role="search" id="fA"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="qA" type="search" placeholder="Filtrar por nome, número ou partido" autocomplete="off" aria-label="Filtrar ranking"></form>
<ol class="rk" id="rk" style="padding:0"></ol><button class="btn mais" id="bMais" hidden>Mostrar mais</button>
<p class="aviso">Ranking do Rio de Janeiro (${ano}). Votos nominais dos candidatos; fonte: TSE. Candidaturas com perfil na busca abrem a carreira eleitoral.</p>`;
    let n = mais, q = '';
    const pinta = () => { const f = q ? lista.map((x, i) => [x, i]).filter(([x]) => norm(x[4] + ' ' + x[5] + ' ' + x[3]).includes(norm(q))) : lista.map((x, i) => [x, i]);
      $('#rk').innerHTML = f.slice(0, n).map(([x, i]) => quem(x, i)).join('') || '<li class="vazio">Nada encontrado.</li>'; $('#bMais').hidden = f.length <= n; };
    $('#fA').addEventListener('submit', e => e.preventDefault());
    $('#qA').addEventListener('input', e => { q = e.target.value; n = 60; pinta(); });
    $('#bMais').onclick = () => { n += 100; pinta(); };
    pinta();
  }).catch(e => aviso('Não foi possível carregar os dados (' + e.message + ').'));
}
function telaFase(t, fase, itens, extra) {
  main.innerHTML = `<div class="card fase"><span class="chip soon">${fase}</span><h1 style="margin-top:10px">${t}</h1><p class="lead">Esta parte está no roteiro e ainda não foi construída.</p><ul>${itens.map(i => `<li>${i}</li>`).join('')}</ul>${extra || ''}</div>`;
}
function telaComparar() {
  const cmp = store.get('cmp', []);
  telaFase('Comparar', 'Fase 2', ['Cruzar candidaturas de anos e cargos diferentes, sem limite', 'Votos, % e variação entre eleições, por região e bairro', 'Gráficos e mapa'], '<div id="cmpl"></div><p class="aviso">Enquanto isso, o cruzamento da capital já funciona no sistema de apuração.</p><div class="acoes"><a class="btn pri" href="' + APURACAO + '" target="_blank" rel="noopener">Abrir o Cruzamento atual</a></div>');
  if (cmp.length) carregar().then(() => { const l = $('#cmpl'); if (!l) return; l.innerHTML = '<h2>Selecionados para comparar</h2><div class="rec">' + cmp.map(id => { const it = IDX.find(x => x.p[0] === id); return it ? `<a href="#/pessoa/${id}">${esc(it.p[1])}</a>` : ''; }).join('') + '</div>'; });
}
function telaCampanha() {
  main.innerHTML = `<div class="card fase"><span class="chip ok">Disponível</span><h1 style="margin-top:10px">Campanha: apuração ao vivo</h1><p class="lead">O sistema de apuração da Tatiana Roque (PSB 4013) continua no ar na sua própria URL, sem nenhuma alteração. No POLITICApro ele vira um módulo próprio na Fase 3.</p><div class="acoes"><a class="btn pri" href="${APURACAO}" target="_blank" rel="noopener">Abrir o sistema de apuração</a></div></div>`;
}
const ROTAS = [
  [/^\/$/, telaInicio, 'Início'],
  [/^\/buscar(?:\/(.*))?$/, m => telaBuscar(decodeURIComponent(m[1] || '')), 'Buscar'],
  [/^\/pessoa\/([a-f0-9]+)$/, m => telaPessoa(m[1]), 'Perfil'],
  [/^\/analisar(?:\/(\d{4}))?(?:\/(\d+)\/(\d))?(?:\/(\d+))?$/, m => telaAnalisar(m[1], m[2], m[3], m[4]), 'Analisar'],
  [/^\/comparar$/, telaComparar, 'Comparar'],
  [/^\/campanha$/, telaCampanha, 'Campanha']
];
function rota() {
  const h = (location.hash || '#/').slice(1) || '/'; let achou = false;
  for (const [re, fn, tit] of ROTAS) { const m = re.exec(h); if (m) { document.title = tit + ' · POLITICApro'; fn(m); achou = true; break; } }
  if (!achou) telaInicio();
  const base = '/' + (h.split('/')[1] || ''); const ativo = base === '/pessoa' ? '/buscar' : base;
  document.querySelectorAll('#nav a').forEach(a => a.removeAttribute('aria-current'));
  const a = document.querySelector(`#nav a[data-r="${ativo}"]`); if (a) a.setAttribute('aria-current', 'page');
  window.scrollTo(0, 0);
}
$('#nav').innerHTML = NAV.map(([r, t, i]) => `<a href="#${r}" data-r="${r === '/' ? '/' : r}">${svg(i)}<span>${t}</span></a>`).join('');
$('#tema').onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'); const n = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; store.set('tema', n); };
{ const t = store.get('tema', null); if (t) document.documentElement.dataset.theme = t; }
addEventListener('hashchange', rota); rota();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
