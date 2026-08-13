import { Controller, Get, Query } from '@nestjs/common';
import { DEFAULT_MODEL_CONFIG, MODEL_CONFIG_VERSION, MODEL_VERSION, predictFixture, StructuredMarket, type MatchContext } from '@fps/domain';
import { playerImpactScore } from '@fps/player-engine';
import { Enrichment, FootballProvider, PrismaService, Scorer, Standing } from './services';

type PresentedMarket = StructuredMarket & {
  confidence: number;
  dataQuality: number;
  status: 'ACTIVE' | 'NO_BET';
  reason?: string;
};
type AvailabilityProfile = MatchContext & { source: string; injuries: number; mappedInjuries: number; checked: boolean };

@Controller('v2')
export class PredictionController {
  constructor(private football: FootballProvider, private db: PrismaService) {}

  @Get('predictions')
  async predictions(
    @Query('competition') competition = 'SA',
    @Query('date') date?: string,
    @Query('persist') persist = 'false',
  ) {
    const [fixtures, standings] = await Promise.all([
      this.football.fixtures(competition, date),
      this.football.standings(competition),
    ]);
    const byTeam = new Map(standings.map((x) => [x.teamId, x]));
    const enrichmentCandidates = fixtures.filter((fixture) => shouldCheckAvailability(fixture.utcDate)).slice(0, availabilityFixtureLimit());
    let scorers: Scorer[] = [];
    if (enrichmentCandidates.length) {
      try { scorers = await this.football.scorers(competition, 100); } catch { scorers = []; }
    }
    const availability = new Map<string, AvailabilityProfile>();
    for (const fixture of enrichmentCandidates) {
      const home = byTeam.get(fixture.home.id), away = byTeam.get(fixture.away.id);
      try {
        const enrichment = await this.football.enrichment(fixture.utcDate, fixture.home.name, fixture.away.name);
        availability.set(fixture.id, availabilityProfile(enrichment, fixture.home.id, fixture.away.id, home, away, scorers));
      } catch {
        availability.set(fixture.id, unavailableAvailability());
      }
    }

    const data = fixtures.map((fixture) => {
      const home = byTeam.get(fixture.home.id);
      const away = byTeam.get(fixture.away.id);
      if (!home || !away) {
        return {
          fixture,
          expectedGoalsHome: null,
          expectedGoalsAway: null,
          teamStrength: null,
          residualProbability: null,
          availability: unavailableAvailability(),
          markets: [{ market: 'MODEL', selection: 'NO_BET', probability: 0, confidence: 0, dataQuality: 0, fairOdds: null, status: 'NO_BET' as const, reason: 'Statistiche mancanti' }],
          inputs: null,
        };
      }
      const availabilityProfileForFixture = availability.get(fixture.id) ?? unavailableAvailability();
      const context: MatchContext = {
        homeAvailabilityLoss: availabilityProfileForFixture.homeAvailabilityLoss,
        awayAvailabilityLoss: availabilityProfileForFixture.awayAvailabilityLoss,
        availabilityCoverage: availabilityProfileForFixture.availabilityCoverage,
        lineupConfirmed: availabilityProfileForFixture.lineupConfirmed,
      };
      const bundle = predictFixture(home, away, DEFAULT_MODEL_CONFIG, context);
      const oneXtwo = bundle.markets.filter((m: StructuredMarket) => m.market === '1X2').map((m: StructuredMarket) => m.probability);
      const envelope = qualityEnvelope(home, away, oneXtwo, context);
      const markets: PresentedMarket[] = bundle.markets.map((market: StructuredMarket) => ({
        ...market,
        confidence: envelope.confidence,
        dataQuality: envelope.dataQuality,
        status: envelope.active ? 'ACTIVE' : 'NO_BET',
        reason: envelope.active ? undefined : envelope.reason,
      }));
      return {
        fixture,
        expectedGoalsHome: bundle.expectedGoalsHome,
        expectedGoalsAway: bundle.expectedGoalsAway,
        teamStrength: bundle.teamStrength,
        residualProbability: bundle.residualProbability,
        availability: availabilityProfileForFixture,
        inputs: { home, away, availability: availabilityProfileForFixture },
        markets,
      };
    });

    if (persist === 'true') {
      for (const row of data) {
        const cutoff = new Date(Date.now() - 5 * 60_000);
        const existing = await this.db.predictionRun.findFirst({
          where: { fixtureId: row.fixture.id, modelVersion: MODEL_VERSION, asOf: { gte: cutoff } },
        });
        if (existing) continue;
        await this.db.predictionRun.create({
          data: {
            fixtureId: row.fixture.id,
            modelVersion: MODEL_VERSION,
            source: 'football-data.org+api-football-free',
            eventAt: new Date(row.fixture.utcDate),
            inputSnapshot: row.inputs ? {
              competition,
              capturedAt: new Date().toISOString(),
              modelConfigVersion: MODEL_CONFIG_VERSION,
              modelConfig: DEFAULT_MODEL_CONFIG,
              home: row.inputs.home,
              away: row.inputs.away,
              availability: row.inputs.availability,
              teamStrength: row.teamStrength,
              expectedGoalsHome: row.expectedGoalsHome,
              expectedGoalsAway: row.expectedGoalsAway,
              residualProbability: row.residualProbability,
            } : undefined,
            snapshots: {
              create: row.markets.map((m) => ({
                market: m.market,
                selection: m.selection,
                probability: m.probability,
                confidence: m.confidence,
                dataQuality: m.dataQuality,
                fairOdds: m.fairOdds,
                valueStatus: 'UNAVAILABLE',
                status: m.status,
                reason: m.reason,
              })),
            },
          },
        });
      }
    }

    return { source: 'football-data.org+api-football-free', modelVersion: MODEL_VERSION, modelConfigVersion: MODEL_CONFIG_VERSION, data };
  }
}

