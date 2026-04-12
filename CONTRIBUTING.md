# 🤝 Contributing to Lumacraft

Welcome to the **Lumacraft** collective. We are building a high-performance, dynamic data engine with a focus on engineering excellence and minimalist aesthetics. 

To maintain the high quality of this engine, we follow strict architectural patterns and development standards.

---

## 🏛️ Engineering Philosophy

Lumacraft is not just a collection of components; it is a carefully orchestrated system built on:

1.  **Screaming Architecture**: The directory structure should immediately reveal the business domain, not the framework.
2.  **Hexagonal Architecture**: We maintain a strict separation between Business Logic (Domain/Application) and Infrastructure (Supabase, External APIs).
3.  **Domain-Driven Design (DDD)**: Entities and Value Objects are the heart of the system.
4.  **Valid by Construction**: We use `Value Objects` to ensure that an entity can never exist in an invalid state.
5.  **Functional Error Handling**: We avoid `try/catch` for expected business errors, using the `Result<T, E>` pattern instead.

---

## 📂 Project Structure

Every module in `src/modules/` follows this blueprint:

```
module-name/
├── domain/            # Entities, Value Objects, Repository Interfaces (Ports)
├── application/       # Use Cases (Interactors)
├── infrastructure/    # Repository Implementations (Adapters), API Clients
└── presentation/      # React Components, Hooks, UI Logic
```

**Rule**: The `domain` layer must have **zero** dependencies on external libraries (except for core utilities).

---

## 🛠️ Development Standards

### 1. The Result Pattern
Always return a `Result` object for operations that can fail due to business rules.

```typescript
// ✅ Do this
const user = User.create(email);
if (user.isFailure) return Result.fail(user.error);

// ❌ Avoid this
if (!isValid(email)) throw new Error("Invalid email");
```

### 2. Strict Typing
We do not use `any`. Every interface, entity, and function must be fully typed. Use `Zod` for runtime validation at the boundaries of the system.

### 3. Noir Aesthetics
If you are contributing to the UI, follow the **Noir Minimalist** guidelines:
- Use CSS Variables (`var(--primary)`, `var(--background)`).
- Keep animations subtle (framer-motion).
- Ensure native Support for Light and Dark modes.

---

## 🧪 Testing Requirements

We believe that code without tests is broken by design.
- **Unit Tests**: Mandatory for all Use Cases and Domain Entities.
- **Integration Tests**: Required for Repositories and external adapters.
- **E2E Tests**: Required for critical paths (Auth, Template Execution, PDF Generation).

Run tests locally before submitting a PR:
```bash
npm run test           # Unit & integration
npm run test:e2e       # Full flows
```

---

## 🚀 Contribution Workflow

1.  **Fork** the repository and create your branch from `main`.
2.  **Implement** your changes following the architectural rules.
3.  **Test** your changes thoroughly.
4.  **Commit** using [Conventional Commits](https://www.conventionalcommits.org/):
    - `feat: add AI contextual grounding`
    - `fix: resolve RLS bypass in document storage`
    - `docs: update deployment guide`
5.  **Open a PR** with a clear description of the value provided.

---

## 📄 License

By contributing, you agree that your contributions will be licensed under its [MIT License](LICENSE).
