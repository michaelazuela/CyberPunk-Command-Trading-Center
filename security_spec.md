# Phase 0: Payload-First Security TDD
## 1. Data Invariants

- A logged-in user can only create and access their own trading setups.
- A `TradingSetup` cannot exist without a valid `userId` matching `request.auth.uid`.
- Timestamps must sync strictly with `request.time`.
- `confidence` must be between 0 and 1.
- `tags` must be a list of strings, with a maximum of 20 elements, and each string no more than 64 characters to prevent "Denial of Wallet" resource exhaustion.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: User A attempts to create a document with User B's `userId`.
2. **Orphaned Write**: Creating a setup without a `userId`.
3. **Temporal Anomaly**: Setting `createdAt` or `updatedAt` to a past or future date.
4. **Data Overload**: Uploading an array of 5,000 tags.
5. **Array Poisoning**: Pushing an integer or an object into the `tags` array.
6. **String Bloat**: Trying to set the `reasoning` field to a 500KB string.
7. **Type Mismatch**: Sending a string for `entry` instead of a float.
8. **Ghost Field Update**: Sending { "isVerified": true } alongside legitimate updates.
9. **Deletion Theft**: User A attempts to delete User B's setup.
10. **State Immutability Break**: Updating `createdAt` or `userId` after creation.
11. **RAG Injection**: Sending an ID parameter > 128 chars.
12. **Unauthenticated Access**: Read/Write attempts without `request.auth.uid`.

## 3. The Test Runner 
*(Will be populated with firestore.rules.test.ts)*
