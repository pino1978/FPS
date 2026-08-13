import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FootballProvider, PrismaService } from './services';

const DEFAULT_COMPETITIONS = (process.env.FPS_COMPETITIONS || 'SA,PL,PD,BL1,CL')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

@Injectable()
export class IngestionService {
  private readonly log = new Logger(IngestionService.name);
  private running = false;

  constructor(private football: FootballProvider, private db: PrismaService) {}

  @Cron('0 7 * * * *')
  async scheduled() {
    if (this.running) return;
    this.running = true;
    try {
      await this.run();
    } catch (error) {
      this.log.error(error);
    } finally {
      this.running = false;
    }
  }

  async run(competitions = DEFAULT_COMPETITIONS) {
    const report: Array<{competition:string;status:string;fixtures?:number;standings?:number;message?:string}> = [];
    for (const competition of competitions) {
      try {
        const [fixtures, standings] = await Promise.all([
          this.football.fixtures(competition),
          this.football.standings(competition),
        ]);

        for (const fixture of fixtures) {
          await this.db.fixture.upsert({
            where: { id: fixture.id },
            create: {
              id: fixture.id,
              competition,
              status: fixture.status,
              utcDate: new Date(fixture.utcDate),
              homeTeamId: fixture.home.id,
              homeTeam: fixture.home.name,
              awayTeamId: fixture.away.id,
              awayTeam: fixture.away.name,
              source: 'football-data.org',
            },
            update: {
              competition,
              status: fixture.status,
              utcDate: new Date(fixture.utcDate),
              homeTeamId: fixture.home.id,
              homeTeam: fixture.home.name,
              awayTeamId: fixture.away.id,
              awayTeam: fixture.away.name,
              source: 'football-data.org',
            },
          });
        }

        const cutoff = new Date(Date.now() - 15 * 60_000);
        for (const standing of standings) {
          const latest = await this.db.teamSnapshot.findFirst({
            where: { competition, teamId: standing.teamId, capturedAt: { gte: cutoff } },
            orderBy: { capturedAt: 'desc' },
          });
          if (!latest) {
            await this.db.teamSnapshot.create({
              data: {
                competition,
                teamId: standing.teamId,
                played: standing.played,
                points: standing.points,
                goalsFor: standing.goalsFor,
                goalsAgainst: standing.goalsAgainst,
                formIndex: standing.formIndex,
                source: 'football-data.org',
              },
            });
          }
        }

        report.push({ competition, status: 'OK', fixtures: fixtures.length, standings: standings.length });
      } catch (error) {
        report.push({ competition, status: 'ERROR', message: error instanceof Error ? error.message : String(error) });
      }
    }
    await this.db.auditEvent.create({
      data: {
        entityType: 'IngestionRun',
        entityId: new Date().toISOString(),
        action: 'COMPLETED',
        payload: JSON.parse(JSON.stringify(report)),
      },
    });
    return report;
  }
}
