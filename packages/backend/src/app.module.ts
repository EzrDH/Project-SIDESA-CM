import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { RegistryModule } from './registry/registry.module';

@Module({ imports: [AuthModule, RegistryModule], controllers: [HealthController] })
export class AppModule {}
