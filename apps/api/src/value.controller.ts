import { Controller, Get, Query } from '@nestjs/common';
import { evaluateValue, predictFixture, StructuredMarket } from '@fps/domain';
import { FootballProvider } from './services';

@Controller('v2')
export class ValueController {
  constructor(private football: FootballProvider) {}

  @Get('value')
  async value(@Query('fixtureId') fixtureId: string, @Query('competition') competition = 'SA') {
    if (!fixtureId) throw new Error('fixtureId required');
    const [details, standings] = await Promise.all([
      this.football.matchDetails(fixtureId),
      this.football.standings(competition),
    ]);
    const homeId = String(details.homeTeam?.id), awayId = String(details.awayTeam?.id);
    const home = standings.find((row) => row.teamId === homeId), away = standings.find((row) => row.teamId === awayId);
    if (!home || !away) return { source: 'UNAVAILABLE', reason: 'Statistiche squadra mancanti', data: [] };

    const model = predictFixture(home, away);
    const enrichment = await this.football.enrichment(details.utcDate, details.homeTeam?.name || '', details.awayTeam?.name || '');
    if (!enrichment.providerFixtureId) {
      return { source: 'UNAVAILABLE', reason: 'Fixture non mappabile sul provider quote', data: valueRows(model.markets, []) };
    }
    const odds = await this.football.odds(enrichment.providerFixtureId);
    return {
      source: odds.length ? 'API_FOOTBALL_FREE' : 'UNAVAILABLE',
      providerFixtureId: enrichment.providerFixtureId,
      reason: odds.length ? undefined : 'Nessuna quota pre-match disponibile nel free tier per questa fixture',
      data: valueRows(model.markets, odds),
    };
  }
}

function valueRows(markets: StructuredMarket[], odds: Array<{bookmaker:string;market:string;selection:string;odds:number;updatedAt?:string}>) {
  return markets
    .filter((market) => market.market === '1X2' || market.market === 'BTTS' || market.market.startsWith('OVER_UNDER_'))
    .map((market) => {
      const offers = odds.filter((odd) => odd.market === market.market && odd.selection === market.selection).sort((a, b) => b.odds - a.odds);
      const best = offers[0];
      const value = evaluateValue(market.probability, best?.odds);
      return {
        market: market.market,
        selection: market.selection,
        probability: market.probability,
        fairOdds: market.fairOdds,
        bookmaker: best?.bookmaker ?? null,
        offeredOdds: best?.odds ?? null,
        oddsUpdatedAt: best?.updatedAt ?? null,
        valueStatus: value.status,
        edge: value.edge,
        expectedValue: value.expectedValue,
      };
    });
}
