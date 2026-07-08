# Graph Report - Settle-Mint  (2026-07-08)

## Corpus Check
- 72 files · ~46,727 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 177 nodes · 127 edges · 5 communities detected
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]

## God Nodes (most connected - your core abstractions)
1. `sendEmail()` - 5 edges
2. `generateOTP()` - 4 edges
3. `getGroupById()` - 4 edges
4. `sendOTPEmail()` - 4 edges
5. `register()` - 3 edges
6. `resendOtp()` - 3 edges
7. `forgotPassword()` - 3 edges
8. `createExpense()` - 3 edges
9. `sendWelcomeEmail()` - 3 edges
10. `sendPasswordResetEmail()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `start()` --calls--> `initTypesense()`  [INFERRED]
  api\src\server.ts → api\src\utils\typesense.ts
- `scanReceiptImage()` --calls--> `scanReceipt()`  [INFERRED]
  api\src\controllers\ai.controller.ts → api\src\utils\receiptScanner.ts
- `parseNaturalLanguage()` --calls--> `parseNaturalLanguageExpense()`  [INFERRED]
  api\src\controllers\ai.controller.ts → api\src\utils\mintBotParser.ts
- `register()` --calls--> `sendOTPEmail()`  [INFERRED]
  api\src\controllers\auth.controller.ts → api\src\utils\email.ts
- `verifyOtp()` --calls--> `sendWelcomeEmail()`  [INFERRED]
  api\src\controllers\auth.controller.ts → api\src\utils\email.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.23
Nodes (10): forgotPassword(), generateOTP(), register(), resendOtp(), verifyOtp(), sendEmail(), sendExpenseAlertEmail(), sendOTPEmail() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.16
Nodes (7): createExpense(), searchMyExpenses(), start(), calculateSplits(), indexExpense(), initTypesense(), searchExpenses()

### Community 2 - "Community 2"
Cohesion: 0.25
Nodes (2): handleKeyDown(), navigateToExpense()

### Community 3 - "Community 3"
Cohesion: 0.32
Nodes (4): getGroupById(), calculateBalances(), calculateStrictSettlements(), calculateSuggestedSettlements()

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (4): parseNaturalLanguage(), scanReceiptImage(), parseNaturalLanguageExpense(), scanReceipt()

## Knowledge Gaps
- **Thin community `Community 2`** (9 nodes): `GlobalSearch.tsx`, `formatCurrency()`, `formatDate()`, `getCategoryIcon()`, `handleClick()`, `handleExpand()`, `handleGlobalKey()`, `handleKeyDown()`, `navigateToExpense()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 3 inferred relationships involving `getGroupById()` (e.g. with `calculateBalances()` and `calculateSuggestedSettlements()`) actually correct?**
  _`getGroupById()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `sendOTPEmail()` (e.g. with `register()` and `resendOtp()`) actually correct?**
  _`sendOTPEmail()` has 2 INFERRED edges - model-reasoned connections that need verification._