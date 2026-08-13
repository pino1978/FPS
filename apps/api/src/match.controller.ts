import { Controller, Get, Param, Query } from '@nestjs/common';
import { predictFixture } from '@fps/domain';
import { FootballProvider } from './services';

@Controller('v2/matches')
export class MatchController {
  constructor(private football: FootballProvider) {}

  @Get(':fixtureId/intelligence')
  async intelligence(@Param('fixtureId') fixtureId: string, @Query('competition') competition = 'SA') {
    if (!fixtureId?.trim()) throw new Error('fixtureId required');
    const [details, standings] = await Promise.all([
      this.football.matchDetails(fixtureId),
      this.football.standings(competition),
    ]);
    const homeId=String(details.homeTeam?.id),awayId=String(details.awayTeam?.id);
    const home=standings.find(row=>row.teamId===homeId),away=standings.find(row=>row.teamId===awayId);
    const enrichment=await this.football.enrichment(details.utcDate,details.homeTeam?.name||'',details.awayTeam?.name||'');
    const homeStarters=enrichment.homeStarters.length?enrichment.homeStarters:personNames(details.homeTeam?.lineup);
    const awayStarters=enrichment.awayStarters.length?enrichment.awayStarters:personNames(details.awayTeam?.lineup);
    const homeBench=enrichment.homeBench.length?enrichment.homeBench:personNames(details.homeTeam?.bench);
    const awayBench=enrichment.awayBench.length?enrichment.awayBench:personNames(details.awayTeam?.bench);

    let prediction:null|ReturnType<typeof predictFixture>=null;
    if(home&&away)prediction=predictFixture(home,away);
    const top=prediction?.markets.filter(m=>['1X2','BTTS','OVER_UNDER_2_5'].includes(m.market)).sort((a,b)=>b.probability-a.probability).slice(0,3)||[];
    const explanation=home&&away?[
      `${details.homeTeam?.name}: ${home.points} punti in ${home.played} gare, ${home.goalsFor} gol fatti e ${home.goalsAgainst} subiti${home.formIndex==null?'':`, indice forma ${Math.round(home.formIndex*100)}%`}.`,
      `${details.awayTeam?.name}: ${away.points} punti in ${away.played} gare, ${away.goalsFor} gol fatti e ${away.goalsAgainst} subiti${away.formIndex==null?'':`, indice forma ${Math.round(away.formIndex*100)}%`}.`,
      prediction?`Expected goals modello: ${prediction.expectedGoalsHome.toFixed(2)} - ${prediction.expectedGoalsAway.toFixed(2)}.`:'Expected goals non disponibili.',
      enrichment.availabilityVerified?'Indisponibilità verificate tramite fonte di enrichment gratuita.':'Disponibilità giocatori non completamente verificata: la Data Quality deve riflettere questa incertezza.',
    ]:['Statistiche squadra insufficienti: nessuna motivazione quantitativa viene inventata.'];

    return {
      fixture:{id:String(details.id||fixtureId),utcDate:details.utcDate,status:details.status,homeTeam:{id:homeId,name:details.homeTeam?.name},awayTeam:{id:awayId,name:details.awayTeam?.name}},
      statistics:{home:home||null,away:away||null},
      expectedGoals:prediction?{home:prediction.expectedGoalsHome,away:prediction.expectedGoalsAway}:null,
      topMarkets:top,
      lineup:{home:{starters:homeStarters,bench:homeBench},away:{starters:awayStarters,bench:awayBench},source:enrichment.source},
      injuries:enrichment.injuries,
      availabilityVerified:enrichment.availabilityVerified,
      explanation,
    };
  }
}

function personNames(list:any[]|undefined){return (list||[]).map((item:any)=>item?.name||item?.player?.name).filter(Boolean)}
