# Identity Provider Evaluation

**Date:** February 2026
**Goal:** Choose a free, open-source identity provider to hand off authentication from an open-source web app.

Disclaimer: This analysis was completely done by AI with some human guidelines it must look for.

## Requirements Summary

| # | Requirement | Priority |
|---|------------|----------|
| 1 | OIDC social logins (Google, Microsoft, Apple, GitHub, ...) | Must |
| 2 | Basic email/password authentication | Must |
| 3 | User management (reset password, admin dashboard) | Must |
| 4 | Provides login UI (SDK or redirect-based) | Must |
| 5 | Fully open source, no resource-based limits in OSS version | Must |
| 6 | Free to self-host without per-user or per-resource restrictions | Must |
| 7 | Multi-tenant support | Nice |
| 8 | Paid support only (all features in OSS) | Preferred |
| 9 | Extensible (header-based auth, custom auth flows) | Nice |

---

## Candidates Overview

| Provider | License | Language | GitHub Stars | Self-Host | Login UI | OIDC Provider | Acts as IdP |
|----------|---------|----------|-------------|-----------|----------|--------------|-------------|
| **Keycloak** | Apache 2.0 | Java | 26k+ | Yes | Yes (redirect) | Yes | Yes |
| **ZITADEL** | AGPL-3.0 | Go | 12.9k | Yes | Yes (redirect) | Yes (certified) | Yes |
| **Logto** | MPL-2.0 | TypeScript | 11.6k | Yes | Yes (redirect) | Yes | Yes |
| **authentik** | Source-available* | Python | 15k+ | Yes | Yes (redirect) | Yes | Yes |
| **Ory (Kratos+Hydra)** | Apache 2.0 | Go | 12k+ (combined) | Yes | Headless (BYO UI) | Yes | Yes |
| **Hanko** | AGPL-3.0 | Go | 8.8k | Yes | Yes (web components) | Limited | No |
| **SuperTokens** | Apache 2.0 | Java (core) | 12k+ | Yes | Yes (SDK embeds) | No (not an IdP) | No |
| **Casdoor** | Apache 2.0 | Go | 10k+ | Yes | Yes (redirect) | Yes | Yes |
| **FusionAuth** | Proprietary (free tier) | Java | N/A | Yes | Yes (redirect) | Yes | Yes |
| **Better Auth** | MIT | TypeScript | 8k+ | N/A (library) | No (BYO UI) | No | No |
| **Authelia** | Apache 2.0 | Go | 23k+ | Yes | Yes (portal) | Yes (certified) | Partial |
| **Dex** | Apache 2.0 | Go | 10.6k | Yes | Yes (redirect, basic) | Yes | Yes (federation only) |
| **Rauthy** | Apache 2.0 | Rust | 942 | Yes | Yes (redirect) | Yes | Yes |
| **FerrisKey** | Apache 2.0 | Rust | 524 | Yes | Yes (redirect) | Yes | Yes |

\* authentik open-source edition is "source available" (not a standard OSS license); enterprise features require paid license.

---

## Detailed Evaluation

### 1. Keycloak

**Website:** https://www.keycloak.org/
**License:** Apache 2.0
**Backed by:** Red Hat / CNCF (incubation project)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Excellent | Google, Microsoft, Apple, GitHub, Facebook, and any custom OIDC/SAML provider |
| Email/Password | Yes | Built-in with configurable password policies |
| User Management | Excellent | Full admin console, user federation, password reset, account self-service |
| Login UI | Yes | Hosted login pages via redirect; fully themeable |
| OSS Limits | **None** | Fully open source, no user/resource limits whatsoever |
| Multi-Tenant | Yes | Via "realms" - each realm is an isolated tenant |
| Extensibility | Excellent | Custom authenticators, SPI extensions, user federation SPIs, protocol mappers |
| Paid-only Features | **None** | Everything is in the open source version |
| Maturity | Very High | Battle-tested for 10+ years, massive community, CNCF incubation |

**Pros:**
- The most mature and feature-complete open-source IdP
- Truly zero restrictions - Apache 2.0 license, no gated features
- Enormous community and ecosystem
- OIDC Certified, supports SAML 2.0, LDAP, Kerberos
- Extensible via Java SPIs (custom authenticators, user storage, etc.)
- Excellent multi-tenancy via realms

