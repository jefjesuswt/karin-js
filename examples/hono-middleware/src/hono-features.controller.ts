import { Controller, Get, Ctx, KarinExecutionContext } from "@karin-js/core";
import { UseHono } from "@karin-js/platform-hono";
import { secureHeaders } from "hono/secure-headers";
import { cache } from "hono/cache";
import type { Context, Next } from "hono";

// Custom Hono Middleware
const customLogger = async (c: Context, next: Next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    c.header("X-Response-Time", `${ms}ms`);
};

@Controller("/hono")
export class HonoFeaturesController {

    // 1. Using Native Hono Middleware (Secure Headers)
    @Get("/secure")
    @UseHono(secureHeaders())
    async getSecure() {
        return {
            message: "Check my headers! I have Hono's secure headers.",
        };
    }

    // 2. Using Native Hono Cache
    @Get("/cached")
    @UseHono(
        cache({
            cacheName: "karin-cache",
            cacheControl: "max-age=10",
            wait: false,
        })
    )
    async getCached() {
        return {
            message: "I am cached for 10 seconds",
            timestamp: new Date().toISOString(),
        };
    }

    // 3. Custom Middleware & Context State Sharing
    @Get("/state")
    @UseHono(async (c, next) => {
        // Set state in Hono context
        c.set("user", { id: 1, role: "admin" });
        await next();
    })
    async getState(@Ctx() ctx: KarinExecutionContext) {
        // Read state from Hono context
        const honoCtx = ctx.getPlatformContext<Context>();
        const user = honoCtx.get("user");

        return {
            message: "I read this user from Hono Context State",
            user,
        };
    }

    // 4. Custom Response Time Middleware
    @Get("/timing")
    @UseHono(customLogger)
    async getTiming() {
        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            message: "Check X-Response-Time header!",
        };
    }
}
