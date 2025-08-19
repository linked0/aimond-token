# Entity-Relationship Diagram (ERD) for Token Distribution Backend

This ERD outlines the core database tables and their relationships for managing token allocations and claims using a Merkle tree-based system.

## Table Descriptions:

### `users`
Stores general user profile information and their associated blockchain wallet addresses. This table is the source of truth for user eligibility and continuously updated metrics.

| Column Name      | Data Type      | Description                                                              | Notes                                     |
| :--------------- | :------------- | :----------------------------------------------------------------------- | :---------------------------------------- |
| `id`             | `BIGINT`       | Primary Key, Auto-incrementing                                           | Internal user ID                          |
| `wallet_address` | `VARCHAR(42)`  | The user's Ethereum wallet address (e.g., `0x...`)                       | **Crucial for on-chain interaction.** Unique, Indexed. |
| `email`          | `VARCHAR(255)` | User's email address                                                     | Unique, Indexed                           |
| `username`       | `VARCHAR(255)` | User's chosen username                                                   | Unique, Indexed (optional)                |
| `created_at`     | `TIMESTAMP`    | Timestamp when the user record was created                               |                                           |
| `updated_at`     | `TIMESTAMP`    | Timestamp when the user record was last updated                          |                                           |
| `is_new_member`  | `BOOLEAN`      | Flag indicating if they are a "new member" for token purposes            | Used by backend logic for "New Member Token" eligibility. |
| `total_cumulative_spending` | `DECIMAL`      | Accumulated lifetime spending in USD (or equivalent)                     | This is a derived, cumulative sum from `user_spending_events`. |
| ...              | ...            | Other relevant user profile data (e.g., referral code, last login, etc.) |                                           |

### `user_spending_events`
Logs every individual spending action by a user. This granular data allows for flexible calculation of spending for any arbitrary period.

| Column Name      | Data Type      | Description                                                              | Notes                                     |
| :--------------- | :------------- | :----------------------------------------------------------------------- | :---------------------------------------- |
| `id`             | `BIGINT`       | Primary Key, Auto-incrementing                                           | Internal ID for the spending event        |
| `user_id`        | `BIGINT`       | Foreign Key to `users.id`. Links the spending event to a specific user.  | Indexed.                                  |
| `amount_spent`   | `DECIMAL`      | The amount spent in this specific event.                                 |                                           |
| `currency`       | `VARCHAR(10)`  | The currency of the spending (e.g., 'USD', 'KRW').                     |                                           |
| `timestamp`      | `TIMESTAMP`    | The exact time when the spending occurred.                               | Indexed.                                  |
| `description`    | `TEXT`         | Optional: More details about the spending event.                         | Nullable.                                 |

### `merkle_roots`
Tracks each Merkle root that has been generated and committed to a specific smart contract. This table serves as a historical record of distribution periods for different token programs.

| Column Name         | Data Type      | Description                                                              | Notes                                     |
| :------------------ | :------------- | :----------------------------------------------------------------------- | :---------------------------------------- |
| `id`                | `BIGINT`       | Primary Key, Auto-incrementing                                           |
| `root_hash`         | `VARCHAR(66)`  | The actual Merkle root hash (e.g., `0x...`)                              | **Unique, Indexed.** This is what goes on-chain. |
| `contract_address`  | `VARCHAR(42)`  | The address of the smart contract where this root was committed          | e.g., `NewMemberToken` or `PaidPoint` contract |
| `distribution_type` | `VARCHAR(50)`  | Categorizes the type of distribution (e.g., 'new_member_token', 'paid_point') | **Unique constraint with `root_hash`**. Useful for managing multiple programs. |
| `period_start_date` | `TIMESTAMP`    | The start date of the period for which this root's data was collected    |                                           |
| `period_end_date`   | `TIMESTAMP`    | The end date of the period for which this root's data was collected      |                                           |
| `is_active`         | `BOOLEAN`      | Flag indicating if this is the currently active root for claiming        | Only one `is_active` per `distribution_type` should be true at a time. |
| `created_at`        | `TIMESTAMP`    | Timestamp when the root was generated and recorded                       |                                           |

