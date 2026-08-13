import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './controller';
import { OperationsController } from './operations.controller';
import { FootballProvider, PrismaService } from './services';
import { SettlementService } from './settlement.service';
import { IngestionService } from './ingestion.service';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AppController, OperationsController],
  providers: [FootballProvider, PrismaService, SettlementService, IngestionService, AnalyticsService],
})
export class AppModule {}