**Cons:**
- Java-based, heavier resource footprint (~512MB+ RAM minimum)
- Admin UI and theming can feel dated
- Steeper learning curve for initial setup
- No embedded SDK/web component approach; always redirect-based
- Requires more DevOps effort to operate in production

**Verdict:** Best choice if you want maximum features, zero restrictions, and proven stability. The gold standard for self-hosted open-source IdPs.

---

### 2. ZITADEL

**Website:** https://zitadel.com/
**License:** AGPL-3.0 (commercial license available)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Excellent | All major providers, custom OIDC/SAML |
| Email/Password | Yes | Built-in |
| User Management | Excellent | Console UI, self-service portal, admin APIs |
| Login UI | Yes | Hosted login (redirect), new V2 login in beta |
| OSS Limits | **None** | All features available in OSS, unlimited users |
| Multi-Tenant | Excellent | Native multi-tenancy with organizations, best-in-class B2B support |
| Extensibility | Good | Actions (custom code on events), webhooks, GRPC/REST APIs |
| Paid-only Features | **None** (cloud extras are hosting/support only) |
| Maturity | High | OIDC Certified, ISO 27001, event-sourced architecture |

**Pros:**
- Purpose-built for multi-tenancy (organizations, role delegation, domain discovery)
- Single Go binary, lightweight and fast to deploy
- Event-sourced architecture provides unlimited audit trail
- All features available in self-hosted version
- OIDC Certified, SAML 2.0, LDAP, SCIM 2.0 support
- Cloud free tier includes 25K daily active users

**Cons:**
- AGPL-3.0 license may be a concern if embedding in proprietary code (but fine for using as a service)
- Younger project than Keycloak, smaller ecosystem
- Custom extensibility more limited than Keycloak's SPI system
- Login UI customization is good but not as mature as Keycloak's theming

**Verdict:** Excellent choice, especially for B2B/multi-tenant scenarios. True open-source with no limits. The Go-based architecture makes it lighter than Keycloak.

---

### 3. Logto

**Website:** https://logto.io/
**License:** MPL-2.0

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Excellent | 30+ connectors, custom OIDC/SAML |
| Email/Password | Yes | Built-in |
| User Management | Good | Admin console, user management, audit logs |
| Login UI | Yes | Beautiful pre-built sign-in experience (redirect), customizable |
| OSS Limits | **Minor** | OSS is fully functional but some enterprise features (SSO connectors) may have limits in cloud |
| Multi-Tenant | Yes | Organizations with RBAC, JIT provisioning |
| Extensibility | Moderate | Custom token claims, webhooks, custom CSS/UI |
| Paid-only Features | Some cloud-only features (Enterprise SSO at $48/connector, SAML apps at $96/app) |
| Maturity | Medium | Modern, actively developed, growing community |

**Pros:**
- Modern, developer-friendly with excellent documentation
- Beautiful default login UI with customization options
- SDKs for 30+ frameworks
- Good multi-tenancy via organizations
- MPL-2.0 is a permissive copyleft license
- Token-based pricing model (cloud) is cost-effective

**Cons:**
- Self-hosted version may lack some enterprise features available in cloud
- Enterprise SSO and SAML apps are priced add-ons in cloud
- TypeScript/Node.js stack may not suit all environments
- Requires PostgreSQL
- Younger project, smaller community than Keycloak/ZITADEL

**Verdict:** Great developer experience and modern architecture. Good for projects that value ease of integration. Check if the self-hosted version includes all features you need.

---

### 4. authentik

**Website:** https://goauthentik.io/
**License:** Source-available (not a traditional OSS license); enterprise features require paid subscription

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | Standard social providers |
| Email/Password | Yes | Built-in |
| User Management | Good | Web UI, user management, audit logs |
| Login UI | Yes | Full web portal (redirect) |
| OSS Limits | **Moderate** | Core is source-available; enterprise features (Google Workspace, Entra ID integrations, mTLS, etc.) require $5/user/month |
| Multi-Tenant | Partial | Via tenants, but less sophisticated than ZITADEL |
| Extensibility | Good | Flows & stages system, customizable policies, proxy provider |
| Paid-only Features | Yes - enterprise integrations, enhanced audit logging, device trust, compliance features |
| Maturity | Medium-High | Over 1M installations, used by Cloudflare, CoreWeave |