### `token_allocations`
Stores the final, aggregated `(wallet_address, amount)` pairs that form the leaves of a specific Merkle tree. These are the entitlements that users can claim for a given period and distribution type.

| Column Name      | Data Type      | Description                                                              | Notes                                     |
| :--------------- | :------------- | :----------------------------------------------------------------------- | :---------------------------------------- |
| `id`             | `BIGINT`       | Primary Key, Auto-incrementing                                           |
| `merkle_root_id` | `BIGINT`       | Foreign Key to `merkle_roots.id`. Links this allocation to a specific Merkle root. | Indexed. |
| `wallet_address` | `VARCHAR(42)`  | The user's wallet address for this specific allocation                   | **Foreign Key to `users.wallet_address`**. Indexed. |
| `amount`         | `VARCHAR(78)`  | The exact token amount allocated to this address (as a string to handle large `uint256` values) | This is the `tokenAmount` in the Merkle leaf. |
| `is_claimed`     | `BOOLEAN`      | Flag indicating if this specific allocation has been claimed             | Default: `FALSE`. Prevents double claims. |
| `claim_tx_hash`  | `VARCHAR(66)`  | The transaction hash of the claim (if claimed)                           | Nullable.                                 |
| `claimed_at`     | `TIMESTAMP`    | Timestamp when this allocation was claimed (if claimed)                  | Nullable.                                 |
| `created_at`     | `TIMESTAMP`    | Timestamp when this allocation record was created                        |                                           |

## Entity-Relationship Diagram:

```
+-----------------------+       +---------------------------+
|         users         |       |  user_spending_events     |
+-----------------------+       +---------------------------+
| id (PK)               |<------| user_id (FK)              |
| wallet_address (U)    |       | amount_spent              |
| email (U)             |       | currency                  |
| username              |       | timestamp                 |
| created_at            |       | description               |
| updated_at            |       +---------------------------+
| is_new_member         |
| total_cumulative_spending |
+-----------------------+
        | 1
        | 
        | M
        V
+-----------------------+
|   token_allocations   |
+-----------------------+
| id (PK)               |
| merkle_root_id (FK)   |
| wallet_address (FK)   |                                  
| amount                |                                  
| is_claimed            |                                  
| claim_tx_hash         |                                  
| claimed_at            |                                  
| created_at            |                                  
+-----------------------+
        | M                                                
        |                                                  
        |                                                  
        +--------------------------------------------------+
                                                          |
                                                          V
                                                      +---------------------+
                                                      |    merkle_roots     |
                                                      +---------------------+
                                                      | id (PK)             |
                                                      | root_hash (U)       |
                                                      | contract_address    |
                                                      | distribution_type (U)|
                                                      | period_start_date   |
                                                      | period_end_date     |
                                                      | is_active           |
                                                      | created_at          |
                                                      +---------------------+
```

### Relationship Explanations:

*   **`users` to `user_spending_events` (One-to-Many):**
    *   One `user` can have many `user_spending_events` records, detailing each instance of their spending.
    *   This relationship is a direct foreign key constraint.

*   **`users` to `token_allocations` (One-to-Many):**
    *   A `user` can have multiple `token_allocations` entries over time, potentially from different `merkle_roots` (e.g., a user might claim new member tokens in one period and paid points in another).
    *   The `wallet_address` in `token_allocations` is a Foreign Key referencing `users.wallet_address`, ensuring that every allocation is tied to a valid user in the `users` table.

*   **`merkle_roots` to `token_allocations` (Many-to-1):**
    *   Many `token_allocations` records (leaves) belong to one `merkle_roots` entry (a single Merkle tree snapshot).
    *   The `merkle_root_id` in `token_allocations` is the Foreign Key linking each allocation back to the specific Merkle root it belongs to.

This updated ERD provides a clear overview of the data structure required to implement a scalable, Merkle tree-based token distribution system, accommodating both one-time and continuous earning scenarios.
