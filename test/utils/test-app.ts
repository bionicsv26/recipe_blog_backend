import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  // Cron не должен стрелять во время прогона: EVERY_MINUTE (views) и 03:00 (cleanup)
  // ломают детерминизм. Их поведение проверяется прямым вызовом метода в PR10/PR11.
  app
    .get(SchedulerRegistry)
    .getCronJobs()
    .forEach((job) => job.stop());

  return app;
}
