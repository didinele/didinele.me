import { injectable, inject } from 'tsyringe';
import { URLSearchParams } from 'url';
import { Config, kConfig } from '@didinele.me/injection';
import { Route, State, auth, validate } from '@didinele.me/rest';
import * as Joi from 'joi';
import type { AuthGetDiscordQuery } from '@didinele.me/core';
import type { Request, Response } from 'polka';

@injectable()
export default class GetDiscordRoute extends Route {
  public readonly middleware = [
    validate(
      Joi
        .object()
        .keys({
          redirect_uri: Joi.string().required()
        })
        .required(),
      'query'
    ),
    auth(true)
  ];

  public constructor(@inject(kConfig) public readonly config: Config) {
    super();
  }

  public handle(req: Request, res: Response) {
    const { redirect_uri } = req.query as unknown as AuthGetDiscordQuery;

    if (req.user) {
      res.redirect(redirect_uri);
      return res.end();
    }

    const state = new State(redirect_uri).toString();

    const params = new URLSearchParams({
      client_id: this.config.discordClientId,
      redirect_uri: `${this.config.authDomain}/discord/callback`,
      response_type: 'code',
      scope: this.config.discordScopes,
      state
    });

    res.cookie('state', state, { httpOnly: true, path: '/' });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
    return res.end();
  }
}
