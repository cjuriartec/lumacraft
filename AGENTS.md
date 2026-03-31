# 🤖 Lumacraft - Agent Instructions

## 🌐 Project Context
**Lumacraft** is a premium, open-source dynamic data engine and platform builder (inspired by Airtable and Supabase). It allows users to create custom collections, fields, and manage data with a focus on multi-tenancy, high performance, and exceptional UI/UX.

---

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
6.  **Next.js 14+**: Use App Router, Server Components where possible, and Server Actions for mutations.
7.  **Supabase BaaS**: Rely on RLS (Row Level Security) for data safety. Don't bypass RLS unless absolutely necessary.

---

## 🎨 UI, Theming & Colors
**Lumacraft** is a high-end application. Aesthetic precision is mandatory.
1.  **Theme Adaptation**: Every component **must** support both Light and Dark modes.
2.  **CSS Variables**: Use the predefined CSS variables from `globals.css` (e.g., `var(--primary)`, `var(--background)`, `var(--foreground)`).
3.  **Tailwind Utility Classes**: Always use the semantic colors mapped in Tailwind: `bg-background`, `text-foreground`, `bg-primary`, `text-muted`, etc.
4.  **Aesthetics (Noir Minimalist)**: Focus on a **clean, minimalist, and integrated** UI. Avoid excessive shadows, large gradients, or complex animations. Follow these patterns:
    -   **Layout**: Use `max-w-5xl` for main dashboard pages with generous padding (`p-8` or `px-8 py-10`).
    -   **Typography**: Main titles should be `text-[2.5rem]` with `tracking-[-0.02em]` and `font-bold`. Use `text-[11px] font-semibold uppercase tracking-[0.12em]` for primary tags/descriptors.
    -   **Tables & Lists**: Use `bg-surface` for containers, `hover:bg-surface-hover/30` for row interactions, and minimal borders (`border-border/50`).
    -   **Navigation**: Prefer `variant="line"` for Tabs to maintain a flat, integrated "Action Hub" feel.
    -   **Interactive Elements**: Keep hover effects subtle (e.g., `-translate-y-0.5` with smooth transitions).

---

## ✅ Tactical Implementation Checklist

- [ ] Does this logic belong in the `domain` (business rule) or `infrastructure` (database detail)?
- [ ] Is the entity valid by definition? (Use it as a gatekeeper).
- [ ] **MANDATORY**: Have you written a unit/integration test for the new logic? (Vitest for logic, Playwright for flows).
- [ ] Is the data isolated by `account_id`? (Multi-tenancy).
- [ ] Are you using the `Result` pattern for error handling?
- [ ] Does the UI adapt correctly to Dark Mode? Is it using theme variables?

---

## 🧪 Testing Strategy (Post-Execution)
**Critical Rule**: After any feature implementation or bug fix, the agent **must** create or update relevant tests.
1.  **Unit Tests**: In `__tests__/unit/`. Focus on domain logic and use cases.
2.  **Integration Tests**: In `__tests__/integration/`. Focus on repository implementations against Supabase.
3.  **E2E Tests**: In `__tests__/e2e/`. Focus on critical user flows with Playwright.
4.  **Run Tests**: Always run `npm test` or `vitest` to verify changes before finishing.
