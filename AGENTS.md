# 🤖 Lumacraft - Agent Instructions

## 🏛️ Architecture: Screaming + Hexagonal

This project follows **Screaming Architecture** (folders represent business domains) and **Hexagonal Architecture** (Ports & Adapters) within each module.

### Folder Structure
```
src/
├── modules/                # Business Domains (Bounded Contexts)
│   ├── auth/               # Authentication & session management
│   ├── workspace/          # Multi-tenancy & Account management
│   └── collection/         # Dynamic Data Engine (Collections, Fields, Records)
├── shared/                 # Infrastructure, Base Classes, Shared UI
│   ├── domain/             # Result pattern, Base Entity, Domain Errors
│   ├── infrastructure/     # Supabase clients, Repository base, DI
│   └── presentation/       # Shared UI components, layout, providers
└── app/                    # Next.js App Router (Delivery Layer)
```

### Module Structure (Hexagonal)
Each module in `src/modules/` must have:
1.  **domain/**: Entities, Value Objects, Repository Interfaces (Ports), and Business Logic. *Zero dependencies on external frameworks.*
2.  **application/**: Use Cases (Interactors) that orchestrate business logic. *Mockable and testable.*
3.  **infrastructure/**: Specific implementations (Adapters) like Supabase repositories, external APIs.
4.  **presentation/**: React components, hooks, and views specific to the module.

---

## 🛠️ Design Patterns & Rules

1.  **Result Object**: Use the `Result<T, E>` or `Either` pattern for error handling. Avoid `try/catch` for expected business errors.
2.  **Value Objects**: Use Value Objects for fields requiring validation (Email, Password, Name).
3.  **Repository Pattern**: All database interactions must happen through a repository interface defined in the domain layer.
4.  **Dependency Injection**: Use a simple DI pattern. Use cases should receive their dependencies via constructor/arguments.
5.  **Strict Typing**: Everything must be typed. Use Zod for runtime validation and TypeScript for compile-time safety.
6.  **Next.js 14+**: Use App Router, Server Components where possible, and Server Actions for mutations (if not using Supabase SDK directly on client with RLS).
7.  **Supabase BaaS**: Rely on RLS (Row Level Security) for data safety. Don't bypass RLS unless absolutely necessary.

---

## ✅ Tactical Implementation Checklist

- [ ] Does this logic belong in the `domain` (business rule) or `infrastructure` (database detail)?
- [ ] Is the entity valid by definition? (Use it as a gatekeeper).
- [ ] Have you written a unit test for the business logic?
- [ ] Is the data isolated by `account_id`? (Multi-tenancy).
- [ ] Are you using the `Result` pattern for error handling?

---

## 🧪 Testing Strategy

1.  **Unit Tests**: In `__tests__/unit/`. Focus on domain logic and use cases.
2.  **Integration Tests**: In `__tests__/integration/`. Focus on repository implementations against Supabase (Local/Test).
3.  **E2E Tests**: In `__tests__/e2e/`. Focus on critical user flows with Playwright.