**Pros:**
- Very flexible flow system for customizing authentication
- Proxy provider for legacy apps without OIDC/SAML support
- Application proxy with RDP/SSH/VNC support (unique feature)
- Supports OIDC, SAML, LDAP, RADIUS, SCIM, Kerberos
- Strong presence in homelab/self-hosted community

**Cons:**
- **Not truly open source** - source-available license with enterprise gating
- Enterprise features cost $5/internal user/month
- No hosted service available (self-host only)
- Python-based, can be heavier than Go alternatives
- Guarantee that OSS features won't become enterprise-only, but enterprise features stay paid

**Verdict:** Powerful and flexible, but the source-available licensing and paid enterprise features make it a **partial fit** for the stated requirements. The gated features may matter for your use case.

---

### 5. Ory (Kratos + Hydra + Oathkeeper + Keto)

**Website:** https://www.ory.sh/
**License:** Apache 2.0 (open source components)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | Via Kratos identity providers |
| Email/Password | Yes | Via Kratos |
| User Management | Moderate | API-driven, no built-in admin UI (Ory Network has console) |
| Login UI | **No** | Headless - you must build your own UI (Ory Elements available as reference) |
| OSS Limits | **None** | Apache 2.0, no restrictions |
| Multi-Tenant | Via Ory Network | Multi-tenancy is a cloud feature |
| Extensibility | Excellent | Modular architecture, webhooks, Jsonnet data mappers |
| Paid-only Features | Cloud features (console, managed hosting, enterprise support) |
| Maturity | High | Used by OpenAI, Mistral AI; billions of API requests |

**Pros:**
- Truly modular: use only what you need (Kratos for identity, Hydra for OAuth2, Keto for permissions)
- Apache 2.0 license for all core components
- Used by major companies (OpenAI, Axel Springer)
- Cloud-native, stateless, horizontally scalable
- Excellent for microservices architectures

**Cons:**
- **No built-in login UI** - you must build your own
- Requires deploying and managing multiple services
- Steep learning curve
- Admin console only in Ory Network (paid)
- Multi-tenancy primarily a cloud feature
- Higher operational complexity

**Verdict:** Technically excellent and truly open source, but the headless approach (no login UI) and operational complexity make it a harder sell if you want to "hand off" auth quickly. Best for teams with strong DevOps capabilities.

---

### 6. Hanko

**Website:** https://www.hanko.io/
**License:** AGPL-3.0 (backend), MIT (frontend elements)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | Google, Apple, GitHub, custom OIDC providers |
| Email/Password | Yes | Plus passkeys, passcodes |
| User Management | Basic | API-based, limited admin dashboard |
| Login UI | Yes | Hanko Elements web components (embed in your app) |
| OSS Limits | **None** | No user limits |
| Multi-Tenant | **No** | Not available, on roadmap |
| Extensibility | Moderate | Webhooks, API-first |
| Paid-only Features | Hanko Cloud adds hosting |
| Maturity | Medium | Focused on passkeys/passwordless |

**Pros:**
- Modern passkey-first approach
- Web components that embed directly in your app (no redirect needed)
- Lightweight Go backend
- Good for passwordless-first applications

**Cons:**
- **Not an OIDC/OAuth2 provider** - doesn't act as an IdP for other apps
- No multi-tenant support yet
- Smaller feature set compared to Keycloak/ZITADEL
- Organizations, roles, and permissions still in progress
- AGPL-3.0 license for backend

**Verdict:** Good for passkey/passwordless-focused apps, but lacks the IdP capabilities (OIDC provider, multi-tenant) needed for a full identity provider solution. Not suitable if you need to protect multiple apps via standard protocols.

---

### 7. SuperTokens

**Website:** https://supertokens.com/
**License:** Apache 2.0 (core)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | Google, GitHub, Facebook, Apple, custom providers |
| Email/Password | Yes | Built-in |
| User Management | Good | Dashboard with user management |
| Login UI | Yes | Pre-built UI components (embed in app, no redirect) |
| OSS Limits | **None for core** | Self-hosted core features are free and unlimited |
| Multi-Tenant | Yes (paid) | Multi-tenancy is a paid add-on ($100/month minimum) |
| Extensibility | Good | Override hooks, custom actions |
| Paid-only Features | Yes - MFA ($0.01/MAU), account linking ($0.005/MAU), multi-tenancy (paid) |
| Maturity | Medium | YC-backed, used in production |

