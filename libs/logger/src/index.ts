import { createLogger, format, transports } from 'winston';
import { container } from 'tsyringe';
import { Config, kConfig } from '@didinele.me/injection';

export default (name: string) => {
  const config = container.resolve<Config>(kConfig);
  return createLogger({
    format: format.combine(
      format.errors({ stack: true }),
      format.label({ label: name.toUpperCase() }),
      format.timestamp({ format: 'YYYY/MM/DD HH:mm:ss' }),
      format.printf(info => {
        const { timestamp, label, level, message, topic, ...rest } = info;
        const extra = Object.keys(rest).length ? `\n${JSON.stringify(rest, null, 2)}` : '';
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `[${timestamp}][${label}][${level.toUpperCase()}][${topic}]: ${message}${extra}`;
      })
    ),
    transports: [
      new transports.Console({
        format: format.colorize({ level: true }),
        level: config.nodeEnv === 'prod' ? 'info' : 'debug'
      })
    ]
  });
};
