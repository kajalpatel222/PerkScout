# PerkScout
A local, readable credit-card benefits guide, with an optional evidence-search assistant. Supports six U.S. personal cards: Capital One Venture X, Chase Sapphire Reserve, Bank of America Travel Rewards, Discover it Cash Back, Citi Custom Cash, and Costco Anywhere Visa by Citi.

## Run
Node 22.13+ required (built-in experimental SQLite).

```
npm install
npm run dev
```
Use the Local URL printed by Vite (currently http://127.0.0.1:5175). API runs on loopback port 3001. `npm run build` checks TypeScript, compiles the API to `server-dist`, and builds the UI to `dist`. `npm test` runs the tests. `npm start` runs the compiled API locally; Vite provides the frontend during development.

## Vercel deployment
The Vercel configuration serves the Vite build and rewrites `/api/*` to one Express function. `api/index.js` imports the compiled backend; the function does not open a listening port. The `vercel-build` hook compiles the backend before the API builder traces its dependencies, independently of the frontend build. Node 22.x is required for built-in SQLite. Each function instance creates its own in-memory index from the bundled curated corpus, so no persistent disk, external database, API key, or paid model service is needed. Selected cards remain in the visitor's browser storage.

Use the Hobby plan for this personal, noncommercial demo, with the included Vercel URL and no paid add-ons. Deploy from GitHub using the repository's build settings, or use the Vercel CLI. Verify `/api/health`, `/api/catalog`, and a cited `/api/ask` response before sharing the URL. Local databases, preview screenshots, and environment files are excluded from CLI uploads. Vercel usage limits still apply; future external API integrations would have separate costs.

## Product plan and implemented scope
Phase one has three routes: **Explore**, **Cards / My cards**, and **Ask**. Explore starts with illustrated Travel, Food & rides, and Shopping shortcuts, plus an all-benefits view. Card guides show the complete curated inventory. Both routes open the same accessible benefit drawer with timing, enrollment/payment, exclusions, and expandable source metadata. With no selection, users can browse all six cards. An optional card-name selection filters Explore and Ask and is stored in `perkscout-selected-cards-v1` in this browser.

The curated catalog has 22 Venture X entries (including 8 explicitly unverified guide protections), 13 Reserve, 6 BofA Travel Rewards, 6 Discover it Cash Back, 3 Custom Cash, and 9 Costco Anywhere Visa entries. Coverage is not exhaustive. Welcome/application offers and spend-threshold unlocks are excluded from this iteration.

There are no card-date or benefit-level forms in this phase. Policy cadence is informative: an annual credit is an allowance across its account or issuer period, while rental coverage applies per qualifying rental only when eligibility and current terms support it. Published allowances are never presented as remaining balances. Unknown usage, account dates, and enrollment are not inferred from card names.

`shared/guide.ts` handles situation discovery, policy effective-date filtering, evidence labels, and timing labels. Lyft appears in Travel and Food & rides. Travel and purchase protections are mapped separately. `shared/benefit-timing.ts` remains the source of reviewed cadence metadata. Unverified or conflicting guide entries remain visible with warnings. The UI uses the browser's current date to filter the catalog and query Ask; no fixed planning date is exposed.

The UI uses lightweight hash routes with browser back/forward support, native modal dialogs with keyboard dismissal/focus return, responsive illustrated components, and catalog/answer loading, empty, and retry states. Ask validates its JSON response, cancels stale requests when card scope changes, and links every returned policy claim to its source. It uses the same card selection as the rest of the app.

Account connections remain phase two. No connection controls, fake live mode, purchases, applications, or automatic enrollment are present. No API key or paid service is needed. The existing `perkscout-wallet-v1` profiles and legacy date-calculation modules are retained for compatibility, but the new guide does not read or request those dates. No card numbers or credentials are collected.

The new cards distinguish earned rewards from free credits: Discover has a quarterly activation/spending cap, Custom Cash follows billing cycles, and Costco certificates have an annual redemption deadline conditional on issuance. Neither earning caps nor available points are treated as remaining credits. BofA/Discover account-transition conditions remain explicit; current account terms should be checked. Custom Cash is supported for existing cardholders.

## Evidence and retrieval
`server/corpus.ts` holds reviewed paraphrases, exact source URLs, document titles, section/page, card variant, available effective/updated dates, review date and rule definitions. `shared/catalog.ts` validates the corpus and API catalog payload. The in-memory SQLite index holds benefit JSON and SHA-256 hashes of the curated records, passages, FTS5 index, and concept vectors. These hashes identify our curated records, not original webpage snapshots.

The public Capital One Visa Infinite guide linked by the issuer states benefits effective October 1, 2021. Its listed protections remain visible for discovery but are marked version-unverified; their date tracking is disabled. Relevant protections can appear in chat as separate cited evidence gaps, never as confirmed coverage. No assumption is made that a guide's old date means it is expired or that the issuer link proves it applies to every account today. Full claims, exclusions, and account applicability need further verification. No PDF upload pipeline exists yet.

Search combines full text with hand-defined concept-vector similarity. These are prototype vectors, not a pretrained embedding model. `server/search-intent.ts` expands broad trip plans to travel, hotels, lounges, rental cars, and rideshares, with scoped handling for explicit exclusions. Narrow questions stay focused. Retrieval selects across relevant topics before filling additional matches (up to eight for trip plans, six otherwise), after card, date, and policy-confidence filters. Transportation suggestions are conditional; location availability is not inferred. Relevant unverified or conflicting references appear only as separate evidence gaps, preserving source dates, page numbers, and evidence status. Historical, expired, and future-not-yet-effective policies cannot support recommendations. Answers are deterministic extractive JSON validated with Zod; no generative model or autonomous research agent is enabled. The API does not crawl live pages on each request.

Example questions: “I’m planning a Yellowstone trip. What perks can I use?”, “Rental car and rideshare perks”, “Compare hotel benefits”, “How do I use Sapphire Reserve’s Lyft credit?”, and “Which benefits reset monthly, by calendar year, or on my card anniversary?” The Yellowstone regression must include Hertz and Lyft when both cards are selected, with rental collision coverage shown only as unverified. A narrow rental-insurance query abstains rather than substituting status benefits for insurance.

## Next bounded steps
1. Review remaining issuer benefits and current account-variant guides, retain immutable originals, and add supported rules with version/conflict review.
2. Design phase-two account data around verified provider coverage and explicit provenance. Transaction data alone must not imply a remaining issuer credit or confirmed eligibility.
3. Add imported PDFs, local pretrained embeddings, and a bounded model adapter only after evaluating need. Local models require downloads; hosted model APIs require an environment-only key and paid usage, identified before enabling them.
4. Add reminders only when requested. Exact posting cutoffs and provider timezone behavior need separate handling; legacy date helpers use date-only UTC arithmetic; the guide shows policy cadence rather than personal countdowns.

## Verification
Tests cover attribution and citations, enrollment, exclusions, expired/historical/unsupported queries, conflict withholding, leap days, anniversary versus statement periods, enrollment-duration rules, monthly and half-year resets, unknown usage, fixed-promotion balances, and user-confirmed expiry. Timing tests distinguish annual allowances from per-use coverage, keep enrollment independent of credit cadence, and preserve uncertain coverage and unknown eligibility dates. Guide tests cover all-card browsing, situation overlap, attribution, inclusive policy-date boundaries, unknown/conflicting evidence, and enrollment versus expiry. Browser QA covers optional selection/persistence, all-card and per-card navigation, search/empty states, source details, keyboard drawer dismissal, Ask-to-drawer navigation, and mobile layouts. Build and browser QA are performed after changes.