**Pros:**
- Core authentication is truly free and unlimited when self-hosted
- Pre-built UI that embeds in your app (no redirect needed)
- Session management with cookie-based approach (unique)
- Good SDK support (React, Node, Python, Go, etc.)
- Apache 2.0 license

**Cons:**
- **Not an OIDC/OAuth2 provider** - it's an auth library, not an IdP
- MFA, account linking, and multi-tenancy are paid features
- Paid features have minimum billing of $100/month
- Self-hosted paid features still cost money
- Smaller scope than full IdP solutions

**Verdict:** Good authentication library but **not an identity provider**. Cannot act as an OIDC provider for multiple apps. Paid add-ons for MFA and multi-tenancy violate the "no paid feature gates" requirement.

---

### 8. Casdoor

**Website:** https://casdoor.org/
**License:** Apache 2.0

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Excellent | 100+ identity providers supported |
| Email/Password | Yes | Built-in with verification |
| User Management | Good | Web UI with user management, password reset |
| Login UI | Yes | Built-in login page (redirect), SDK integration |
| OSS Limits | **None** | Apache 2.0, no limits |
| Multi-Tenant | Yes | Via organizations |
| Extensibility | Moderate | Custom authentication plugins, webhooks |
| Paid-only Features | Enterprise support/hosting only |
| Maturity | Medium | Backed by Casbin project, used by Intel, VMware |

**Pros:**
- Apache 2.0 license, truly free and open source
- Supports 100+ identity providers out of the box
- Full OIDC/OAuth2/SAML/CAS/LDAP/SCIM support
- Built-in SaaS management capabilities
- Multi-tenant with organizations
- WebAuthn/TOTP/MFA/RADIUS support

**Cons:**
- Smaller community compared to Keycloak/ZITADEL
- Documentation quality is inconsistent (auto-translated from Chinese)
- Primarily developed by Chinese open-source community - international community is smaller
- UI/UX feels less polished than competitors
- Less mature enterprise deployment documentation

**Verdict:** Feature-rich and truly open source with a permissive license. Good option if you need broad identity provider support. Documentation and community size may be concerns.

---

### 9. FusionAuth

**Website:** https://fusionauth.io/
**License:** Proprietary (free "Community" tier)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Excellent | Unlimited identity providers |
| Email/Password | Yes | Built-in |
| User Management | Excellent | Full admin UI, self-service portal |
| Login UI | Yes | Themed login pages (redirect) |
| OSS Limits | **Significant** | Community edition is free but NOT open source. Premium features (MFA SMS/email, LDAP, SCIM, threat detection) require paid plans starting at $125/month |
| Multi-Tenant | Yes | Built-in |
| Extensibility | Good | Lambdas, webhooks, connectors |
| Paid-only Features | **Many** - breached password detection, advanced MFA, LDAP, SCIM, custom scopes, threat detection all require paid plans |
| Maturity | High | Well-established commercial product |

**Pros:**
- Very feature-rich and well-documented
- Unlimited users and IdPs even on free tier
- Self-hostable
- Excellent SDK support

**Cons:**
- **Not open source** - proprietary license
- Many important features are behind paid tiers ($125-$3,300/month)
- Advanced MFA, LDAP, SCIM, custom scopes, threat detection all paid
- Community edition feels like a "freemium" product, not true OSS
- AGPL-3.0 would be preferable to proprietary

**Verdict:** **Disqualified** - not open source and has significant feature gating behind paid plans. Does not meet the core requirements.

---

### 10. Better Auth

**Website:** https://www.better-auth.com/
**License:** MIT

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | Google, GitHub, Discord, Twitter, etc. via plugins |
| Email/Password | Yes | Built-in |
| User Management | Basic | No admin dashboard |
| Login UI | **No** | You build your own UI |
| OSS Limits | **None** | MIT license |
| Multi-Tenant | Yes | Via organization plugin |
| Extensibility | Good | Plugin ecosystem |
| Paid-only Features | None (enterprise plan exists for support) |
| Maturity | Low | Very new project (2024-2025) |

**Pros:**
- MIT license, truly open source
- TypeScript-first, very developer-friendly
- Plugin-based architecture (2FA, organizations, etc.)
- Framework-agnostic

