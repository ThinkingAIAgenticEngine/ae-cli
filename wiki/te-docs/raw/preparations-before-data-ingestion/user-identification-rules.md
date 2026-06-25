---
code: user_identify
name: "User Identification Rules"
wikiToken: Pov9wECdsi2QQsk4NN9cEPsvnyc
parentWikiToken: OhD8we9iai6Xk5kM1QNc8ITRnQe
updateTime: 1774249025000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=user_identify
---

Since users may use your products with different devices, even without logging in, accurate user identification becomes a complex issue. In this light, TE chose a relatively accurate scheme that is easy to understand. This document would describe the rules on user identification in detail and help you understand by providing specific cases. 
::: tip
1. A user usually has three IDs, including:
- TE user ID（#user_id）: the unique user ID of the TE system 
- Account ID（#account_id）: the log-in ID of users 
- Distinct ID（#distinct_id）: ID of users under unlogged-in state
2. To identify a user, the key is to identify the 「TE user ID」. Data received by the TE system could be associated with a corresponding 「TE user ID」 according to the 「Account ID」 and 「Distinct ID」 of the data. If the data contains the 「Account ID」 and 「Distinct ID」 simultaneously, it should be associated with a 「TE user ID」 as the priority. If the data has no 「Account ID」, it should be associated with a 「TE user ID」 according to the 「Distinct ID」
3. When the data received by the background of TE contains a new 「Account ID」 or 「Distinct ID」:
  - If the data contains a 「Distinct ID」 that has been associated with a 「TE user ID」 but not associated with a 「Account ID」, the 「Account ID」 should be bound with the 「Distinct ID」 to share the 「TE user ID」.
  - If the 「Distinct ID」 does not exist or has been bound with other account IDs, the 「Account ID」 shall not be bound with the 「Distinct ID」, instead, it shall be associated with a new 「TE user ID」
4. When the background of TE receives data containing a new 「Distinct ID」:
- If the data has a 「Account ID」, the 「Distinct ID」 should be bound with the 「Account ID」 to share the 「TE user ID」
- If the data does not have a 「Account ID」, the 「Distinct ID」 shall not be bound with any 「Account ID」, instead, it shall be associated with a new 「TE user ID」
5. A 「TE user ID」 could only be bound with one 「Account ID」, while 「Account ID」 can be bound with multiple 「Distinct IDs」. However, a 「Distinct ID」 could only be bound with one 「Account ID」.
:::

## **I. Types of User Identification ID**
TE platform mainly uses three user identification IDs, including 「Distinct ID（#distinct_id）」, 「Account ID（#account_id）」 and 「TE user ID（#user_id）」. This section will offer a brief introduction to these three IDs. 
### 1.1 **Distinct ID**（`#distinct_id`）
Distinct ID, the identification of users under unlogged-in state, is used to identify data generated before the user logs in or outside the game, namely, data before registration, advertisement data, etc. 
If you access with client-end SDK, the SDK will configure a unique Distinct ID for the user automatically. If you need to customize a Distinct ID for the user, please invoke `identity` immediately after the initialization of SDK.
::: warning
Please avoid re-invoking `identify` to change the Distinct ID after the upload event, otherwise, severe data problems might occur, for example, the user could not be matched or there are duplicate users. 
:::
### 1.2 **Account ID**（`#account_id`）
Account ID, the identification of users under a logged-in state, is used to identify data generated after the user logs in. Most games identify users from such two dimensions as 「account and role」. In general cases, we suggest small granularity be used, that is, the 「role ID」 should be used as the account ID. If there is no role, 「account log-in ID」 should be used as the account ID. 

If you access with client-end SDK, you can invoke `login` to set account ID when the user is registering/logging in or creating a role/entering the server. SDK will save the account ID and have it carried in each data generated subsequently. If `login` is re-invoked to configure the account ID, the value that is newly transmitted shall be used as the account ID. You can also invoke `logout` to delete the account ID, and the remaining data shall not carry the account ID after it is deleted. 
### 1.3 **TE**** User ID**（`#user_id`）
「TE user ID」 is the unique identification ID used by the TE system to identify users. When importing correct data into the database, the system would generate the 「TE user ID」 of the data according to its 「Account ID」 and 「Distinct ID」 to indicate which user owns the data.
「TE user ID」 plays an important role in the analysis. Datasheets like event data, user attributes, and user group labels should be associated with the 「TE user ID」. The number of deduplicated users calculated in the analysis model is the number of deduplicated 「TE user ID」 in nature.

