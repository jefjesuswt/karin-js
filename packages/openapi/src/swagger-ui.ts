export interface SwaggerUiOptions {
  title: string;
  jsonUrl: string;
  version?: string;
  theme?: "light" | "dark" | "classic";
}

export function generateSwaggerHtml(options: SwaggerUiOptions): string {
  const version = options.version || "5.11.0";
  const title = options.title || "API Documentation";

  const cssUrl = `https://unpkg.com/swagger-ui-dist@${version}/swagger-ui.css`;
  const bundleUrl = `https://unpkg.com/swagger-ui-dist@${version}/swagger-ui-bundle.js`;
  const presetUrl = `https://unpkg.com/swagger-ui-dist@${version}/swagger-ui-standalone-preset.js`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <meta name="description" content="Swagger UI for Karin-JS API" />
      <link rel="stylesheet" href="${cssUrl}" />
      <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; font-family: sans-serif; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="${bundleUrl}" crossorigin></script>
      <script src="${presetUrl}" crossorigin></script>
      <script>
        window.onload = () => {
          // Aseguramos que el preset global exista antes de usarlo
          const StandalonePreset = window.SwaggerUIStandalonePreset;

          window.ui = SwaggerUIBundle({
            url: '${options.jsonUrl}',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              StandalonePreset // ✅ CORRECCIÓN: Usamos la variable global
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            filter: true,
            displayRequestDuration: true,
            docExpansion: 'list',
            syntaxHighlight: {
              activate: true,
              theme: 'agate'
            }
          });
        };
      </script>
    </body>
    </html>
  `;
}
