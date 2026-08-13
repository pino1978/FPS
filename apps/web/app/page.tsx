'use client';

import { useEffect, useMemo, useState } from 'react';
import HistoryDashboard from './HistoryDashboard';
import MatchIntelligence from './MatchIntelligence';
import StatsDashboard from './StatsDashboard';
import SystemBuilderPanel, { type SystemPick } from './SystemBuilderPanel';

type Market = {
  market: string;
  selection: string;
  probability: number;
  confidence: number;
  dataQuality: number;
  fairOdds?: number | null;
  status: 'ACTIVE' | 'NO_BET';
  reason?: string;
  period?: 'FT' | 'HT';
  metric?: string;
  operator?: string;
  threshold?: number;
  outcome?: string;
};
type Fixture = {
  id: string;
  utcDate: string;
  status?: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
};
type Row = { fixture: Fixture; markets: Market[]; expectedGoalsHome?: number | null; expectedGoalsAway?: number | null };
type Pick = SystemPick;
type Tab = 'Pronostici' | 'Partite' | 'Sistemi' | 'I miei sistemi' | 'Storico' | 'Statistiche';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const json = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `${response.status} ${response.statusText}`);
  return body;
};
const post = (url: string, body: unknown) => json(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bag, setBag] = useState<Pick[]>([]);
  const [tab, setTab] = useState<Tab>('Pronostici');
  const [detail, setDetail] = useState<Row | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    void json(`${API}/v2/predictions?competition=SA&persist=true`)
      .then((x) => setRows(x.data || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const available = useMemo(
    () => rows.flatMap((row) => featured(row).filter((market) => market.status === 'ACTIVE').map((market) => toPick(row, market))),
    [rows],
  );
  const addPick = (pick: Pick) => setBag((current) => current.some((x) => x.id === pick.id) ? current : [...current, pick]);
  const add = (row: Row, market: Market) => addPick(toPick(row, market));

  const tabs: Tab[] = ['Pronostici', 'Partite', 'Sistemi', 'I miei sistemi', 'Storico', 'Statistiche'];
  return <div className="shell">
    <nav className="side" aria-label="Navigazione principale">
      <div className="brand">F<span>FORESIGHT</span></div>
      {tabs.map((name) => <button key={name} className={tab === name ? 'on' : ''} onClick={() => { setTab(name); setDetail(null); }}>{name}</button>)}
    </nav>

    <main>
      <header>
        <div><small>FOOTBALL INTELLIGENCE · DATI REALI</small><h1>{detail ? 'Dettaglio partita' : tab}</h1></div>
        <div className="headActions"><span className="live">● LIVE DATA</span>{detail && <button className="ghost" onClick={() => setDetail(null)}>← Indietro</button>}</div>
      </header>
      {detail ? <MatchDetail row={detail} bag={bag} add={add} addPick={addPick} /> : <>
        {tab === 'Pronostici' && <Predictions rows={rows} loading={loading} error={error} bag={bag} add={add} open={setDetail} retry={load} />}
        {tab === 'Partite' && <Matches rows={rows} open={setDetail} />}
        {tab === 'Sistemi' && <SystemBuilderPanel bag={bag} setBag={setBag} available={available} />}
        {tab === 'I miei sistemi' && <SavedSystems />}
        {tab === 'Storico' && <HistoryDashboard />}
        {tab === 'Statistiche' && <StatsDashboard />}
      </>}
    </main>

    <aside className="tray">
      <small>SYSTEM TRAY</small><h2>{bag.length} selezioni</h2>
      {bag.map((pick) => <div className="trayrow" key={pick.id}><span><b>{pick.selection}</b><small>{pick.market}{pick.fixed ? ' · FISSA' : ''}</small></span><button aria-label={`Rimuovi ${pick.selection}`} onClick={() => setBag((items) => items.filter((x) => x.id !== pick.id))}>×</button></div>)}
      {!bag.length && <p className="muted">Aggiungi un pick per costruire un sistema.</p>}
      <button className="primary" onClick={() => setTab('Sistemi')}>Crea sistema</button>
    </aside>
  </div>;
}

function Predictions({ rows, loading, error, bag, add, open, retry }: {
  rows: Row[]; loading: boolean; error: string; bag: Pick[];
  add: (row: Row, market: Market) => void; open: (row: Row) => void; retry: () => void;
}) {
  const active = rows.flatMap(featured).filter((market) => market.status === 'ACTIVE').length;
  if (loading) return <><section className="hero skeleton"><div><small>CARICAMENTO</small><h2>Analisi delle partite…</h2><p>Recupero fixture, classifiche e snapshot necessari.</p></div></section><div className="grid">{[1, 2, 3, 4].map((x) => <div className="card skeletonBox" key={x} />)}</div></>;
  return <>
    {error && <div className="notice"><b>Dati live non disponibili</b><span>{error}. Nessun valore viene sostituito con dati inventati.</span><button onClick={retry}>Riprova</button></div>}
    <section className="hero"><div><small>SERIE A · MODELLO VERSIONATO</small><h2>Probabilità, non certezze.</h2><p>Probability, Confidence, Data Quality e Value sono indicatori distinti. Se la qualità non basta, il risultato è NO_BET.</p></div><div className="score"><b>{active}</b><span>pick attivi</span></div></section>
    {!rows.length && !error ? <Empty title="Nessuna partita disponibile" text="Il provider non restituisce fixture per il periodo corrente." /> : <div className="grid">{rows.map((row) => <article className="card" key={row.fixture.id}>
      <div className="matchMeta"><small>{new Date(row.fixture.utcDate).toLocaleString('it-IT')}</small><span className="status">{row.fixture.status || 'SCHEDULED'}</span></div>
      <h3>{row.fixture.home.name} <em>—</em> {row.fixture.away.name}</h3>
      {featured(row).map((market) => <MarketRow key={`${market.market}-${market.selection}`} row={row} market={market} added={bag.some((pick) => pick.id === pickId(row.fixture.id, market))} add={add} />)}
      <button className="detailBtn" onClick={() => open(row)}>Analisi completa →</button>
    </article>)}</div>}
  </>;
}

function Matches({ rows, open }: { rows: Row[]; open: (row: Row) => void }) {
  return <div className="panel"><div className="sectionhead"><div><small>FIXTURE</small><h2>Partite</h2><p>Orari normalizzati e dati acquisiti dai provider gratuiti configurati.</p></div></div>{rows.length ? rows.map((row) => <button className="matchLine" key={row.fixture.id} onClick={() => open(row)}><span><b>{row.fixture.home.name} — {row.fixture.away.name}</b><small>{new Date(row.fixture.utcDate).toLocaleString('it-IT')}</small></span><span>Dettaglio →</span></button>) : <Empty title="Nessuna fixture" text="Avvia l’ingestion o riprova più tardi." />}</div>;
}

function MatchDetail({ row, bag, add, addPick }: { row: Row; bag: Pick[]; add: (row: Row, market: Market) => void; addPick: (pick: Pick) => void }) {
  const [category, setCategory] = useState('Esito');
  const [players, setPlayers] = useState<any[] | null>(null);
  const [playerError, setPlayerError] = useState('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [value, setValue] = useState<any[] | null>(null);
  const [valueSource, setValueSource] = useState('');
  const [valueReason, setValueReason] = useState('');
  const [loadingValue, setLoadingValue] = useState(false);
  const categories = ['Esito', 'Gol', 'Team', 'Risultati', 'Combinazioni', 'Marcatori', 'Value'];

  const loadPlayers = () => {
    setLoadingPlayers(true); setPlayerError('');
    void json(`${API}/player-markets?fixtureId=${encodeURIComponent(row.fixture.id)}&competition=SA`).then((x) => setPlayers(x.data || [])).catch((e) => setPlayerError(e.message)).finally(() => setLoadingPlayers(false));
  };
  const loadValue = () => {
    setLoadingValue(true); setValueReason('');
    void json(`${API}/v2/value?fixtureId=${encodeURIComponent(row.fixture.id)}&competition=SA`).then((x) => { setValue(x.data || []); setValueSource(x.source || 'UNAVAILABLE'); setValueReason(x.reason || ''); }).catch((e) => setValueReason(e.message)).finally(() => setLoadingValue(false));
  };
  const select = (name: string) => {
    setCategory(name);
    if (name === 'Marcatori' && players === null && !loadingPlayers) loadPlayers();
    if (name === 'Value' && value === null && !loadingValue) loadValue();
  };
  const shown = row.markets.filter((market) => marketCategory(market) === category);

  return <>
    <section className="hero detailHero"><div><small>{new Date(row.fixture.utcDate).toLocaleString('it-IT')} · {row.fixture.status || 'SCHEDULED'}</small><h2>{row.fixture.home.name} — {row.fixture.away.name}</h2><p>xG modello: {fmt(row.expectedGoalsHome)} — {fmt(row.expectedGoalsAway)}. Fair Odds derivano dal modello; Value/EV vengono mostrati solo con una quota bookmaker realmente disponibile.</p></div><div className="xg"><span>xG</span><b>{fmt(row.expectedGoalsHome)} : {fmt(row.expectedGoalsAway)}</b></div></section>
    <MatchIntelligence fixtureId={row.fixture.id} />
    <div className="tabs marketTabs">{categories.map((name) => <button className={category === name ? 'on' : ''} key={name} onClick={() => select(name)}>{name}</button>)}</div>
    <section className="panel"><div className="sectionhead"><div><small>{category.toUpperCase()}</small><h2>{category === 'Marcatori' ? 'Probabilità giocatore' : category === 'Value' ? 'Value & quote' : 'Mercati e probabilità'}</h2></div></div>
      {category === 'Marcatori' ? <PlayerMarkets row={row} players={players} loading={loadingPlayers} error={playerError} bag={bag} addPick={addPick} /> : category === 'Value' ? <ValueMarkets rows={value} source={valueSource} reason={valueReason} loading={loadingValue} /> : shown.length ? shown.map((market) => <MarketRow key={`${market.market}-${market.selection}`} row={row} market={market} added={bag.some((pick) => pick.id === pickId(row.fixture.id, market))} add={add} full />) : <Empty title="Mercato non disponibile" text="Nessun mercato di questa categoria è modellabile con i dati correnti." />}
    </section>
  </>;
}

function PlayerMarkets({ row, players, loading, error, bag, addPick }: { row: Row; players: any[] | null; loading: boolean; error: string; bag: Pick[]; addPick: (pick: Pick) => void }) {
  if (loading) return <p className="muted">Caricamento lineup, indisponibili e marcatori…</p>;
  if (error) return <div className="notice"><b>Mercato non disponibile</b><span>{error}</span></div>;
  if (!players?.length) return <Empty title="NO_BET giocatori" text="Lineup o dati giocatore non sufficienti per una prediction affidabile." />;
  return <>{players.map((player) => {
    const pick: Pick = { id: `${row.fixture.id}|ANYTIME_SCORER|${player.playerId}`, fixtureId: row.fixture.id, market: 'ANYTIME_SCORER', selection: player.selection || `${player.playerName} segna`, eventAt: row.fixture.utcDate, probability: player.probability, confidence: player.confidence, dataQuality: player.dataQuality, fairOdds: player.fairOdds, period: 'FT', teamSide: player.teamSide, playerId: player.playerId };
    const added = bag.some((x) => x.id === pick.id);
    return <div className={'market ' + (player.status === 'NO_BET' ? 'off' : '')} key={player.playerId}><div><small>ANYTIME SCORER</small><strong>{player.playerName}</strong><span>Conf. {pct(player.confidence)} · DQ {pct(player.dataQuality)} · {player.playerImpact?.role || 'ruolo n/d'} · {player.playerImpact?.expectedMinutes ?? '—'} min attesi</span>{player.reason && <span>{player.reason}</span>}{player.status === 'ACTIVE' && <BetActions pick={pick} />}</div><b>{pct(player.probability)}</b><button aria-label={`Aggiungi ${player.playerName} segna`} disabled={player.status !== 'ACTIVE' || added} onClick={() => addPick(pick)}>{added ? '✓' : '+'}</button></div>;
  })}</>;
}

function ValueMarkets({ rows, source, reason, loading }: { rows: any[] | null; source: string; reason: string; loading: boolean }) {
  if (loading) return <p className="muted">Recupero quote pre-match on-demand…</p>;
  if (!rows?.length) return <Empty title="Value non disponibile" text={reason || 'Nessuna quota gratuita disponibile per questa partita.'} />;
  return <>{reason && <div className="notice"><b>{source === 'UNAVAILABLE' ? 'QUOTE NON DISPONIBILI' : 'INFO QUOTE'}</b><span>{reason}</span></div>}{rows.map((row) => <div className="market" key={`${row.market}-${row.selection}`}><div><small>{row.market} · {row.bookmaker || 'NO BOOKMAKER'}</small><strong>{row.selection}</strong><span>Fair {row.fairOdds ? Number(row.fairOdds).toFixed(2) : '—'} · Offerta {row.offeredOdds ? Number(row.offeredOdds).toFixed(2) : '—'} · EV {row.expectedValue == null ? '—' : pct(row.expectedValue)}</span></div><b>{pct(row.probability)}</b><span className="valueBadge">{row.valueStatus}</span></div>)}</>;
}

function MarketRow({ row, market, added, add, full = false }: { row: Row; market: Market; added: boolean; add: (row: Row, market: Market) => void; full?: boolean }) {
  const pick = toPick(row, market);
  return <div className={'market ' + (market.status === 'NO_BET' ? 'off' : '')}><div><small>{market.market}</small><strong>{market.selection}</strong><span>Confidence {pct(market.confidence)} · Data Quality {pct(market.dataQuality)}{full && market.fairOdds ? ` · Fair ${market.fairOdds.toFixed(2)}` : ''}</span>{market.reason && <span>{market.reason}</span>}{full && market.status === 'ACTIVE' && <BetActions pick={pick} />}</div><b>{pct(market.probability)}</b><button aria-label={`Aggiungi ${market.selection}`} disabled={market.status !== 'ACTIVE' || added} onClick={() => add(row, market)}>{added ? '✓' : '+'}</button></div>;
}

function BetActions({ pick }: { pick: Pick }) {
  const [stake, setStake] = useState('5');
  const [odds, setOdds] = useState('');
  const [bookmaker, setBookmaker] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(mode: 'NOT_PLAYED' | 'PLAYED' | 'SIMULATED') {
    const stakeValue = Number(stake), oddsValue = Number(odds);
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) { setMessage('Inserisci uno stake valido.'); return; }
    if (mode !== 'NOT_PLAYED' && (!Number.isFinite(oddsValue) || oddsValue < 1.01)) { setMessage('Inserisci una quota di esecuzione valida per reale o paper.'); return; }
    setBusy(true); setMessage('');
    try {
      await post(`${API}/v2/history/bets`, { fixtureId: pick.fixtureId, competition: 'SA', market: pick.market, selection: pick.selection, stake: stakeValue, odds: mode === 'NOT_PLAYED' ? undefined : oddsValue, bookmaker: bookmaker.trim() || undefined, played: mode === 'PLAYED', simulated: mode === 'SIMULATED', eventAt: pick.eventAt });
      setMessage(mode === 'PLAYED' ? 'Singola registrata come realmente giocata.' : mode === 'SIMULATED' ? 'Singola registrata in paper trading.' : 'Prediction salvata come non giocata.');
    } catch (e: any) { setMessage(e.message); } finally { setBusy(false); }
  }
  return <details className="executionDetails singleExecution"><summary>Registra singola</summary><div className="form"><label>Stake €<input aria-label={`Stake ${pick.selection}`} type="number" min="0.1" step="0.1" value={stake} onChange={(e) => setStake(e.target.value)} /></label><label>Quota esecuzione<input aria-label={`Quota singola ${pick.selection}`} type="number" min="1.01" step="0.01" value={odds} onChange={(e) => setOdds(e.target.value)} placeholder="es. 1.85" /></label><label>Bookmaker<input value={bookmaker} onChange={(e) => setBookmaker(e.target.value)} placeholder="opzionale" /></label></div><div className="executionActions"><button disabled={busy} onClick={() => save('NOT_PLAYED')}>Salva</button><button disabled={busy} onClick={() => save('SIMULATED')}>Paper</button><button className="primary" disabled={busy} onClick={() => save('PLAYED')}>L’ho giocata</button></div>{message && <p className={message.includes('registrata') || message.includes('salvata') ? 'success' : 'notice'}>{message}</p>}</details>;
}

function SavedSystems() {
  const [items, setItems] = useState<any[]>([]);
  const [mode, setMode] = useState('');
  useEffect(() => { void json(`${API}/v2/history/systems${mode ? `?mode=${mode}` : ''}`).then(setItems).catch(() => setItems([])); }, [mode]);
  return <div className="panel"><div className="sectionhead"><div><small>PORTAFOGLIO</small><h2>I miei sistemi</h2></div><select className="compact" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Tutti</option><option value="PLAYED">Reali</option><option value="SIMULATED">Paper</option><option value="NOT_PLAYED">Non giocati</option></select></div>{items.length ? items.map((system) => <HistoryRow key={system.id} title={`${system.mode} · ${system.selections.length} selezioni · ${system.combinations.length} combinazioni`} meta={`${executionLabel(system)} · €${Number(system.totalCost).toFixed(2)}${system.payout == null ? '' : ` · payout €${Number(system.payout).toFixed(2)}`} · ${new Date(system.createdAt).toLocaleString('it-IT')}`} status={system.status} />) : <Empty title="Nessun sistema" text="I sistemi salvati appariranno qui." />}</div>;
}

function HistoryRow({ title, meta, status }: { title: string; meta: string; status: string }) {
  return <div className="history"><span><b>{title}</b><small>{meta}</small></span><strong className={`status status-${String(status).toLowerCase()}`}>{status}</strong></div>;
}
function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><b>{title}</b><span>{text}</span></div>; }
function featured(row: Row) {
  const choose = (filter: (market: Market) => boolean) => row.markets.filter(filter).sort((a, b) => b.probability - a.probability)[0];
  return [choose((market) => market.market === '1X2'), choose((market) => market.market === 'OVER_UNDER_2_5'), choose((market) => market.market === 'BTTS'), choose((market) => market.market.startsWith('HOME_GOALS_1_5') || market.market.startsWith('AWAY_GOALS_1_5'))].filter(Boolean) as Market[];
}
function marketCategory(market: Market) {
  if (['1X2', 'DOUBLE_CHANCE', 'DRAW_NO_BET', 'WIN_MARGIN'].includes(market.market)) return 'Esito';
  if (market.market.startsWith('OVER_UNDER') || ['BTTS', 'MULTIGOAL', 'GOALS_PARITY'].includes(market.market)) return 'Gol';
  if (market.market.startsWith('HOME_GOALS') || market.market.startsWith('AWAY_GOALS') || ['CLEAN_SHEET', 'WIN_TO_NIL'].includes(market.market)) return 'Team';
  if (market.market === 'EXACT_SCORE') return 'Risultati';
  if (market.market === 'COMBO') return 'Combinazioni';
  return 'Altro';
}
function pickId(fixtureId: string, market: Market) { return `${fixtureId}|${market.market}|${market.selection}`; }
function toPick(row: Row, market: Market): Pick { return { id: pickId(row.fixture.id, market), fixtureId: row.fixture.id, market: market.market, selection: market.selection, eventAt: row.fixture.utcDate, probability: market.probability, confidence: market.confidence, dataQuality: market.dataQuality, fairOdds: market.fairOdds, period: market.period, metric: market.metric, operator: market.operator, threshold: market.threshold, outcome: market.outcome }; }
function pct(value: any) { return value == null ? '—' : `${Math.round(Number(value) * 100)}%`; }
function fmt(value: any) { return value == null ? '—' : Number(value).toFixed(2); }
function executionLabel(value: any) { return value.played ? 'REALE' : value.simulated ? 'PAPER' : 'NON GIOCATO'; }
