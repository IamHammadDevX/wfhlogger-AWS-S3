# Graph Report - .  (2026-07-09)

## Corpus Check
- 116 files · ~331,798 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 746 nodes · 1158 edges · 47 communities (36 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Express Server Core|Express Server Core]]
- [[_COMMUNITY_Audit & Form UI Components|Audit & Form UI Components]]
- [[_COMMUNITY_SQLite Database Layer|SQLite Database Layer]]
- [[_COMMUNITY_Desktop Python Client|Desktop Python Client]]
- [[_COMMUNITY_Backend Dependencies|Backend Dependencies]]
- [[_COMMUNITY_Public Pages & Auth Views|Public Pages & Auth Views]]
- [[_COMMUNITY_Frontend Dev Dependencies|Frontend Dev Dependencies]]
- [[_COMMUNITY_UI Component Library Structure|UI Component Library Structure]]
- [[_COMMUNITY_Email Notifications|Email Notifications]]
- [[_COMMUNITY_Timezone & Employee Helpers|Timezone & Employee Helpers]]
- [[_COMMUNITY_Legal & Contact Pages|Legal & Contact Pages]]
- [[_COMMUNITY_Skiper UI Components|Skiper UI Components]]
- [[_COMMUNITY_Billing, Layout & Credits|Billing, Layout & Credits]]
- [[_COMMUNITY_Subscription Billing Engine|Subscription Billing Engine]]
- [[_COMMUNITY_Payments & Invoices|Payments & Invoices]]
- [[_COMMUNITY_LiveView & Socket.IO Client|LiveView & Socket.IO Client]]
- [[_COMMUNITY_Homepage & Animations|Homepage & Animations]]
- [[_COMMUNITY_Employee Layout & Dashboard|Employee Layout & Dashboard]]
- [[_COMMUNITY_Time Tracking & Reports UI|Time Tracking & Reports UI]]
- [[_COMMUNITY_Google Drive Verification|Google Drive Verification]]
- [[_COMMUNITY_API Client Config|API Client Config]]
- [[_COMMUNITY_S3 Storage Manager|S3 Storage Manager]]
- [[_COMMUNITY_Revenue Charts (Super Admin)|Revenue Charts (Super Admin)]]
- [[_COMMUNITY_Stripe Webhook & Invoice Pipeline|Stripe Webhook & Invoice Pipeline]]
- [[_COMMUNITY_JSConfig Path Aliases|JSConfig Path Aliases]]
- [[_COMMUNITY_DatePicker Component|DatePicker Component]]
- [[_COMMUNITY_Razorpay (Disabled)|Razorpay (Disabled)]]
- [[_COMMUNITY_Vercel Config|Vercel Config]]
- [[_COMMUNITY_Audit Log Builders|Audit Log Builders]]
- [[_COMMUNITY_Rate Limiting & Preview Tokens|Rate Limiting & Preview Tokens]]
- [[_COMMUNITY_Bootstrap & Env Loading|Bootstrap & Env Loading]]
- [[_COMMUNITY_WorkSession Mongoose Model|WorkSession Mongoose Model]]
- [[_COMMUNITY_User Creation & Super Admin Seed|User Creation & Super Admin Seed]]
- [[_COMMUNITY_Billing Scheduler Helpers|Billing Scheduler Helpers]]
- [[_COMMUNITY_Password Reset Tokens|Password Reset Tokens]]
- [[_COMMUNITY_Screenshot Mongoose Model|Screenshot Mongoose Model]]
- [[_COMMUNITY_User Mongoose Model|User Mongoose Model]]
- [[_COMMUNITY_MongoDB Connector|MongoDB Connector]]
- [[_COMMUNITY_Env Validation Guards|Env Validation Guards]]

