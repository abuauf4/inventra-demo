---
Task ID: 1
Agent: Main
Task: Fix infinite spinner caused by TDZ ReferenceError in Zustand onRehydrateStorage

Work Log:
- Read store.ts and page.tsx to understand the hydration flow
- Identified root cause: `useAppStore.setState({ _hasHydrated: true })` inside onRehydrateStorage callback creates TDZ ReferenceError because `useAppStore` const may not be assigned yet when the callback fires
- Fix 1 (store.ts): Added `_storeSet` variable to capture the `set` function from the store creator; used `_storeSet({ _hasHydrated: true })` in onRehydrateStorage instead of `useAppStore.setState(...)`. This avoids the TDZ because `set` is a parameter assigned synchronously, not a module-level const.
- Fix 2 (page.tsx): Verified `const [hydrationTimedOut, setHydrationTimedOut] = useState(false)` is correct (no typo found in local source — the deployed version may have had the typo)
- Built the project successfully (prisma generate + next build)
- Started production server on port 3000
- Verified: Home page returns HTTP 200 with proper HTML
- Verified: Fix is compiled into production JS (confirmed _storeSet/R variable is used in onRehydrateStorage)
- Note: Auth API returns 500 because server can't reach Supabase DB (network issue, not related to spinner fix)

Stage Summary:
- Root cause fixed: TDZ ReferenceError prevented _hasHydrated from ever becoming true
- Production build deployed and serving pages correctly
- Database connectivity is a separate networking issue (Supabase unreachable from this server)
