import 'reflect-metadata';

import { collectDefaultMetrics } from 'prom-client';
import { createApp, Route } from '@didinele.me/rest';
import { initConfig, kLogger, kSql } from '@didinele.me/injection';
import createLogger from '@didinele.me/logger';
import { container } from 'tsyringe';
import postgres from 'postgres';
import { join as joinPath } from 'path';
import { readdirRecurse } from '@gaius-bot/readdir';

void (async () => {
  const config = initConfig();
  const logger = createLogger('AUTH');

  container.register(kLogger, { useValue: logger });
  container.register(
    kSql, {
      useValue: postgres(config.dbUrl, {
        onnotice: notice => logger.debug(JSON.stringify(notice, null, 2), { topic: 'DB NOTICE' })
      })
    }
  );

  const app = createApp();

  const routes = joinPath();
  const files = readdirRecurse(routes, { fileExtension: 'js' });

  for await (const file of files) {
    const info = Route.pathToRouteInfo(file.split('/routes').pop()!);
    if (!info) {
      logger.warn(`Failed to dig out route metadata from path "${file}"`, { topic: 'AUTH INIT' });
      continue;
    }

    logger.info(`Loading route "${info.method.toUpperCase()} ${info.path}"`, { topic: 'AUTH INIT' });

    const route = container.resolve<Route>((await import(file)).default);
    route.register(info, app);
  }

  app.listen(3000, () => void logger.info('Listening to requests on port 3000', { topic: 'AUTH INIT' }));
  collectDefaultMetrics();
})();