## God Nodes (most connected - your core abstractions)
1. `TimeTrackerApp` - 36 edges
2. `usePagination()` - 27 edges
3. `resolveApiBase()` - 23 edges
4. `renderEmail()` - 15 edges
5. `sendEmail()` - 14 edges
6. `runEmployeeMonthlyBilling()` - 14 edges
7. `escapeHtml()` - 12 edges
8. `stripeWebhookHandler()` - 11 edges
9. `tenantUrl()` - 10 edges
10. `useCredits()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `getSocket()` --calls--> `io`  [INFERRED]
  web/src/socket.js → backend/src/server.js
- `cn()` --calls--> `clsx`  [INFERRED]
  web/src/lib/utils.js → web/package.json
- `BrandHeader()` --calls--> `resolveApiBase()`  [EXTRACTED]
  web/src/components/Sidebar.jsx → web/src/api.js
- `Link000()` --calls--> `cn()`  [INFERRED]
  web/src/components/ui/skiper-ui/skiper40.jsx → web/src/lib/utils.js
- `Link001()` --calls--> `cn()`  [INFERRED]
  web/src/components/ui/skiper-ui/skiper40.jsx → web/src/lib/utils.js

## Communities (47 total, 11 thin omitted)

### Community 0 - "Express Server Core"
Cohesion: 0.01
Nodes (199): absFile, accept, active, activeSeconds, activities, actorQ, actorUser, admin (+191 more)

### Community 1 - "Audit & Form UI Components"
Cohesion: 0.06
Nodes (25): AuditDetailsDrawer(), CountrySelect(), SearchableSelect(), TextField(), TimezoneSelect(), useFilteredOptions(), CompanyPicker(), ConfirmGrantModal() (+17 more)

### Community 2 - "SQLite Database Layer"
Cohesion: 0.04
Nodes (42): activateCompany(), arr, compInfo, createCompany(), createOrganization(), createPasswordResetToken(), createTimeRequest(), dbPath (+34 more)

### Community 3 - "Desktop Python Client"
Cohesion: 0.10
Nodes (3): main(), TimeTrackerApp, abs

### Community 4 - "Backend Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, archiver, @aws-sdk/client-s3, base64-js, bcryptjs, cors, dotenv, express (+21 more)

### Community 5 - "Public Pages & Auth Views"
Cohesion: 0.09
Nodes (4): resolveApiBase(), RedirectToTenant(), TenantGuard(), ThemeProvider()

### Community 6 - "Frontend Dev Dependencies"
Cohesion: 0.08
Nodes (24): devDependencies, autoprefixer, babel-plugin-react-compiler, baseline-browser-mapping, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+16 more)

### Community 7 - "UI Component Library Structure"
Cohesion: 0.09
Nodes (22): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+14 more)

### Community 8 - "Email Notifications"
Cohesion: 0.29
Nodes (20): buildTenantLogoAttachment(), escapeHtml(), normalizeAppUrl(), renderEmail(), RESEND_API_KEY, sendAccountSuspensionWarning(), sendActivationEmail(), sendContactFormEmail() (+12 more)

### Community 9 - "Timezone & Employee Helpers"
Cohesion: 0.14
Nodes (20): enrich(), getEmployeeTimezone(), getTeamEmailsForManager(), keysBack(), listScopedEmployeeEmails(), parseMaybeDate(), readUsers(), setEmployeeTimezone() (+12 more)

### Community 10 - "Legal & Contact Pages"
Cohesion: 0.15
Nodes (4): H2(), LegalPage(), PublicShell(), SupportRequestForm()

### Community 11 - "Skiper UI Components"
Cohesion: 0.13
Nodes (17): cn(), Link000(), Link001(), Link002(), Link003(), Link004(), Link005(), dependencies (+9 more)

### Community 12 - "Billing, Layout & Credits"
Cohesion: 0.22
Nodes (8): Layout(), BrandHeader(), Icons, Sidebar(), Billing(), CreditsContext, CreditsProvider(), useCredits()

### Community 13 - "Subscription Billing Engine"
Cohesion: 0.32
Nodes (12): createTransaction(), debitCompanyWithTransaction(), ensureEmployeeBillingForCompany(), getCompanyById(), listAllUsers(), listCompanies(), listDueEmployeeBillingsForCompany(), listUsersByCompany() (+4 more)

### Community 14 - "Payments & Invoices"
Cohesion: 0.26
Nodes (11): ensureDir(), formatCurrency(), formatDate(), generateInvoicePdf(), buildReturnUrl(), createStripeCheckoutSession(), initStripe(), listRecentCheckoutSessions() (+3 more)

### Community 15 - "LiveView & Socket.IO Client"
Cohesion: 0.24
Nodes (7): API, getApiBase(), getWebSocketBase(), io, getSocket(), listeners, parseToken()

### Community 16 - "Homepage & Animations"
Cohesion: 0.18
Nodes (7): features, Home(), sidebarItems, stats, testimonials, timeEntries, useApiBase()

### Community 18 - "Employee Layout & Dashboard"
Cohesion: 0.25
Nodes (5): EmployeeSidebar(), Icons, EmployeeDashboard(), ThemeContext, useTheme()

### Community 19 - "Time Tracking & Reports UI"
Cohesion: 0.22
Nodes (4): formatDuration(), TimeTracking(), formatBytes(), StorageQuotaBadge()

### Community 20 - "Google Drive Verification"
Cohesion: 0.22
Nodes (5): body, rec, refresh, shots, tokens

### Community 21 - "API Client Config"
Cohesion: 0.28
Nodes (8): apiGet(), apiPost(), base, cachedBase, candidates, checks, getApiBaseSync(), validCandidates

### Community 22 - "S3 Storage Manager"
Cohesion: 0.50
Nodes (7): deleteScreenshotsByEmployee(), getCompanyStorageQuota(), getS3Client(), getScreenshotStream(), getStorageQuota(), screenshotKey(), uploadScreenshot()

### Community 24 - "Stripe Webhook & Invoice Pipeline"
Cohesion: 0.29
Nodes (7): stripeWebhookHandler(), applyStripeCheckoutCreditsOnce(), createInvoice(), creditCompanyWithTransaction(), getNextInvoiceNo(), markWebhookEventProcessed(), setInvoicePdfPath()

### Community 25 - "JSConfig Path Aliases"
Cohesion: 0.33
Nodes (5): compilerOptions, baseUrl, ignoreDeprecations, paths, @/*

### Community 26 - "DatePicker Component"
Cohesion: 0.60
Nodes (3): DatePicker(), pad2(), toYmd()

### Community 28 - "Vercel Config"
Cohesion: 0.50
Nodes (3): orgId, projectId, projectName

### Community 29 - "Audit Log Builders"
Cohesion: 0.67
Nodes (3): buildSummary(), getActorKey(), getEmployeeKey()

### Community 30 - "Rate Limiting & Preview Tokens"
Cohesion: 0.67
Nodes (3): checkRate(), now, verifyPreviewToken()

## Knowledge Gaps
- **320 isolated node(s):** `name`, `version`, `private`, `type`, `start` (+315 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `io` connect `LiveView & Socket.IO Client` to `Express Server Core`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Why does `getSocket()` connect `LiveView & Socket.IO Client` to `Admin Sidebar Icons`, `Employee Layout & Dashboard`, `Billing, Layout & Credits`, `Public Pages & Auth Views`?**
  _High betweenness centrality (0.294) - this node is a cross-community bridge._
- **Why does `resolveApiBase()` connect `Public Pages & Auth Views` to `Audit & Form UI Components`, `Billing, Layout & Credits`, `LiveView & Socket.IO Client`, `Homepage & Animations`, `Admin Sidebar Icons`, `Time Tracking & Reports UI`, `API Client Config`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _320 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Express Server Core` be split into smaller, more focused modules?**
  _Cohesion score 0.00904977375565611 - nodes in this community are weakly interconnected._
- **Should `Audit & Form UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06120218579234973 - nodes in this community are weakly interconnected._
- **Should `SQLite Database Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._