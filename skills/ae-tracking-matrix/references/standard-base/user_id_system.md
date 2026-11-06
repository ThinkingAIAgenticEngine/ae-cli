# Standard Base - User ID System

> Source: Feishu sheets `M71zsVFKihDEKXtZJjZcOkAvn5b` / sheet "User ID System", cached on 2026-09-20. The cloud copy is the authoritative version; the cloud takes precedence on conflict.

| Game Type | Property Name | Property Display Name | Property Description | Assignment Description |
|---|---|---|---|---|
| No account system | #account_id | Account ID | System property | NULL |
| No account system | #distinct_id | Guest ID | System property | Device-related ID or in-business guest ID; no need to care if using the client-side SDK |
| Single account, single role | #account_id | Account ID | System property | Simply set it to the player's unique account ID |
| Single account, single role | #distinct_id | Guest ID | System property | Device-related ID or in-business guest ID; no need to care if using the client-side SDK |
| Single account, multiple roles | #account_id | Account ID | System property | Set to role ID; the account ID that the role belongs to is set as a custom property of the role |
| Single account, multiple roles | #distinct_id | Guest ID | System property | Device-related ID or in-business guest ID; no need to care if using the client-side SDK |
| Reference: see the User ID System section of "How to Design Tracking" |  |  |  |  |
