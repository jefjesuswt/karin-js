import pc from "picocolors";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  public static setLevel(level: LogLevel) {
    Logger.level = level;
  }

  // Método genérico
  log(message: string) {
    this.print(LogLevel.INFO, message, pc.green, "LOG  ");
  }

  // 👇 ESTE ERA EL MÉTODO QUE FALTABA
  info(message: string) {
    if (Logger.level <= LogLevel.INFO) {
      this.print(LogLevel.INFO, message, pc.blue, "INFO ");
    }
  }

  error(message: string, trace?: string) {
    this.print(LogLevel.ERROR, message, pc.red, "ERROR");
    if (trace && Logger.level <= LogLevel.ERROR) {
      console.error(pc.dim(trace));
    }
  }

  warn(message: string) {
    this.print(LogLevel.WARN, message, pc.yellow, "WARN ");
  }

  debug(message: string) {
    this.print(LogLevel.DEBUG, message, pc.magenta, "DEBUG");
  }

  private print(
    level: LogLevel,
    message: string,
    colorFn: (s: string) => string,
    levelLabel: string
  ) {
    if (Logger.level > level) return;

    // Diseño: 🦊 Karin  HH:MM:SS  LEVEL  [Context]  Mensaje

    const prefix = pc.bold(pc.cyan("[🦊 Karin]"));
    const time = new Date().toLocaleTimeString();
    const grayTime = pc.dim(time);

    const coloredLevel = pc.bold(colorFn(levelLabel));
    const context = pc.yellow(this.context.padEnd(15));

    console.log(
      `${prefix}  ${grayTime}  ${coloredLevel}  ${context} [${message}]`
    );
  }
}
