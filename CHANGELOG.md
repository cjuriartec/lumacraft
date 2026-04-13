# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.8](https://github.com/cjuriartec/lumacraft/compare/v0.1.7...v0.1.8) (2026-04-13)


### ♻️ Code Refactoring

* standardize font size resolution and improve text mark handling in template compilation ([0cea64e](https://github.com/cjuriartec/lumacraft/commit/0cea64e1c4babd3e7fa7013776b9762156d070ab))

### [0.1.7](https://github.com/cjuriartec/lumacraft/compare/v0.1.6...v0.1.7) (2026-04-12)


### ✨ Features

* implement comprehensive user onboarding and guidance system with interactive checklists ([772988c](https://github.com/cjuriartec/lumacraft/commit/772988c8218d57a06d07205ce98f5d001ae20f2f))


### ♻️ Code Refactoring

* remove unused dependency from account settings and debounce workspace snapshot updates ([ec3556e](https://github.com/cjuriartec/lumacraft/commit/ec3556e4d1b881ec7d9516f76996983d07cb1a13))
* update help launcher with expand-on-hover animation and adjust coachmark z-index ([ae788c3](https://github.com/cjuriartec/lumacraft/commit/ae788c3980ea6600a7d0910d4a95c3eddcfb7b06))


### 📦 Miscellaneous

* update package-lock.json dependencies ([d802234](https://github.com/cjuriartec/lumacraft/commit/d8022342af0293401272464391d5ecfe70d6b728))


### 📝 Documentation

* overhaul README with project branding and add CONTRIBUTING guidelines ([f334380](https://github.com/cjuriartec/lumacraft/commit/f334380cb2a9efd858a144918d3eb63d6af0b8e4))

### [0.1.6](https://github.com/cjuriartec/lumacraft/compare/v0.1.5...v0.1.6) (2026-04-12)


### 💄 Styling

* add group class to template logic block containers for hover state support ([e8fe985](https://github.com/cjuriartec/lumacraft/commit/e8fe9850df85cf4833a103f687eeb606a7a70c6e))
* remove text color from selection styling in globals.css ([f1ea50a](https://github.com/cjuriartec/lumacraft/commit/f1ea50aff431b04a43e7c777299f63ff0d93cd51))


### 🚀 Performance Improvements

* optimize template compilation pipeline & fix TS/lint errors ([4816f8e](https://github.com/cjuriartec/lumacraft/commit/4816f8e208c1eb92a5c34e18cef894c3f124cfcf))


### ♻️ Code Refactoring

* improve code formatting and add aria-selected attribute to select item mock ([64a11df](https://github.com/cjuriartec/lumacraft/commit/64a11dfbfa10667eb9e91e8edc4d7e76bad8bca0))
* update template preview placeholder logic and add completion tracking to hook state ([f6d23f3](https://github.com/cjuriartec/lumacraft/commit/f6d23f3a862a964498069c1dc56a95ae6a1acdfb))


### ✨ Features

* add description to record document selector modal for improved accessibility ([48c3fb8](https://github.com/cjuriartec/lumacraft/commit/48c3fb8f4b073e8047518a4daddb772cc7f13a60))
* implement AI text improvement component and integrate into UI forms ([a08caff](https://github.com/cjuriartec/lumacraft/commit/a08caffb4fb873a5b3b0700e33ce6ba0db2a82e8))

### [0.1.5](https://github.com/cjuriartec/lumacraft/compare/v0.1.4...v0.1.5) (2026-04-12)

### ♻️ Code Refactoring

- exclude REVERSE_LOOKUP fields from ER diagram nodes and edges while updating layout styles ([e91185c](https://github.com/cjuriartec/lumacraft/commit/e91185c6c521122fb79c63c690d89dbc33133d92))

### 🐛 Bug Fixes

- add INSERT policy and update WITH CHECK constraints for user_profiles RLS ([f16c821](https://github.com/cjuriartec/lumacraft/commit/f16c821a5f8790f75e4ee2101e92a5012cdfb6c4))
- synchronize package-lock.json with missing dependencies ([4bab719](https://github.com/cjuriartec/lumacraft/commit/4bab7193385b3ae7c159e9398e097533d663e3e4))
- **template:** improve reverse lookup resolution and display in variable fields ([2947bd6](https://github.com/cjuriartec/lumacraft/commit/2947bd68a6beae0952727a35f950f1da78af4145))

### ✨ Features

- add AI variant to logic blocks and update UI styling for improved consistency ([d202e7a](https://github.com/cjuriartec/lumacraft/commit/d202e7adae253ef872c5e123571295c5f41073ea))
- add external link to template in document editor and update alert dialog styling ([9d304cb](https://github.com/cjuriartec/lumacraft/commit/9d304cb4a29e300668040105b4b14169390530eb))
- implement base layout, typography utilities, and global CSS theme configuration ([70d6455](https://github.com/cjuriartec/lumacraft/commit/70d645548d20f2e8aca0a19a85aea8d2d4a26cc1))
- implement interactive ER diagram visualization for workspace schema using React Flow ([a9cd6f5](https://github.com/cjuriartec/lumacraft/commit/a9cd6f5a5dc6f5af09a8584cefab8af7d56dacf4))
- implement persistent user profile preferences for sidebar state and theme settings ([eedc11a](https://github.com/cjuriartec/lumacraft/commit/eedc11a8b1660107f13be94818070dc797209b0b))
- implement user preference synchronization with Supabase and add comprehensive test coverage ([1a1a0c2](https://github.com/cjuriartec/lumacraft/commit/1a1a0c2f0af33881e09c64411f6655d07562a4ef))
- implement workspace statistics dashboard with new use case and repository count methods ([e04c61d](https://github.com/cjuriartec/lumacraft/commit/e04c61d6779bb03776751ec117a735ff6be6c607))

### [0.1.4](https://github.com/cjuriartec/lumacraft/compare/v0.1.3...v0.1.4) (2026-04-11)

### ✨ Features

- add AI fallback configuration fields and dynamically inject app version from package.json ([0c7778a](https://github.com/cjuriartec/lumacraft/commit/0c7778a16baf31d4d2335afa07bc304f2fe10d84))
- add font family selection support and A4 document preview styling ([91ec79b](https://github.com/cjuriartec/lumacraft/commit/91ec79bbeef6c23065b434ebbf508b5768de2b68))
- **collection:** add GetFieldUseCase and support REVERSE_LOOKUP fields in template variables ([5dfd343](https://github.com/cjuriartec/lumacraft/commit/5dfd343c68e6a353e556a6599c9938fc3de77155))
- implement document management system including template compilation, PDF export ([94b0a4c](https://github.com/cjuriartec/lumacraft/commit/94b0a4c74207303fa9bcd41f3cd53b317429c386))
- implement optimistic concurrency control and request queuing for document auto-saves ([7f22c0b](https://github.com/cjuriartec/lumacraft/commit/7f22c0b35c94a1c8b49acf837a1a2e0d7536ba23))
- implement reverse lookup field type with bidirectional relationship support ([a99c3bf](https://github.com/cjuriartec/lumacraft/commit/a99c3bfba80e8dbd5a6cb07ac348e7363663fc64))
- implement Supabase eager loading repository and add template path resolver unit tests ([4b988bd](https://github.com/cjuriartec/lumacraft/commit/4b988bd6eacaf2429e9323d537c64c82dc6872a6))
- implement Supabase eager loading repository and add template variable management UI components ([86168e9](https://github.com/cjuriartec/lumacraft/commit/86168e9e060d73143c033d7950b5140a747b5caa))
- remove legacy document format enum, add static heading components, and verify export modal UI ([b3f17da](https://github.com/cjuriartec/lumacraft/commit/b3f17da33605665a4aa9eaf82ccbd10a5ef068a2))

### 🐛 Bug Fixes

- lineHeight corrected ([4c1f2b2](https://github.com/cjuriartec/lumacraft/commit/4c1f2b2230b0496d5f255593a5f175247f87571e))
- **ui:** update document editor tests and add accessibility labels ([8b6a19e](https://github.com/cjuriartec/lumacraft/commit/8b6a19ee07a10bfa8caf3b4604c24a1be5a33a78))

### [0.1.3](https://github.com/cjuriartec/lumacraft/compare/v0.1.2...v0.1.3) (2026-04-09)

### 📦 Miscellaneous

- enable legacy-peer-deps for CI installation ([e5f5cfd](https://github.com/cjuriartec/lumacraft/commit/e5f5cfdb40f1b5be7e2d6dd53b4f189a45aedb8c))
- stabilize CI with Supabase wait and optimize React 19 overrides ([03c3e67](https://github.com/cjuriartec/lumacraft/commit/03c3e676d86a1060a14903f2a198dcf9d4764145))
- synchronize lock file from clean install ([bb25f47](https://github.com/cjuriartec/lumacraft/commit/bb25f47cb7c7fa91c0255e2ce3eb0a9f6e85ddf3))

### 🐛 Bug Fixes

- **ui:** properly type useFilePicker callback and fix build error ([2fbeb68](https://github.com/cjuriartec/lumacraft/commit/2fbeb68666c5b99d622c13da9eba00541060538e))

### ✅ Tests

- log error details when template creation fails in integration tests ([5d24f4a](https://github.com/cjuriartec/lumacraft/commit/5d24f4ae8c698b74d33d2ceff3038de2a299268a))

### ♻️ Code Refactoring

- standardize Supabase admin to use SUPABASE_SECRET_KEY and add setup-local unit tests ([4fa9c93](https://github.com/cjuriartec/lumacraft/commit/4fa9c938da12d326755f82d96d76e9b26b83855e))

### 📝 Documentation

- update README with Next.js 16, new architectural components, and revised setup instructions ([55a7120](https://github.com/cjuriartec/lumacraft/commit/55a7120909ea055cfcf6effcf7a536c2ea781c03))
- update Sprint 6 status to completed in sprint planning document ([6d888bf](https://github.com/cjuriartec/lumacraft/commit/6d888bf2d4232f6bf44d37cf2ef35650738a0907))

### ✨ Features

- add DocumentNormalizationPlugin to ensure trailing paragraph after logic blocks ([1d0578d](https://github.com/cjuriartec/lumacraft/commit/1d0578ddc9cfa4297207f50823c677f61e004669))
- add text formatting and transformation support to variable blocks in PDF renderer and editor ([33eda64](https://github.com/cjuriartec/lumacraft/commit/33eda64145f48949c926b6ae67bf6dc6b73237db))
- edge AI provider architecture; migrate adapters for serverless execution ([51914a2](https://github.com/cjuriartec/lumacraft/commit/51914a24b1bd09683d8d758505d87d733787db88))
- enhance export record modal with animated progress states and refined UI design ([94c32d4](https://github.com/cjuriartec/lumacraft/commit/94c32d4173073ae9d2c86e1619119284cf3eee98))
- implement AI provider fallback mechanism with database schema updates and auto-saving UI ([de0d9ab](https://github.com/cjuriartec/lumacraft/commit/de0d9abd6a1a4a5b49d82f753511951d73943471))
- implement native DOCX generation in document-exporter and allow text/plain in exports bucket ([061d52f](https://github.com/cjuriartec/lumacraft/commit/061d52f0dd31c9b2aa92a36daed1f4f5b30e27f7))
- support custom lineHeight in table cells and standardize global text styling ([245fd31](https://github.com/cjuriartec/lumacraft/commit/245fd31a45b42a5da9652d634554ff30147167d6))
- **template:** high-fidelity PDF export with @react-pdf/renderer ([2ce1899](https://github.com/cjuriartec/lumacraft/commit/2ce1899d704e547720a9cd59058f1c15932ce33b))
- update export file naming to use template and record IDs with upsert support ([d976ff8](https://github.com/cjuriartec/lumacraft/commit/d976ff862fd9bf09a84e95d50c376ee115eaf33b))

### [0.1.2](https://github.com/cjuriartec/lumacraft/compare/v0.1.1...v0.1.2) (2026-04-07)

### 📦 Miscellaneous

- exclude husky internals in .gitignore ([0c0bf43](https://github.com/cjuriartec/lumacraft/commit/0c0bf43fb1909a92a2faf0cfde5655930e8af4d3))

### ✨ Features

- login page and supabase integration ([a3418a7](https://github.com/cjuriartec/lumacraft/commit/a3418a7c792307fba4b5b281cfeec05bbdbf99e2))

### 0.1.1 (2026-04-06)

### ♻️ Code Refactoring

- decouple TemplateCreateDialog from hooks and implement comprehensive unit and integration tests for template use cases ([8676aba](https://github.com/cjuriartec/lumacraft/commit/8676abaaa88639883279dd5af22478d11c260f15))
- implement domain value objects and consolidate collection use cases with a factory pattern ([045fa10](https://github.com/cjuriartec/lumacraft/commit/045fa10348a9cdcd541fb79bd6d99dba571abf81))
- implement text justification, asynchronous block compilation, and context-aware image resolution in template preview services. ([d629c1d](https://github.com/cjuriartec/lumacraft/commit/d629c1da1695bd2c8ab273c2f9aee45e0a6c3ed8))
- modernize login page UI with theme-aware styling and loading state feedback ([1730a02](https://github.com/cjuriartec/lumacraft/commit/1730a02b68ad5e9bc98d74e9373f9ca120987197))
- redesign login page with enhanced visual branding and hydration fix ([563f256](https://github.com/cjuriartec/lumacraft/commit/563f256f5a93fe0ba1f5e34e3844da5830ab8a84))
- redesign user menu component with updated styling and layout structure ([7f120c5](https://github.com/cjuriartec/lumacraft/commit/7f120c5e5c5156a8ffd2740ffbc22e6ce7708281))
- simplify TemplatePreviewPanel by removing collection-linked record generation logic ([5e644b9](https://github.com/cjuriartec/lumacraft/commit/5e644b9815efbaca6e3400f8e50a90db77518e6e))
- update preview button styling and position in template editor page ([b637809](https://github.com/cjuriartec/lumacraft/commit/b637809c814c6f31c05244882aea1e89328b4b19))

### 💄 Styling

- add bottom padding to data grid container and update search input background opacity ([f2279fc](https://github.com/cjuriartec/lumacraft/commit/f2279fce765e5f531ed67a4c031b2c03878d252f))
- center image container and remove invalid size-full! utility class ([7b5bd20](https://github.com/cjuriartec/lumacraft/commit/7b5bd207fad2dc635035bcafcefc900b0bd0495e))
- update image-element class to force full size with important modifier ([d703e33](https://github.com/cjuriartec/lumacraft/commit/d703e333ef50d71e77d47463d9fb7b9af2d493bc))

### 📝 Documentation

- add project planning documentation ([9836422](https://github.com/cjuriartec/lumacraft/commit/9836422cbf9e21e0d68f3353c08c8a2e1810fcdd))
- update Sprint 9 planning with advanced relationship support and cardinality validation ([89bd543](https://github.com/cjuriartec/lumacraft/commit/89bd54319f80c5d88e66ddd4248cfc3069c832c7))
- update sprint planning status for Sprints 2, 3, and 4 ([cf400fa](https://github.com/cjuriartec/lumacraft/commit/cf400fa960d40016381a0f35cee5b4b3fd1e87ae))

### ✨ Features

- add alignment support for image variable blocks with UI controls ([806f491](https://github.com/cjuriartec/lumacraft/commit/806f491c9f7415e69b8fd8777160ba0e99aff1d1))
- add IMAGE field type support to domain, repository, and UI components ([3ef20eb](https://github.com/cjuriartec/lumacraft/commit/3ef20ebda52c43a753ab450a4d477de9fd0aa347))
- add indent/outdent controls, implement background color picker, and prune unused editor block types. ([167dd3c](https://github.com/cjuriartec/lumacraft/commit/167dd3c732097c52b80b3d52be9208fce33cd9da))
- add multiline support to text field configuration and redesign field form dialog UI ([c2905e0](https://github.com/cjuriartec/lumacraft/commit/c2905e0abc10d06acda6b9008acb69da45fe7e39))
- add onSuccess callback to CreateCollectionDialog and refresh collections list upon creation ([6416112](https://github.com/cjuriartec/lumacraft/commit/6416112de306ea9ad8811a719f1471b15fe8ef57))
- add optional description field to collection fields and update UI components ([69100aa](https://github.com/cjuriartec/lumacraft/commit/69100aa9e05d66a90a815ebad902d36fc530c5b3))
- add PaintBucket icon to font background color toolbar button ([b160b7e](https://github.com/cjuriartec/lumacraft/commit/b160b7ec86cb5e2817f9ae7407bb269dfc459daf))
- add support for bullet and numbered list styles in template logic blocks ([0bec873](https://github.com/cjuriartec/lumacraft/commit/0bec8732503582bce7bdf9721c84d825380097ff))
- add template editing capabilities, update design tokens, and extend editor node functionality ([000e9eb](https://github.com/cjuriartec/lumacraft/commit/000e9eb11b2115f06db66353dfb77f86d6c8981a))
- add templates tab to collection detail page and update navigation breadcrumbs ([af5ebbb](https://github.com/cjuriartec/lumacraft/commit/af5ebbb53de4212fbfcc0c35ea408cc119e289c1))
- add user avatar support to workspace members and rename Superadmin role to Administrador ([034b96b](https://github.com/cjuriartec/lumacraft/commit/034b96b9ced7363ea986ab1c1c57e036c50316dc))
- **collection:** implement storage, relations & lazy datagrid ([13f31c1](https://github.com/cjuriartec/lumacraft/commit/13f31c18c78108724e8c0637a6d5cec2ea3523e0))
- **collection:** refine detail page aesthetics, implement audit trail, and enhance field validation engine ([4268405](https://github.com/cjuriartec/lumacraft/commit/426840594d440aca585eb02a863a4375fb60de69))
- enable text alignment for image nodes and improve accessibility in template editor dialogs ([4702daf](https://github.com/cjuriartec/lumacraft/commit/4702daf37117457e73c32f8894dbb104c96f68d0))
- implement AI-powered template logic evaluation and account-scoped settings management ([9a2273b](https://github.com/cjuriartec/lumacraft/commit/9a2273b27c260709194ff8fe6864ddb008bfaa59))
- implement centralized dynamic theme system using tailwind variables ([baa6a24](https://github.com/cjuriartec/lumacraft/commit/baa6a24eb2a2e6ae12e1cc8879074274abf3a7d6))
- implement comprehensive role-based access control, workspace member management, and eager-loading infrastructure with associated database migrations. ([4a5fb00](https://github.com/cjuriartec/lumacraft/commit/4a5fb00db55ea8656c4a284ee852ac25f2189d89))
- implement debounced relation filtering and update data grid filter UI ([794c765](https://github.com/cjuriartec/lumacraft/commit/794c7659dfd47b75cd4df4541bf0516d6f80a86e))
- implement dynamic breadcrumb provider and integrate into collections pages ([bc1f1d3](https://github.com/cjuriartec/lumacraft/commit/bc1f1d32b8cb86670254ffebfc5fd078b4959893))
- implement field validation logic and move configuration UI to field creation dialog ([a3d79e0](https://github.com/cjuriartec/lumacraft/commit/a3d79e0832de6fe30fef2cffb99b82b735a282c0))
- implement Gemini AI provider adapter and connection testing use case ([3b6d518](https://github.com/cjuriartec/lumacraft/commit/3b6d518c2d1c0b9238b82f04869cabf689eb8356))
- implement keyboard navigation for variable selector and fix slash command trigger timing ([9df5a74](https://github.com/cjuriartec/lumacraft/commit/9df5a7488db495c200c958f8d4847345dc868ac5))
- implement persistent grid state using local storage and domain-driven use cases ([6b9bf85](https://github.com/cjuriartec/lumacraft/commit/6b9bf85f3e1a30c122004034e0dfb37a8a5af962))
- implement rich text editor toolbar components, file upload infrastructure, and media handling plugins ([70af19f](https://github.com/cjuriartec/lumacraft/commit/70af19fcc8f19f2191562dcbf4e9615f32c12e90))
- implement slash command menu with variable insertion support in template editor ([7a0c1dd](https://github.com/cjuriartec/lumacraft/commit/7a0c1dd27ce3400f17d240da2b3f086fd48408c9))
- implement template logic and AI block compilation system with preview support ([3fdb403](https://github.com/cjuriartec/lumacraft/commit/3fdb403d5abffd43ff94bd5433cc4e9b88b298e0))
- implement template management system with CRUD operations and rich text editor ([95a0e36](https://github.com/cjuriartec/lumacraft/commit/95a0e366906077bffd45505a1fb40c36fd0f171a))
- implement template preview engine with dynamic logic blocks, AI-powered generation, and runtime context resolution ([9f24df3](https://github.com/cjuriartec/lumacraft/commit/9f24df3ee8c43d09724eb80ee8b6674236464d40))
- integrate react-hook-form and zod validation for collections ([ea1d759](https://github.com/cjuriartec/lumacraft/commit/ea1d7592fcc180a9330e0584f3b17d8b1b2b5ef6))

### 🐛 Bug Fixes

- ignore decryption failures in account-scoped AI settings to prevent resolution deadlocks ([aa9ad42](https://github.com/cjuriartec/lumacraft/commit/aa9ad421d0e30be791d7b7b4a882ee32305cad6a))

### 📦 Miscellaneous

- implement husky git hooks, commitlint, and standard-version for automated release management ([a5a48e0](https://github.com/cjuriartec/lumacraft/commit/a5a48e070df55106893a3d6cc341cdce922f65a1))
- remove --webpack flag from dev script in package.json ([b4fd19d](https://github.com/cjuriartec/lumacraft/commit/b4fd19d02bbde5950ffd78be5d0cf18d7da71a79))

## [0.1.0] - 2026-04-06

- Initial release with basic Core and AI modules.
