# Karin-JS 🦊

[![NPM Version](https://img.shields.io/npm/v/@karin-js/core)](https://www.npmjs.com/package/@karin-js/core)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.2.10-lightgrey?logo=bun)](https://bun.sh/)

A lightweight, module-less backend framework for Bun. Built for speed, designed for simplicity.

## ⚠️ Project Status: Alpha (v0.3.0)

Karin-JS is an **experimental learning project** exploring modern backend patterns in the Bun ecosystem. 

**What works:**
- ✅ Decorators, DI, Guards, Pipes, Interceptors, Filters
- ✅ Two adapters: H3 (maximum speed) and Hono (Edge/serverless)
- ✅ Graceful shutdown and error handling
- ✅ File-based controller discovery
- ✅ Custom decorators and plugins

**Known limitations:**
- ⚠️ Request-scoped DI not fully implemented (use singletons or manual instantiation)
- ⚠️ Limited battle-testing in production
- ⚠️ No WebSockets/GraphQL support (yet)

**Safe for:**
- Learning advanced TypeScript patterns
- Prototyping and side projects
- Benchmarking Bun performance

**Not yet ready for:**
- Mission-critical production systems
- Large enterprise applications (use NestJS)

---

## Why Karin-JS?

### It's NOT a NestJS replacement

NestJS is mature, proven, and backed by an ecosystem. Karin-JS is a **lighter alternative** for specific use cases:

- **Small-to-medium APIs** (< 50 endpoints)
- **Rapid prototyping** where module boilerplate slows you down
- **Performance-critical services** leveraging Bun's native speed
- **Learning** how decorators, DI, and metadata work under the hood

### Module-less by Design

Karin uses a **file-based architecture** inspired by modern frameworks:
```typescript
// No need for @Module declarations
await KarinFactory.create(adapter, {
  scan: "./src/**/*.controller.ts"
});
```

Structure emerges from folder organization, not configuration files.

**When to use Karin:** Small teams, fast iteration, Bun ecosystem  
**When to use NestJS:** Large teams, complex domains, enterprise requirements

---

## Benchmarks

| Adapter          | Avg. Latency | Requests/sec | vs NestJS |
| :--------------- | :----------- | :----------- | :-------- |
| **H3 Adapter**   | 1.00ms       | 98,505       | **10x faster** |
| **Hono Adapter** | 1.27ms       | 77,814       | **8x faster**  |
| **NestJS**       | 10.05ms      | 9,940        | baseline   |

*Hardware: AMD Ryzen 5 5600X, Arch Linux*  
*Test: 100k requests, 100 concurrency, simple JSON endpoint*

> **Note:** Real-world performance depends on your database, business logic, and architecture. These benchmarks show framework overhead only.

---

## Contributing & Feedback

This is a learning project. Feedback, issues, and contributions are welcome!

- 👍 Star the repo if you find it interesting
- 🐛 Report bugs in Issues
- 💡 Suggest features in Discussions
- 🔧 PRs welcome (run `bun test` first)

---

## License

MIT © Karin-JS Contributors