export function qualityEnvelope(home: Standing, away: Standing, oneXtwo: number[], context: MatchContext = {}) {
  const minGames = Math.min(home.played, away.played);
  const sampleCoverage = Math.max(0, Math.min(1, minGames / 10));
  const formCoverage = home.formIndex == null || away.formIndex == null ? 0.90 : 1;
  const venueCoverage = home.home?.played && away.away?.played ? 1 : 0.85;
  const availabilityCoverage = context.availabilityCoverage == null ? 0.75 : Math.max(0.5, Math.min(1, context.availabilityCoverage));
  const lineupCoverage = context.lineupConfirmed ? 1 : 0.95;
  const dataQuality = Math.max(0, Math.min(1, sampleCoverage * formCoverage * venueCoverage * availabilityCoverage * lineupCoverage));
  const sorted = [...oneXtwo].sort((a, b) => b - a);
  const separation = sorted.length > 1 ? sorted[0] - sorted[1] : 0;
  const confidence = Math.max(0, Math.min(1, 0.45 + 0.35 * dataQuality + 0.20 * Math.min(1, separation * 3)));
  const active = minGames >= 3 && dataQuality >= 0.60 && confidence >= 0.60;
  const missing = [home.formIndex == null || away.formIndex == null ? 'forma' : '', venueCoverage < 1 ? 'casa/trasferta' : '', availabilityCoverage < 1 ? 'availability' : ''].filter(Boolean);
  return { dataQuality, confidence, active, reason: active ? undefined : `Confidence/Data Quality sotto soglia${missing.length ? `; copertura incompleta: ${missing.join(', ')}` : ''}` };
}

function availabilityProfile(enrichment: Enrichment, homeTeamId: string, awayTeamId: string, home: Standing | undefined, away: Standing | undefined, scorers: Scorer[]): AvailabilityProfile {
  if (!enrichment.availabilityVerified) return unavailableAvailability();
  let mapped = 0, homeLoss = 0, awayLoss = 0;
  for (const injury of enrichment.injuries) {
    const side = sameTeam(injury.teamName, homeTeamId, home, scorers) ? 'home' : sameTeam(injury.teamName, awayTeamId, away, scorers) ? 'away' : null;
    const teamId = side === 'home' ? homeTeamId : side === 'away' ? awayTeamId : undefined;
    if (!teamId) continue;
    const scorer = scorers.find((s) => s.teamId === teamId && samePerson(s.playerName, injury.playerName));
    if (!scorer) continue;
    const team = side === 'home' ? home : away;
    const baseline = playerImpactScore({
      goals: scorer.goals,
      assists: scorer.assists,
      penalties: scorer.penalties,
      teamGoals: Math.max(1, team?.goalsFor ?? 1),
      role: scorer.position,
      starterStatus: 'CONFIRMED',
      expectedMinutes: 78,
      availabilityVerified: true,
    }).score;
    if (side === 'home') homeLoss += baseline; else awayLoss += baseline;
    mapped++;
  }
  const injuryCoverage = enrichment.injuries.length ? mapped / enrichment.injuries.length : 1;
  const lineupConfirmed = enrichment.homeStarters.length >= 11 && enrichment.awayStarters.length >= 11;
  const availabilityCoverage = Math.max(0.55, Math.min(1, (0.75 + 0.25 * injuryCoverage) * (lineupConfirmed ? 1 : 0.95)));
  return {
    source: enrichment.source,
    injuries: enrichment.injuries.length,
    mappedInjuries: mapped,
    checked: true,
    homeAvailabilityLoss: Math.min(1, homeLoss),
    awayAvailabilityLoss: Math.min(1, awayLoss),
    availabilityCoverage,
    lineupConfirmed,
  };
}
function unavailableAvailability():AvailabilityProfile{return {source:'UNAVAILABLE',injuries:0,mappedInjuries:0,checked:false,homeAvailabilityLoss:0,awayAvailabilityLoss:0,availabilityCoverage:0.75,lineupConfirmed:false};}
function availabilityFixtureLimit(){const raw=Number(process.env.PREDICTION_AVAILABILITY_FIXTURE_LIMIT||8);return Number.isFinite(raw)?Math.max(0,Math.min(10,Math.floor(raw))):8;}
function shouldCheckAvailability(utcDate:string){const delta=new Date(utcDate).getTime()-Date.now();return delta>=-30*60_000&&delta<=48*60*60_000;}
function samePerson(a:string,b:string){return normalize(a)===normalize(b);}
function sameTeam(name:string,teamId:string,standing:Standing|undefined,scorers:Scorer[]){const names=scorers.filter(s=>s.teamId===teamId).map(s=>s.teamName);return names.some(n=>normalize(n)===normalize(name))||(!standing?false:false);}
function normalize(value:string){return (value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(fc|ac|ssc|ss|calcio|club)\b/g,'').replace(/[^a-z0-9]/g,'');}