The rules on user identification could also be regarded as the rules on the generation of 「TE user ID」 by each piece of data. The generation logic of 「TE user ID」 can be divided into two steps:
1. Update the relational table of the user ID; when there is any new 「Account ID」 or 「Distinct ID」 in the data, the TE system would update the relational table of the user ID saved in the system
2. Associating user with 「TE user ID」: search for the 「User ID」 in the relational table that corresponds to the 「Account ID」 or 「Distinct ID」 in the data, and associate each piece of data with the corresponding 「TE user ID」
## 
## **II. Update the ID Relational Table**
There is a relational table independent from the user ID of the event table and user table in the TE system, which records the association relationship between 「TE user ID」 and 「Account ID」 or 「Distinct ID」. When the data received by the system contains a new 「Account ID」 or 「Distinct ID」, the relational table would be updated.
- If the data only contains a 「Account ID」 or 「Distinct ID」 and such ID is received for the first time, the system would create a 「TE user ID」 and associate it with the input ID. 

If the data contains 「Account ID」 and 「Distinct ID」 simultaneously, there would also be an ID binding mechanism. ID binding means to bind 「Account ID」 and 「Distinct ID」 and associate them with the same 「TE user ID」, which is equivalent to the act of binding the data before the user logs in with the data after the user logs in.
- If the 「Account ID」 and 「Distinct ID」 are received for the first time, the two IDs would be bound with each other and then associated with a new 「TE user ID」
- If the 「Account ID」 is listed in the relational table while the 「Distinct ID」 is a newly-created ID, the 「Distinct ID」 should be bound with the 「Account ID」. A 「Account ID」 can be bound with multiple 「Distinct IDs」.
- If 「Distinct ID」 is listed in the relational table while the 「Account ID」 is a newly-created ID, the following situations might occur:
  - If the 「Distinct ID」 has been bound with another 「Account ID」, the 「Account ID」 shall not be bound with the 「Distinct ID」, instead, it shall be associated with a new 「TE user ID」
  - If the 「Distinct ID」 has not been bound with other 「Account ID」, it shall be bound with the newly-created 「Account ID」. 

If both the 「Account ID」 and 「Distinct ID」 in the data are listed in the relational table, the relational table shall not be adjusted. 
## 
## **III. Associate Data with 「****TE**** user ID」**
Next, let's move to the step of associating data with 「TE user ID」, to which two rules shall apply:
- If there is only a 「Account ID」 or 「Distinct ID」 in the data, obtain the 「TE user ID」 associated with the ID directly
- If the data contains a 「Account ID」 and a 「Distinct ID」 simultaneously, obtain the 「TE user ID」 associated with the 「Account ID」
To be brief, 「Account ID」 enjoys higher priority during the identification of the associated user ID. When the data contains a 「Account ID」, obtain the associated ID of the 「Account ID」, otherwise, the associated ID of the 「Distinct ID」 shall be obtained. 

## **IV. Case Study**
To help you better understand the user identification scheme of TE, this section would display the operation mechanism of the above identification rules with specific cases. The cases would show you the operation of configuring 「User ID」 after the background receives data. You are recommended to pay attention to the value of #user_id in each step as well as the associated principles. 
### **4.1 When there is only a 「Distinct ID」**
When there is only a 「Distinct ID」, the user ID would only be generated in the form of `#distinct_id`

<lark-table rows="5" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
    <lark-td>
      **#user_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      C
    </lark-td>
    <lark-td>
      3
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
</lark-table>

In the above scenario, the background received three new 「Distinct IDs」, which means the 「User ID」 has been created for three times. However, in step 4, since the 「Distinct ID」 "A" had a corresponding 「User ID」 "1", the system did not create a new 「User ID」. Instead, the user was regarded as someone who had an ID, and the 「User ID」 was "1".
### **4.2 The 「Distinct ID」 has been bound with a user ID, but has not been bound with a 「Account ID」**
When a 「Distinct ID」 has a corresponding user ID but was not bound with any 「Account ID」, the input 「Account ID」 would be bound with a 「Account ID」 and 「Distinct ID」 

<lark-table rows="3" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
    <lark-td>
      **#user_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
</lark-table>

In the above scenario, the background received a new 「Distinct ID」. This is why a new 「User ID」 was created. Then, a new 「Account ID」 was received. At this time, the 「Distinct ID」 was not bound with any 「Account ID」. So the new 「Account ID」 was bound with the 「Distinct ID」.
### **4.3 The Distinct ID has been bound with a user ID but has not been bound with an Account ID**
When the 「Distinct ID」 has been associated with a 「User ID」 and bound with a 「Account ID」, the new 「Account ID」 could not be bound with the 「Distinct ID」. In this case, attempts could be made to bind the 「Account ID」 with other 「Distinct ID」 in the future. 

<lark-table rows="7" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
    <lark-td>
      **#user_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      3
    </lark-td>
  </lark-tr>
</lark-table>

