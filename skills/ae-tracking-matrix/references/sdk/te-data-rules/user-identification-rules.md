---
code: user_identify
name: "User Identification Rules"
wikiToken: LzHIwOjA3iyKjskrWb4crIhlnr2
parentWikiToken: Bmhewqk5PiJirhk1GJzcJliqnOh
updateTime: 1774407320000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=6.0&lan=zh-CN&code=user_identify
---

# User Identification Rules

Users may use your product on different devices and also use it in a non-logged-in state, making accurate user identification quite complex. TE has chosen a relatively accurate and easy-to-understand solution. This document will detail the user identification rules and provide cases to help you quickly understand them.

::: tip Summary

1. A user will have three IDs for identification, namely:

- TE User ID (#user_id): The unique user ID in the TE system
- Account ID (#account_id): The user's login ID
- Visitor ID (#distinct_id): The user's ID in non-logged-in state

2. The most critical ID for identifying a user is "TE User ID". For every data received by the TE system, the corresponding "TE User ID" will be associated based on the "Account ID" and "Visitor ID" of that data. If a data contains both "Account ID" and "Visitor ID", priority is given to associating the "TE User ID" based on the "Account ID". If the "Account ID" does not exist, then associate the "TE User ID" based on the "Visitor ID"

3. When the data received by the TE backend contains a new "Account ID" or "Visitor ID":

- If the data contains a "Visitor ID", and the "Visitor ID" has already been associated with a "TE User ID", but is not bound to an "Account ID", then the "Account ID" will be bound with the "Visitor ID", sharing one "TE User ID"
- If the "Visitor ID" does not exist or has been bound by another Account ID, then no binding occurs, and the "Account ID" will be associated with a new "TE User ID"

4. When the TE backend receives data containing a new "Visitor ID":

- If the current data contains an "Account ID", then it will be bound with that "Account ID", and both IDs are associated with the same "TE User ID"
- If the current data does not contain an "Account ID", then no binding occurs, and the "Visitor ID" will be associated with a new "TE User ID"

5. "TE User ID" corresponds one-to-one with "Account ID". An "Account ID" can be bound to multiple "Visitor IDs", but a "Visitor ID" can only be bound to one "Account ID".

:::

### I. Types of User Identification IDs

The TE platform mainly uses three user identification IDs, namely "Visitor ID (`#distinct_id`)", "Account ID (`#account_id`)" and "TE User ID (`#user_id`)". This section will briefly introduce the meaning of these three IDs:

#### 1.1 Visitor ID (`#distinct_id`)

Visitor ID is the user's identifier in non-logged-in state, used to identify user data before login or outside the game, such as pre-registration data, advertising data, etc.

If you use client SDK integration, the SDK will automatically assign a unique visitor ID to the user. If you need to customize the user's visitor ID, please call `identify` immediately after SDK initialization to set it.

::: warning

Please avoid calling `identify` again to change the visitor ID after uploading events, as this operation may cause serious data issues such as user matching failure or duplicate users.

:::

#### 1.2 Account ID (`#account_id`)

Account ID is the user's identifier in logged-in state, used to identify user data after login. Games mostly use "account, character" two dimensions to identify users. Generally, we recommend using the smaller granularity, i.e., "Character ID" as the Account ID. When there is no character dimension, use "Account Login ID" as the Account ID.

If you use client SDK integration, you can call `login` to set the Account ID when the user registers, logs in, or when creating a character, entering a server. The SDK will save the Account ID, and subsequent data will all contain the Account ID. If `login` is called again to configure the Account ID, the newly passed value will be used as the Account ID. You can also call `logout` to clear the Account ID, and subsequent data will not contain the Account ID.

#### 1.3 TE User ID (`#user_id`)

"TE User ID" is the unique identifier ID used internally by the TE system to identify users. For any correct data entering the database, the system will generate the "TE User ID" for that data based on the "Account ID" and "Visitor ID", to clarify which user that data belongs to.

"TE User ID" plays a very important role in analysis. Event data, user attributes, and user segment tags etc. data tables need to be associated through "TE User ID". The user distinct count calculated in analysis models is essentially the distinct count of "TE User ID".

It can be considered that the user identification rule is the rule for generating "TE User ID" for each data. The logic for generating "TE User ID" can be divided into two steps:

1. Update the user ID relationship table: When the data contains new "Account ID" or "Visitor ID", the TE system will update the internal user ID relationship table
1. Data association with "TE User ID": Based on the "Account ID" or "Visitor ID" in the data, find the corresponding "User ID" in the relationship table, and associate a "TE User ID" for each data

### II. Updating ID Relationship Table

Inside the TE system, there is a user ID relationship table independent of the event table and user table. This table records the association relationship between "TE User ID" and "Account ID", "Visitor ID". When the system receives data containing new "Account ID" or "Visitor ID", this relationship table will be updated.

- If the data only contains "Account ID", or only contains "Visitor ID", and that ID is received for the first time. At this time, the system will create a new "TE User ID" and associate it with the passed ID.

If the data contains both "Account ID" and "Visitor ID", then there is also an ID binding mechanism. ID binding refers to binding "Account ID" and "Visitor ID" together, associating them with the same "TE User ID", equivalent to binding a user's pre-login and post-login data.

- Both "Account ID" and "Visitor ID" are received for the first time, at this time the two IDs will be bound and associated with a new "TE User ID"
- If the "Account ID" exists in the association table, and the "Visitor ID" is a new ID, then the "Visitor ID" will be bound with the "Account ID". An "Account ID" can bind multiple "Visitor IDs".
- If the "Visitor ID" exists in the association table, and the "Account ID" is a new ID, there are two cases:
- The "Visitor ID" has already been bound with another "Account ID", then the "Visitor ID" is not bound with the "Account ID", and the "Account ID" is associated with a new "TE User ID"
- The "Visitor ID" has not been bound with another "Account ID", then the "Visitor ID" will be bound with the "Account ID"

If both the "Account ID" and "Visitor ID" in the data exist in the relationship table, then the relationship table is not adjusted.

### III. Data Association with "TE User ID"

Next is the step of data association with "TE User ID", still divided into two rules:

- If the data only has "Account ID" or "Visitor ID", then directly get the "TE User ID" associated with that ID
- If the data contains both "Account ID" and "Visitor ID", then get the "TE User ID" associated with the "Account ID"

Simply put, "Account ID" has higher priority in judging user ID association. When there is an "Account ID", take the associated ID of the "Account ID"; when there is no "Account ID", take the associated ID of the "Visitor ID".

### IV. Case Analysis

To help you better understand TE's user identification solution, this section will demonstrate the operation mechanism of the identification rules in the form of cases. The cases will present the operation of configuring "User ID" after the backend receives data. You need to focus on the value of `#user_id` in each step and the principle of association.

#### 4.1 Only "Visitor ID" Case

When there is only "Visitor ID", the User ID will only be generated based on `#distinct_id`

**#account_id**

**#distinct_id**

**#user_id**

null

A

1

null

B

2

null

C

3

null

A

1

In the above scenario, the backend received three new "Visitor IDs", so three new "User IDs" were created. In the fourth step, "Visitor ID" "A" has a corresponding "User ID" "1", so no new "User ID" was created, treated as a previously created user with "User ID" of "1".

#### 4.2 Visitor ID is Bound to User ID, but Not Bound to Account ID

When "Visitor ID" has a corresponding User ID, but is not bound to "Account ID", passing an "Account ID" will bind the "Account ID" with the "Visitor ID"

**#account_id**

**#distinct_id**

**#user_id**

null

A

1

Account_A

A

1

In the above scenario, the backend received a new "Visitor ID" and therefore created a new "User ID". Later, a new "Account ID" was received. At this time, the "Visitor ID" was not bound to an "Account ID", so the new "Account ID" was bound with the "Visitor ID".

#### 4.3 Visitor ID is Bound to User ID, and Already Bound to Account ID

When "Visitor ID" has already been associated with "User ID", and already bound to "Account ID", a new "Account ID" cannot bind that "Visitor ID". That "Account ID" can subsequently attempt to bind with other "Visitor IDs":

**#account_id**

**#distinct_id**

**#user_id**

Account_A

A

1

Account_B

A

2

Account_B

B

2

null

B

2

null

A

1

Account_C

B

3

In the above scenario, you can see that "Visitor ID" "A" has already been bound with "Account ID" "Account_A". At this time, the new "Account ID" "Account_B" cannot bind "Visitor ID" "A", but is associated with a new "User ID" "2". In the third step, when "Account ID" "Account_B" and "Visitor ID" "B" are passed together, "Visitor ID" "B" has not been bound to an "Account ID", so the two are bound. Therefore, the "Visitor ID" "B" passed in the fourth step is associated with "User ID" "2". Finally, when new "Account ID" "Account_C" and "Visitor ID" "B" are passed together, binding also does not occur, and "Account ID" "Account_C" is associated with new "User ID" "3". Here is the final state of the ID association table:

**#user_id**

**#account_id**

**#distinct_id**

1

Account_A

A

2

Account_B

B

3

Account_C

null

### V. Complex Scenario Analysis

Finally, we present user identification in complex scenarios. For easier understanding, we will show the User table structure at key steps. You can refer to the explanation of that step to understand:

**Step**

**#account_id**

**#distinct_id**

**#user_id**

1

null

A

1

2

Account_A

A

1

3

Account_B

A

2

4

null

B

3

5

Account_B

B

2

6

Account_C

B

3

7

Account_C

C

3

8

Account_B

C

2

9

Account_D

D

4

10

null

C

3

For the above complex scenario, we will analyze step by step:

(1) Passed new "Visitor ID" "A", bound with newly created "User ID" "1"

(2) New "Account ID" "Account_A" added, "Visitor ID" "A" is not bound to Account ID, so "Account_A" and "A" are bound, associated with "User ID" "1".

(3) New "Account ID" "Account_B" added, "Visitor ID" "A" has already been bound to "Account ID" "Account_A", so a new "User ID" "2" is created and associated with it. At this time, "Account ID" "Account_B" is not bound with "Visitor ID". The ID association table is as follows:

**#user_id**

**#account_id**

**#distinct_id**

1

Account_A

A

2

Account_B

null

(4) At this time, new "Visitor ID" "B" is added, newly created "User ID" "3" is associated with it

(5) "Account ID" "Account_B" and "Visitor ID" "B" both exist in the ID association table, so no binding occurs. The ID association table is as follows:

**#user_id**

**#account_id**

**#distinct_id**

1

Account_A

A

2

Account_B

null

3

null

B

(6) New "Account ID" "Account_C" added, "Visitor ID" "B" is not bound to "Account ID", so "Account_C" and "B" are bound, associated with "User ID" "3". The ID association table is as follows:

**#user_id**

**#account_id**

**#distinct_id**

1

Account_A

A

2

Account_B

null

3

Account_C

B

(7) New "Visitor ID" "C" added, bound with "Account ID" "Account_C". The ID association table is as follows:

**#user_id**

**#account_id**

**#distinct_id**

1

Account_A

A

2

Account_B

null

3

Account_C

B, C

(8) "Account ID" "Account_B" and "Visitor ID" "C" both exist in the ID association table. At this time, the ID association table does not change

(9) New "Account ID" "Account_D" and "Visitor ID" "D" added, the two are bound, and associated with new "User ID" "4"

(10) Finally, the data only contains "Visitor ID" "C", returns its associated "User ID" "3"

The final ID association table structure is:

**#user_id**

**#account_id**

**#distinct_id**

1

Account_A

A

2

Account_B

null

3

Account_C

B, C

4

Account_D

D