**Cons:**
- **Not an identity provider** - it's an authentication library/framework
- No admin UI or user management dashboard
- No login UI provided - you build everything
- Cannot act as an OIDC provider for other applications
- TypeScript only - not usable with Python/Go backends
- Very young project

**Verdict:** **Not suitable** - it's an authentication library for TypeScript apps, not a standalone identity provider. Cannot be used to protect non-TypeScript applications or act as an IdP.

---

### 11. Authelia

**Website:** https://www.authelia.com/
**License:** Apache 2.0

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | **No** | Does not support upstream social login. It IS an OIDC provider but doesn't consume external IdPs for social login |
| Email/Password | Yes | Internal user database or LDAP |
| User Management | Basic | YAML-based or LDAP backend, no admin UI |
| Login UI | Yes | Built-in web portal |
| OSS Limits | **None** | Apache 2.0, no limits |
| Multi-Tenant | **No** | Single-tenant design |
| Extensibility | Limited | Configuration-driven, not much custom code extensibility |
| Paid-only Features | None |
| Maturity | High | Lightweight, well-suited for reverse proxy scenarios |

**Pros:**
- Extremely lightweight (<20MB container, <30MB RAM)
- OpenID Certified
- Perfect companion for reverse proxies (Traefik, Nginx, HAProxy)
- Apache 2.0 license
- Built-in 2FA support (TOTP, WebAuthn, push)

**Cons:**
- **No social login support** - cannot federate with Google, GitHub, etc.
- No admin UI for user management (YAML files or LDAP)
- Not designed as a full IdP - it's an auth portal for reverse proxy setups
- No multi-tenant support
- Limited extensibility

**Verdict:** **Not suitable** for this use case. Authelia is an excellent reverse proxy auth companion but lacks social login federation and user management capabilities needed here.

---

### 12. Dex

**Website:** https://dexidp.io/
**License:** Apache 2.0
**Backed by:** CNCF (sandbox project, originated at CoreOS)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | GitHub, Google, Microsoft, GitLab, LinkedIn, Bitbucket, SAML, LDAP, and any generic OIDC/OAuth2 provider via connectors (~16 built-in connectors) |
| Email/Password | **Limited** | Built-in "local" connector with static passwords defined in config file (no dynamic registration, no password reset, no self-service) |
| User Management | **No** | No admin UI, no user management dashboard. Users are managed in upstream identity providers or via static config files |
| Login UI | Basic | Minimal login page (redirect-based) with Go HTML templates. Customizable but very basic compared to alternatives |
| OSS Limits | **None** | Apache 2.0, no feature gating whatsoever |
| Multi-Tenant | **No** | Single-tenant design. No concept of organizations, realms, or tenants |
| Extensibility | Good | Pluggable connector architecture, gRPC API for managing clients/passwords programmatically |
| Paid-only Features | **None** | Everything is open source |
| Maturity | High | CNCF sandbox, 10.6k GitHub stars, 297 contributors, used primarily in Kubernetes ecosystems |

**Pros:**
- Apache 2.0 license, truly free and open source with zero restrictions
- Lightweight single Go binary, very low resource footprint
- Excellent Kubernetes-native support (CRD storage, Helm chart, API server auth integration)
- Strong connector ecosystem for federating upstream identity providers (LDAP, SAML, GitHub, Google, Microsoft, GitLab, etc.)
- OIDC Certified provider
- CNCF project with established community (10.6k stars, 3,680 commits)
- gRPC API for programmatic management
- Multiple storage backends: etcd, Kubernetes CRDs, SQLite3, Postgres, MySQL