In the above scenario, it can be observed that 「Distinct ID」 "A" has been bound with 「Account ID」 "A". At this time, the new 「Account ID」 "A" could not be bound with 「Distinct ID」 "A", but could be associated with the new 「User ID」 "2". In step 3, when 「Account ID」 "B" and 「Distinct ID」 "B" were input simultaneously, the two IDs were bound with each other because 「Distinct ID」 "B" had not been bound with any 「Account ID」, which explains why the 「Distinct ID」 "B" input in step 4 was associated with 「User ID」 "2". At last, when the new 「Account ID」 "C" and 「Distinct ID」 "B" were input simultaneously, the two were not bound with each other. Instead, 「Account ID」 "C" was associated was the new 「User ID」 "3". The final state of the ID relational table is as follows: 

<lark-table rows="4" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#user_id**
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      B
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      null
    </lark-td>
  </lark-tr>
</lark-table>

## **V. Analysis of Complex Scenarios**
What comes last is user identification under complex scenarios. To help you understand, we will display the User table structure of key steps. You can try to understand this part by referring to the description of the steps. 

<lark-table rows="11" cols="4" column-widths="182,182,182,182">

  <lark-tr>
    <lark-td>
      Steps
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
    <lark-td>
      **#user_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      1
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      A
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      4
    </lark-td>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      3
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      5
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      6
    </lark-td>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      B
    </lark-td>
    <lark-td>
      3
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      7
    </lark-td>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      C
    </lark-td>
    <lark-td>
      3
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      8
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      C
    </lark-td>
    <lark-td>
      2
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      9
    </lark-td>
    <lark-td>
      δ
    </lark-td>
    <lark-td>
      D
    </lark-td>
    <lark-td>
      4
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      10
    </lark-td>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      C
    </lark-td>
    <lark-td>
      3
    </lark-td>
  </lark-tr>
</lark-table>

Analysis of the above complex scenarios is as follows:
 （1）A new 「Distinct ID」 "A" was input and bound with the newly-created 「User ID」 "1".
（2）「Account ID」 "A" was newly added, while 「Distinct ID」 "A" had not been bound with any account ID. Therefore, 「Account ID」 "A" and 「Distinct ID」 "A" was bound with each other and associated with 「User ID」 "1".
（3）「Account ID」 "B" was newly added, while 「Distinct ID」 "A" had been bound with 「Account ID」 "A". Therefore, 「User ID」 "2" was created and associated with 「Account ID」 "B". At this time, 「Account ID」 "B" was not bound with any 「Distinct ID」. The ID relational table is as follows:

<lark-table rows="3" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#user_id**
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      null
    </lark-td>
  </lark-tr>
</lark-table>

（4）「Distinct ID」 "B" was newly added, and 「User ID」 "3" was created and associated with it. 
（5）Both 「Account ID」 "B" and 「Distinct ID」 "B" were listed in the ID relational table. Therefore, the two IDs were not bound with each other. At this time, the ID relational table is as follows: 

<lark-table rows="4" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#user_id**
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      null
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      null
    </lark-td>
    <lark-td>
      B
    </lark-td>
  </lark-tr>
</lark-table>


（6）「Account ID」 "C" was newly added, while 「Distinct ID」 "B" was not bound with any 「Account ID」. Therefore, 「Account ID」 "C" was bound with 「Distinct ID」 "B", and associated with 「User ID」 "3". At this time, the ID relational table is as follows:

<lark-table rows="4" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#user_id**
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      null
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      B
    </lark-td>
  </lark-tr>
</lark-table>


（7）「Distinct ID」 "C" was newly added, and was bound with 「Account ID」 "C". At this time, the ID relational table is as follows: 

<lark-table rows="4" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#user_id**
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      null
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      B, C
    </lark-td>
  </lark-tr>
</lark-table>


（8）Both 「Account ID」 "B" and 「Distinct ID」 "C" were listed in the ID relational table. At this time, the ID relational table remained the same. 
（9）「Account ID」 "D" and 「Distinct ID」 "D" were newly added, bound with each other and associated with the new 「User ID」 "4" 
（10）Finally, the data only contained 「Distinct ID」 "C", and the associated 「User ID」 "3" was returned. The final state of the ID relational table is as follows:

<lark-table rows="5" cols="3" column-widths="243,243,243">

  <lark-tr>
    <lark-td>
      **#user_id**
    </lark-td>
    <lark-td>
      **#account_id**
    </lark-td>
    <lark-td>
      **#distinct_id**
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      1
    </lark-td>
    <lark-td>
      α
    </lark-td>
    <lark-td>
      A
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      2
    </lark-td>
    <lark-td>
      β
    </lark-td>
    <lark-td>
      null
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      3
    </lark-td>
    <lark-td>
      γ
    </lark-td>
    <lark-td>
      B, C
    </lark-td>
  </lark-tr>
  <lark-tr>
    <lark-td>
      4
    </lark-td>
    <lark-td>
      δ
    </lark-td>
    <lark-td>
      D
    </lark-td>
  </lark-tr>
</lark-table>
