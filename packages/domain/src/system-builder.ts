import { combinations, compatibility, correlation, Selection } from './index';

export type SystemProfile = 'PRUDENT' | 'BALANCED' | 'AGGRESSIVE';

export type AssistedSystemInput = {
  selections: Selection[];
  minCorrect: number;
  budget: number;
  fixedIds?: string[];
  profile?: SystemProfile;
};

function validateFixed(selections: Selection[], fixedIds: string[]) {
  const unique = [...new Set(fixedIds)];
  const fixed = unique.map((id) => selections.find((selection) => selection.id === id)).filter(Boolean) as Selection[];
  if (fixed.length !== unique.length) return { ok: false as const, reason: 'Una o più selezioni fisse non esistono' };
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
    if (compatibility(fixed[i], fixed[j]) === 'INCOMPATIBLE') return { ok: false as const, reason: 'Le selezioni fisse contengono un conflitto logico' };
  }
  return { ok: true as const, fixed };
}

export function buildSystemWithFixed(selections: Selection[], k: number, stake: number, fixedIds: string[] = []) {
  if (!Number.isInteger(k) || k < 1 || k > selections.length) return { status: 'INVALID' as const, reason: 'Dimensione combinazione non valida', combinations: [], cost: 0 };
  if (!Number.isFinite(stake) || stake <= 0) return { status: 'INVALID' as const, reason: 'Stake non valido', combinations: [], cost: 0 };
  const checked = validateFixed(selections, fixedIds);
  if (!checked.ok) return { status: 'INCOMPATIBLE' as const, reason: checked.reason, combinations: [], cost: 0 };
  if (checked.fixed.length > k) return { status: 'INVALID' as const, reason: 'Il numero di fisse non può superare la dimensione della combinazione', combinations: [], cost: 0 };

  const fixedSet = new Set(checked.fixed.map((selection) => selection.id));
  const variable = selections.filter((selection) => !fixedSet.has(selection.id));
  const choose = k - checked.fixed.length;
  const candidate = combinations(variable, choose).map((combo) => [...checked.fixed, ...combo]);
  const invalid: Array<[string, string]> = [];
  const valid = candidate.filter((combo) => combo.every((a, index) => combo.slice(index + 1).every((b) => {
    const ok = compatibility(a, b) === 'COMPATIBLE';
    if (!ok) invalid.push([a.id, b.id]);
    return ok;
  })));
  if (!valid.length) return { status: 'INCOMPATIBLE' as const, reason: 'Nessuna combinazione logicamente compatibile', combinations: [], invalid, cost: 0 };
  return {
    status: 'OK' as const,
    k,
    fixedIds: [...fixedSet],
    combinations: valid,
    invalid,
    stake,
    cost: Number((valid.length * stake).toFixed(2)),
    coverage: {
      explanation: fixedSet.size
        ? `Ogni combinazione contiene ${fixedSet.size} fisse e ${choose} selezioni variabili.`
        : `Sono sviluppate tutte le combinazioni di ${k} selezioni tra le ${selections.length} disponibili.`,
      guarantee: 'Copertura combinatoria: non equivale a garanzia di profitto economico.',
    },
  };
}

export function suggestAssistedSystem(input: AssistedSystemInput) {
  const { selections, budget, fixedIds = [], profile = 'BALANCED' } = input;
  const k = Math.max(1, Math.min(selections.length, Math.trunc(input.minCorrect)));
  if (!selections.length) return { status: 'NO_BET' as const, reason: 'Nessuna selezione disponibile' };
  if (!Number.isFinite(budget) || budget <= 0) return { status: 'INVALID' as const, reason: 'Budget non valido' };

  const fixedCheck = validateFixed(selections, fixedIds);
  if (!fixedCheck.ok) return { status: 'INCOMPATIBLE' as const, reason: fixedCheck.reason };
  if (fixedCheck.fixed.length > k) return { status: 'INVALID' as const, reason: 'Le fisse superano il minimo di pronostici corretti richiesto' };

  const qualityFloor = profile === 'PRUDENT' ? 0.70 : profile === 'BALANCED' ? 0.60 : 0.50;
  const dqFloor = profile === 'PRUDENT' ? 0.70 : 0.60;
  const eligible = selections.filter((selection) =>
    fixedIds.includes(selection.id) || ((selection.confidence ?? 1) >= qualityFloor && (selection.dataQuality ?? 1) >= dqFloor));
  if (eligible.length < k) return { status: 'NO_BET' as const, reason: `Solo ${eligible.length} selezioni superano le soglie; ne servono almeno ${k}` };

  const preview = buildSystemWithFixed(eligible, k, 1, fixedIds);
  if (preview.status !== 'OK') return preview;
  const prudentCombos = profile === 'PRUDENT'
    ? preview.combinations.filter((combo) => combo.every((a, index) => combo.slice(index + 1).every((b) => correlation(a, b).level !== 'HIGH')))
    : preview.combinations;
  if (!prudentCombos.length) return { status: 'NO_BET' as const, reason: 'Nessuna combinazione rispetta il profilo di correlazione scelto' };

  const centsPerCombo = Math.floor((budget / prudentCombos.length) * 100);
  if (centsPerCombo < 10) return { status: 'NO_BET' as const, reason: 'Budget insufficiente per sviluppare il sistema con stake minimo €0,10' };
  const stake = centsPerCombo / 100;
  const cost = Number((stake * prudentCombos.length).toFixed(2));
  const maxCorrelation = prudentCombos.reduce((max, combo) => {
    const scores = combo.flatMap((a, index) => combo.slice(index + 1).map((b) => correlation(a, b).score));
    return Math.max(max, scores.length ? Math.max(...scores) : 0);
  }, 0);

  return {
    status: 'OK' as const,
    mode: 'ASSISTED',
    profile,
    requestedMinCorrect: k,
    k,
    stake,
    cost,
    budget,
    fixedIds,
    selections: eligible,
    combinations: prudentCombos,
    maxCorrelation,
    coverage: {
      selected: eligible.length,
      combinationSize: k,
      combinations: prudentCombos.length,
      explanation: `Con ${eligible.length} pronostici e combinazioni da ${k}, il sistema contiene una combinazione interamente corretta quando almeno ${k} pronostici risultano corretti e la combinazione corrispondente è presente nello sviluppo.`,
      guarantee: 'Questa è copertura combinatoria, non una garanzia di profitto o di recupero dell’investimento.',
    },
  };
}
