import pc from "picocolors";

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  log(message: string) {
    // this.printMessage('LOG', message, pc.green);
  }

  error(message: string, trace?: string) {
    this.printMessage('ERROR', message, pc.red);
    if (trace) {
      console.error(pc.red(trace));
    }
  }

  warn(message: string) {
    this.printMessage('WARN', message, pc.yellow);
  }

  info(message: string) {
    // this.printMessage('INFO', message, pc.blue); // O pc.cyan
  }

  private printMessage(level: string, message: string, colorFn: (s: string) => string) {
    const timestamp = new Date().toLocaleString();
    const pid = process.pid;
    const appName = pc.green('[Karin]');

    // Formato: [Karin] PID - FECHA   LEVEL [Context] Mensaje
    const formattedLevel = colorFn(level.padEnd(7)); // Alineación
    const formattedContext = pc.yellow(`[${this.context}]`);
    const formattedMessage = colorFn(message);

    console.log(
      `${appName} ${pc.yellow(pid.toString())}  - ${timestamp}     ${formattedLevel} ${formattedContext} ${formattedMessage}`
    );
  }
}
