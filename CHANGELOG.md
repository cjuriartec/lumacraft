# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### 0.1.1 (2026-04-06)


### ♻️ Code Refactoring

* decouple TemplateCreateDialog from hooks and implement comprehensive unit and integration tests for template use cases ([8676aba](https://github.com/cjuriartec/lumacraft/commit/8676abaaa88639883279dd5af22478d11c260f15))
* implement domain value objects and consolidate collection use cases with a factory pattern ([045fa10](https://github.com/cjuriartec/lumacraft/commit/045fa10348a9cdcd541fb79bd6d99dba571abf81))
* implement text justification, asynchronous block compilation, and context-aware image resolution in template preview services. ([d629c1d](https://github.com/cjuriartec/lumacraft/commit/d629c1da1695bd2c8ab273c2f9aee45e0a6c3ed8))
* modernize login page UI with theme-aware styling and loading state feedback ([1730a02](https://github.com/cjuriartec/lumacraft/commit/1730a02b68ad5e9bc98d74e9373f9ca120987197))
* redesign login page with enhanced visual branding and hydration fix ([563f256](https://github.com/cjuriartec/lumacraft/commit/563f256f5a93fe0ba1f5e34e3844da5830ab8a84))
* redesign user menu component with updated styling and layout structure ([7f120c5](https://github.com/cjuriartec/lumacraft/commit/7f120c5e5c5156a8ffd2740ffbc22e6ce7708281))
* simplify TemplatePreviewPanel by removing collection-linked record generation logic ([5e644b9](https://github.com/cjuriartec/lumacraft/commit/5e644b9815efbaca6e3400f8e50a90db77518e6e))
* update preview button styling and position in template editor page ([b637809](https://github.com/cjuriartec/lumacraft/commit/b637809c814c6f31c05244882aea1e89328b4b19))


### 💄 Styling

* add bottom padding to data grid container and update search input background opacity ([f2279fc](https://github.com/cjuriartec/lumacraft/commit/f2279fce765e5f531ed67a4c031b2c03878d252f))
* center image container and remove invalid size-full! utility class ([7b5bd20](https://github.com/cjuriartec/lumacraft/commit/7b5bd207fad2dc635035bcafcefc900b0bd0495e))
* update image-element class to force full size with important modifier ([d703e33](https://github.com/cjuriartec/lumacraft/commit/d703e333ef50d71e77d47463d9fb7b9af2d493bc))


### 📝 Documentation

* add project planning documentation ([9836422](https://github.com/cjuriartec/lumacraft/commit/9836422cbf9e21e0d68f3353c08c8a2e1810fcdd))
* update Sprint 9 planning with advanced relationship support and cardinality validation ([89bd543](https://github.com/cjuriartec/lumacraft/commit/89bd54319f80c5d88e66ddd4248cfc3069c832c7))
* update sprint planning status for Sprints 2, 3, and 4 ([cf400fa](https://github.com/cjuriartec/lumacraft/commit/cf400fa960d40016381a0f35cee5b4b3fd1e87ae))


### ✨ Features

* add alignment support for image variable blocks with UI controls ([806f491](https://github.com/cjuriartec/lumacraft/commit/806f491c9f7415e69b8fd8777160ba0e99aff1d1))
* add IMAGE field type support to domain, repository, and UI components ([3ef20eb](https://github.com/cjuriartec/lumacraft/commit/3ef20ebda52c43a753ab450a4d477de9fd0aa347))
* add indent/outdent controls, implement background color picker, and prune unused editor block types. ([167dd3c](https://github.com/cjuriartec/lumacraft/commit/167dd3c732097c52b80b3d52be9208fce33cd9da))
* add multiline support to text field configuration and redesign field form dialog UI ([c2905e0](https://github.com/cjuriartec/lumacraft/commit/c2905e0abc10d06acda6b9008acb69da45fe7e39))
* add onSuccess callback to CreateCollectionDialog and refresh collections list upon creation ([6416112](https://github.com/cjuriartec/lumacraft/commit/6416112de306ea9ad8811a719f1471b15fe8ef57))
* add optional description field to collection fields and update UI components ([69100aa](https://github.com/cjuriartec/lumacraft/commit/69100aa9e05d66a90a815ebad902d36fc530c5b3))
* add PaintBucket icon to font background color toolbar button ([b160b7e](https://github.com/cjuriartec/lumacraft/commit/b160b7ec86cb5e2817f9ae7407bb269dfc459daf))
* add support for bullet and numbered list styles in template logic blocks ([0bec873](https://github.com/cjuriartec/lumacraft/commit/0bec8732503582bce7bdf9721c84d825380097ff))
* add template editing capabilities, update design tokens, and extend editor node functionality ([000e9eb](https://github.com/cjuriartec/lumacraft/commit/000e9eb11b2115f06db66353dfb77f86d6c8981a))
* add templates tab to collection detail page and update navigation breadcrumbs ([af5ebbb](https://github.com/cjuriartec/lumacraft/commit/af5ebbb53de4212fbfcc0c35ea408cc119e289c1))
* add user avatar support to workspace members and rename Superadmin role to Administrador ([034b96b](https://github.com/cjuriartec/lumacraft/commit/034b96b9ced7363ea986ab1c1c57e036c50316dc))
* **collection:** implement storage, relations & lazy datagrid ([13f31c1](https://github.com/cjuriartec/lumacraft/commit/13f31c18c78108724e8c0637a6d5cec2ea3523e0))
* **collection:** refine detail page aesthetics, implement audit trail, and enhance field validation engine ([4268405](https://github.com/cjuriartec/lumacraft/commit/426840594d440aca585eb02a863a4375fb60de69))
* enable text alignment for image nodes and improve accessibility in template editor dialogs ([4702daf](https://github.com/cjuriartec/lumacraft/commit/4702daf37117457e73c32f8894dbb104c96f68d0))
* implement AI-powered template logic evaluation and account-scoped settings management ([9a2273b](https://github.com/cjuriartec/lumacraft/commit/9a2273b27c260709194ff8fe6864ddb008bfaa59))
* implement centralized dynamic theme system using tailwind variables ([baa6a24](https://github.com/cjuriartec/lumacraft/commit/baa6a24eb2a2e6ae12e1cc8879074274abf3a7d6))
* implement comprehensive role-based access control, workspace member management, and eager-loading infrastructure with associated database migrations. ([4a5fb00](https://github.com/cjuriartec/lumacraft/commit/4a5fb00db55ea8656c4a284ee852ac25f2189d89))
* implement debounced relation filtering and update data grid filter UI ([794c765](https://github.com/cjuriartec/lumacraft/commit/794c7659dfd47b75cd4df4541bf0516d6f80a86e))
* implement dynamic breadcrumb provider and integrate into collections pages ([bc1f1d3](https://github.com/cjuriartec/lumacraft/commit/bc1f1d32b8cb86670254ffebfc5fd078b4959893))
* implement field validation logic and move configuration UI to field creation dialog ([a3d79e0](https://github.com/cjuriartec/lumacraft/commit/a3d79e0832de6fe30fef2cffb99b82b735a282c0))
* implement Gemini AI provider adapter and connection testing use case ([3b6d518](https://github.com/cjuriartec/lumacraft/commit/3b6d518c2d1c0b9238b82f04869cabf689eb8356))
* implement keyboard navigation for variable selector and fix slash command trigger timing ([9df5a74](https://github.com/cjuriartec/lumacraft/commit/9df5a7488db495c200c958f8d4847345dc868ac5))
* implement persistent grid state using local storage and domain-driven use cases ([6b9bf85](https://github.com/cjuriartec/lumacraft/commit/6b9bf85f3e1a30c122004034e0dfb37a8a5af962))
* implement rich text editor toolbar components, file upload infrastructure, and media handling plugins ([70af19f](https://github.com/cjuriartec/lumacraft/commit/70af19fcc8f19f2191562dcbf4e9615f32c12e90))
* implement slash command menu with variable insertion support in template editor ([7a0c1dd](https://github.com/cjuriartec/lumacraft/commit/7a0c1dd27ce3400f17d240da2b3f086fd48408c9))
* implement template logic and AI block compilation system with preview support ([3fdb403](https://github.com/cjuriartec/lumacraft/commit/3fdb403d5abffd43ff94bd5433cc4e9b88b298e0))
* implement template management system with CRUD operations and rich text editor ([95a0e36](https://github.com/cjuriartec/lumacraft/commit/95a0e366906077bffd45505a1fb40c36fd0f171a))
* implement template preview engine with dynamic logic blocks, AI-powered generation, and runtime context resolution ([9f24df3](https://github.com/cjuriartec/lumacraft/commit/9f24df3ee8c43d09724eb80ee8b6674236464d40))
* integrate react-hook-form and zod validation for collections ([ea1d759](https://github.com/cjuriartec/lumacraft/commit/ea1d7592fcc180a9330e0584f3b17d8b1b2b5ef6))


### 🐛 Bug Fixes

* ignore decryption failures in account-scoped AI settings to prevent resolution deadlocks ([aa9ad42](https://github.com/cjuriartec/lumacraft/commit/aa9ad421d0e30be791d7b7b4a882ee32305cad6a))


### 📦 Miscellaneous

* implement husky git hooks, commitlint, and standard-version for automated release management ([a5a48e0](https://github.com/cjuriartec/lumacraft/commit/a5a48e070df55106893a3d6cc341cdce922f65a1))
* remove --webpack flag from dev script in package.json ([b4fd19d](https://github.com/cjuriartec/lumacraft/commit/b4fd19d02bbde5950ffd78be5d0cf18d7da71a79))

## [0.1.0] - 2026-04-06
- Initial release with basic Core and AI modules.