**Cons:**
- **Not a full identity provider** - it is a federation/proxy layer. Dex does not manage users itself; it delegates authentication to upstream providers
- **No built-in user management** - no admin UI, no user dashboard, no self-service password reset
- **Static local passwords only** - the built-in "local" connector uses passwords defined in YAML config files, not a dynamic user database
- **No multi-tenant support** - no organizations, realms, or tenant isolation
- **Minimal login UI** - basic Go HTML template pages, no modern UI, limited branding options
- **No MFA support** - relies entirely on upstream providers for MFA
- **No SCIM, RBAC, or user lifecycle management**
- Primarily designed for Kubernetes authentication, not general-purpose web app SSO
- SAML connector is unmaintained and potentially vulnerable (per project's own warning)

**Verdict:** **Not suitable** for this use case. Dex is an excellent OIDC federation layer for Kubernetes environments, but it is not a standalone identity provider. It lacks user management, admin UI, dynamic user registration, password reset, and multi-tenancy. It is designed to proxy authentication to other IdPs, not to be one itself. If you already have an upstream IdP and need to unify access for Kubernetes, Dex excels - but it cannot "hand off" authentication from a web app as a complete solution.

---

### 13. Rauthy

**Website:** https://sebadob.github.io/rauthy/
**License:** Apache 2.0
**Backed by:** Independent developer (sebadob), funded by NLnet / NGI Zero Core (EU)

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | Good | Upstream authentication providers ("Login with ...") via generic OIDC. Individual connectors for specific providers like Google/GitHub are not pre-built but configurable via standard OIDC |
| Email/Password | Yes | Built-in with configurable password policies, Argon2ID hashing with config helper |
| User Management | Good | Dedicated Admin UI, user account self-service dashboard, password reset, custom roles/groups/attributes |
| Login UI | Yes | Built-in login page (redirect), per-client branding with custom themes and logos, i18n support |
| OSS Limits | **None** | Apache 2.0, no feature gating, no per-user limits |
| Multi-Tenant | **No** | No built-in multi-tenant/organizations concept. Single-tenant design |
| Extensibility | Moderate | Admin API keys with fine-grained access, events/webhooks, forward_auth endpoint, custom scopes/attributes, SCIM v2 |
| Paid-only Features | **None** | Everything is open source, paid support available |
| Maturity | Low-Medium | Independent security audit completed (Radically Open Security), 942 GitHub stars, 30 contributors, single primary developer, funded by EU (NLnet) |

**Pros:**
- Apache 2.0 license, truly free and open source with zero restrictions
- Exceptionally lightweight - written in Rust, runs on a Raspberry Pi, <50-100MB RAM
- No external database dependency by default (embedded Hiqlite/SQLite with Raft HA), Postgres optional
- Strong security defaults (ed25519 token signing, S256 PKCE by default, Argon2ID)
- Independent security audit by Radically Open Security (findings addressed in v0.32.1)
- Excellent passkey/FIDO2 support including passwordless-only accounts
- Built-in HA mode without external dependencies (Raft consensus via Hiqlite)
- Admin UI and user self-service dashboard
- Per-client branding and i18n for login pages
- Events and alerting system (E-Mail, Matrix, Slack)
- Brute-force protection and IP blacklisting
- SCIM v2 support for downstream clients
- PAM/NSS module for Linux SSH/workstation logins (unique feature)
- OAuth Device Authorization Grant for IoT devices
- DPoP token support, JWKS auto-rotation
- Automatic database backups with S3 support
- Scales to millions of users
- Prometheus metrics endpoint
- OpenID Connect Dynamic Client Registration, RP Initiated Logout, Backchannel Logout

**Cons:**
- **No multi-tenant support** - no organizations, realms, or B2B tenant isolation
- **Small community** - 942 GitHub stars, 30 contributors, primarily a single-developer project
- **Limited upstream social providers** - no pre-built connectors for Apple, Facebook, etc. Relies on generic OIDC upstream; providers that don't support standard OIDC (like Apple's non-standard implementation) may require workarounds
- **No SAML support** - neither as consumer nor provider
- **No LDAP integration** - cannot federate with existing LDAP/AD directories
- Young project (v0.34.3, not yet 1.0) - API and configuration may still change
- Single primary developer creates bus factor risk
- Smaller ecosystem and community support compared to Keycloak/ZITADEL
- Documentation is good but less comprehensive than mature alternatives
- No commercial entity backing the project (EU grant-funded)

**Verdict:** A compelling lightweight alternative with excellent security defaults and impressive resource efficiency. Rauthy is a genuine full-featured OIDC provider with admin UI, user management, and modern passkey support. However, the lack of multi-tenancy, SAML/LDAP support, and the small community/single-developer risk make it less suitable for enterprise or B2B use cases. Best suited for projects that prioritize minimal resource footprint, strong security defaults, and don't need multi-tenancy or SAML/LDAP federation. The Apache 2.0 license and security audit are strong positives.

---

### 14. FerrisKey

**Website:** https://ferriskey.rs / https://docs.ferriskey.rs
**License:** Apache 2.0
**Backed by:** Community / Sponsored by Cloud IAM

