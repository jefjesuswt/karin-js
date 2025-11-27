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

  log(message: string) {
    this.print(LogLevel.INFO, message, pc.green, "LOG ");
  }

  info(message: string) {
    this.print(LogLevel.INFO, message, pc.blue, "INFO");
  }

  error(message: string, trace?: string) {
    this.print(LogLevel.ERROR, message, pc.red, "ERR ");
    if (trace && Logger.level <= LogLevel.ERROR) {
      console.error(pc.red(trace));
    }
  }

  warn(message: string) {
    this.print(LogLevel.WARN, message, pc.yellow, "WARN");
  }

  debug(message: string) {
    this.print(LogLevel.DEBUG, message, pc.magenta, "DBUG");
  }

  private print(
    level: LogLevel,
    message: string,
    colorFn: (s: string) => string,
    levelLabel: string
  ) {
    if (Logger.level > level) return;

    // --- DISEÑO PREMIUM ---

    // 1. Icono del Framework (Minimalista)
    const icon = "🦊";

    // 2. Timestamp (Gris tenue para no distraer)
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    const timestamp = pc.dim(time);

    // 3. Nivel (Coloreado y Bold)
    const lvl = pc.bold(colorFn(levelLabel));

    // 4. Contexto (Amarillo brillante, entre corchetes para destacar el origen)
    const ctx = pc.yellow(`[${this.context}]`);

    // 5. Mensaje (Blanco/Default)
    const msg = message;

    // Formato final: 🦊 19:35:02 INFO [RouterExplorer] Mensaje...
    console.log(`${icon} ${timestamp} ${lvl} ${ctx} ${msg}`);
  }
}
