import { H3, handleCors } from "h3";
import { Logger, type IHttpAdapter } from "@karin-js/core";

export class H3Adapter implements IHttpAdapter {
  private app: H3;
  private logger = new Logger('H3Adapter');

  constructor() {
    this.app = new H3();
  }

  get(path: string, handler: Function) {
    this.app.get(path, (event) => handler(event));
  }

  post(path: string, handler: Function) {
    this.app.post(path, (event) => handler(event));
  }

  enableCors() {
    this.app.use((event) => {
      return handleCors(event, {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        preflight: { statusCode: 204 }
      });
    });
  }

  listen(port: number) {
    const h3App = this.app;

    Bun.serve({
      port,
      async fetch(req) {


        return h3App.fetch(req);
      },
    });

    this.logger.log(`Server running on http://localhost:${port}`);
  }
}