| Criterion | Rating | Notes |
|-----------|--------|-------|
| OIDC Social Login | **Early** | Social auth API endpoints added in v0.3.0; LDAP federation also in progress. Documentation lists Google, GitHub, Facebook but implementation appears to be in early stages |
| Email/Password | Yes | Built-in username/password and email/password authentication |
| User Management | Good | Admin dashboard (React), user CRUD, profile management, account status (active/inactive/locked) |
| Login UI | Yes | Built-in login page (redirect-based), separate web console for admin |
| OSS Limits | **None** | Apache 2.0, no feature gating, community-first |
| Multi-Tenant | Yes (Realms) | Keycloak-style "Realms" with complete tenant isolation, independent config, separate user bases |
| Extensibility | Moderate | Webhooks for lifecycle events, REST APIs, modular architecture (Trident for MFA, SeaWatch for audit) |
| Paid-only Features | **None** | Everything is open source |
| Maturity | **Very Low** | v0.3.0, 524 GitHub stars, 33 contributors, 411 commits, 11 releases. Project is in early alpha/development stage |

**Pros:**
- Apache 2.0 license, truly free and open source with zero restrictions
- Written in Rust (API/core) with React/TypeScript frontend - aims for high performance and low resource usage
- Multi-tenant Realms (Keycloak-inspired) with complete user/role/client isolation per realm
- Modern hexagonal architecture (Ports & Adapters) for maintainability
- Built-in admin dashboard with React, Tailwind, and shadcn/ui
- MFA support via TOTP (Trident module)
- RBAC with fine-grained role mapping
- Audit logging and event system (SeaWatch module)
- Webhook support for lifecycle events
- Kubernetes-native with Helm chart and Kubernetes operator (CRDs)
- Prometheus metrics endpoint
- LDAP federation being actively developed (v0.3.0)
- Social auth endpoints being actively developed (v0.3.0)
- Docker Compose setup for quick local testing
- Well-structured codebase with clean architecture patterns

**Cons:**
- **Extremely early stage** - v0.3.0 with only 411 commits and 11 releases. Not production-ready
- **Many claimed features are aspirational** - the documentation describes planned capabilities (social login with Google/GitHub/Facebook, SAML, LDAP) that are only partially implemented or in active development as of v0.3.0
- **No security audit** - unlike Rauthy, no independent security assessment has been conducted
- **Requires PostgreSQL** - no embedded database option; external Postgres 15+ is mandatory
- **Very small community** - 524 GitHub stars, primarily driven by a small group of contributors
- **No OIDC certification** - not certified by the OpenID Foundation
- **No SAML support** yet (neither as consumer nor provider)
- **No passkey/WebAuthn support** yet (TOTP only for MFA)
- **No SCIM support** for user provisioning
- **No self-service password reset** documented
- **Limited social login** - SSO endpoints and social auth API were just added in v0.3.0; unclear how many providers actually work end-to-end
- **Separate API and frontend containers** - requires deploying multiple services (API, webapp, Postgres, migrations)
- Feature parity with Keycloak (its stated goal) is far from achieved
- Documentation describes features in a "future tense" manner, making it difficult to distinguish implemented vs. planned functionality

**Verdict:** **Not suitable at this time.** FerrisKey is an ambitious project with a sound architectural vision (Keycloak-like realms, Rust performance, hexagonal architecture) and a permissive Apache 2.0 license. However, at v0.3.0 it is far too early for production use. Many documented features (social login, LDAP, SAML) are either partially implemented or still in development. The project lacks a security audit, OIDC certification, and the battle-testing that comes with maturity. Worth watching for the future, but cannot be recommended for a project that needs to "hand off" authentication today. Re-evaluate when the project reaches v1.0.

---

## Comparison Matrix

