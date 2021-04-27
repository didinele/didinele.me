import { register } from 'prom-client';
import { Route } from '@didinele.me/rest';
import { injectable } from 'tsyringe';
import type { Request, Response } from 'polka';

@injectable()
export default class GetMetricsRoute extends Route {
  public async handle(_: Request, res: Response) {
    res.statusCode = 200;
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  }
}
