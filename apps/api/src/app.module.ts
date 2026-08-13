import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './controller';
import { FootballProvider, PrismaService } from './services';
import { SettlementService } from './settlement.service';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [FootballProvider, PrismaService, SettlementService, IngestionService],
})
export class AppModule {}