| Feature | Keycloak | ZITADEL | Logto | authentik | Ory | Hanko | SuperTokens | Casdoor | FusionAuth | Better Auth | Authelia | Dex | Rauthy | FerrisKey |
|---------|----------|---------|-------|-----------|-----|-------|-------------|---------|------------|-------------|----------|-----|--------|-----------|
| **Truly OSS** | Yes | Yes (AGPL) | Yes (MPL) | Partial | Yes | Yes (AGPL) | Yes | Yes | **No** | Yes | Yes | Yes | Yes | Yes |
| **No Feature Limits** | Yes | Yes | Mostly | **No** | Yes | Yes | **No** | Yes | **No** | Yes | Yes | Yes | Yes | Yes |
| **OIDC Provider** | Yes | Yes | Yes | Yes | Yes | No | No | Yes | Yes | No | Yes | Yes | Yes | Yes |
| **Social Login** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **No** | Yes (via connectors) | Partial (generic OIDC only) | Early (in dev) |
| **Email/Password** | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Static only | Yes | Yes |
| **Login UI** | Yes | Yes | Yes | Yes | **No** | Yes | Yes | Yes | Yes | **No** | Yes | Basic | Yes | Yes |
| **User Management UI** | Yes | Yes | Yes | Yes | **No** | Basic | Yes | Yes | Yes | **No** | **No** | **No** | Yes | Yes |
| **Multi-Tenant** | Yes | Excellent | Yes | Partial | Cloud | No | Paid | Yes | Yes | Plugin | No | No | No | Yes (Realms) |
| **Extensible** | Excellent | Good | Moderate | Good | Excellent | Moderate | Good | Moderate | Good | Good | Limited | Good (connectors) | Moderate | Moderate |
| **Self-Host Easy** | Medium | Easy | Easy | Easy | Hard | Easy | Easy | Easy | Easy | N/A | Easy | Easy | Very Easy | Medium |

---

## Disqualified Candidates

| Provider | Reason |
|----------|--------|
| **FusionAuth** | Not open source; many features behind paid plans ($125-$3,300/mo) |
| **Better Auth** | Auth library, not an IdP; no login UI; TypeScript-only |
| **Authelia** | No social login support; no admin UI; reverse proxy companion only |
| **Hanko** | Not an OIDC provider; can't protect multiple apps via standard protocols |
| **SuperTokens** | Not an IdP; MFA and multi-tenancy are paid add-ons |
| **Dex** | Federation layer, not a standalone IdP; no user management, no admin UI, static passwords only |
| **FerrisKey** | Too early (v0.3.0); many features aspirational/in-development; no security audit; no OIDC certification |

---

## Top 3 Recommendations

### 1. Keycloak (Best Overall)

**Why:** The most mature, feature-complete, and truly unrestricted open-source identity provider. Apache 2.0 license means zero concerns for embedding in an open-source project. All features are in the OSS version - there is no commercial edition with gated features. The ecosystem is massive with extensive documentation, community support, and third-party integrations.

**Best for:** Projects that need maximum features, proven stability, and the broadest protocol support. Willing to invest in initial setup and ops.

**Trade-off:** Higher resource usage (Java), steeper learning curve, more operational complexity.

### 2. ZITADEL (Best Modern Alternative)

**Why:** Purpose-built for multi-tenancy with a modern architecture. Single Go binary makes deployment simple. All features available in the open-source version. OIDC Certified with excellent B2B support. Event-sourced architecture provides great audit trails.

**Best for:** Projects that prioritize multi-tenancy, modern architecture, and ease of deployment. The AGPL-3.0 license is fine for using ZITADEL as a service (not embedded).

**Trade-off:** AGPL-3.0 license (fine for service usage), younger ecosystem than Keycloak.

### 3. Casdoor (Best Lightweight Alternative)

**Why:** Apache 2.0 license, 100+ identity providers, full OIDC/SAML/LDAP support, and multi-tenancy - all free and unrestricted. Lightweight Go-based architecture. The broadest built-in social login connector support of any option.

**Best for:** Projects that need many social login providers out of the box and want a permissive license with no restrictions.

**Trade-off:** Smaller international community, documentation quality varies, less mature than Keycloak.

---

## Final Recommendation

For an **open-source web app** that needs to completely hand off authentication:

> **ZITADEL** is the recommended choice. It strikes the best balance of:
> - All features available for free (no gating)
> - Excellent multi-tenant support
> - Modern, lightweight architecture (single Go binary)
> - Built-in login UI with hosted login pages
> - OIDC Certified with broad protocol support
> - Easy self-hosting with Docker/Kubernetes
> - Active development and growing community
>
> If multi-tenancy is not critical and you want maximum maturity and ecosystem, go with **Keycloak** instead.
>
> If you need the most permissive license (Apache 2.0) and broad social login support, consider **Casdoor**.
