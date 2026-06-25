---
code: about_gdpr
name: "About GDPR"
wikiToken: EJ1rwNvTqi15UKkGJswcboO4ntc
parentWikiToken: AWr4wIMGYi9FB7ksPi4c17kNnxh
updateTime: 1774252027000
sourceUrl: https://docs-v2.thinkingdata.cn/?version=v6.0&lan=en-US&code=about_gdpr
---

## Introduction to GDPR

<quote-container>
On May 25, 2018, the European Union issued the "General Data Protection Regulation" (GDPR, General Data Protection Regulation). GDPR can be called the strictest and most detailed law in history to protect user data security.
</quote-container>

At a time when the demand for going to sea is increasingly strong, Chinese enterprises will face GDPR supervision in data collection, processing and application.
GDPR mainly protects the personal data of EU users. For apps or games that provide services to the EU, GDPR should be complied with.
GDPR defines two types of roles, a data controller and a data processor. ThinkingAnalytics, the core data product of Digital Technology (hereinafter referred to as TA system), belongs to the role of data processor in most scenarios, while our customers belong to the data controller. Both types of roles are bound by GDPR, so when using our products, we will fully help customers achieve GDPR compliance and avoid latent risks.
As a data controller, you are responsible for complying with the six principles set out in the GDPR. Failure to comply with the following principles will be punished:
- Lawfulness, fairness and transparency: the need to process personal data in a legal, fair and transparent manner
- Purpose limitation: Data collected can only be used for limited purposes
- Data minimisation: collecting only necessary and meaningful data
- Accuracy: Data needs to be accurate and timely, and methods can be taken to update and delete inaccurate information
- Storage limitation: Data needs to be cleaned up after the processing purpose is completed
- Data integrity and confidentiality (integrity and confidentiality): need to ensure the security of data storage, prevent unauthorized data access, prevent data from being destroyed or lost
In addition, the following rights of users need to be protected:
- Right to be Informed: Data controllers need to provide users with information about their data controllers, the types of personal data, the purpose of processing data, and legal basis, etc
- Right of access: Users can obtain personal data and process personal data
- Right to rectification: the user has the right to correct incorrect personal data
- Right to erasure: Users have the right to delete personal data
- Right to restriction of processing: Under certain circumstances (such as inaccurate data), users can restrict the processing of their personal data
- Right to data portability: users can transfer personal data to other data controllers
- Veto power (Right to object): Users can revoke their previous consent to the processing of personal data
- Right not to be subject to a decision based solely on automated processing, including profiling: Users need to be informed whether personal data will be used by automated decisions (including user profiles) and have the right to refuse data to be used by these systems
It should also be noted that data collection requires the user's consent, which needs to be clear and explicit, and the user can withdraw the previous consent based on "veto power".
As a professional service provider, Digital Technology is committed to providing efficient and compliant solutions to help Chinese companies grow their offshore business. The following are the relevant compliance measures and suggestions of Digital Technology for the core content of GDPR:
## GDPR Compliance Measures
### Fully Support Customized Acquisition to Ensure Data Acquisition Compliance
The TA system provides a full custom collection scheme at the data collection end, that is, customers can decide the collection of user information and behavior data according to actual needs and business scope. And all data collection schemes provided by TA system, including but not limited to client side SDK, server level SDK, data docking tool Logbus , etc., fully support the above principles and will not force the collection of any data related to user privacy. When developers need to collect relevant data from the client side for business needs, the client side of the user will also have relevant prompts to ensure the user's right to know. For specific data collection related schemes, please refer to the [<text underline="true">access guide</text>](https://thinkingdata.feishu.cn/wiki/AWr4wIMGYi9FB7ksPi4c17kNnxh).
In addition, we also recommend that customers only collect the minimum data set that meets their needs through the custom collection function provided by the TA system when the collection target is clear, in order to comply with the principle of "data minimization".
### Support User Data Update, Deletion, Transfer
TA system in the data collection side, support methods such as `user_set `and `user_delete `, the specified user data is updated and deleted. At the same time, we also provide `enableTracking `method, which can suspend all data reporting of a client and call the interface when the user does not agree with the data collection.
For data that has been received and stored by the TA system, the user data and related event data of a specific user can be deleted by the data deletion tool provided by the TA system. For specific operations, please refer to the [data deletion tool](https://thinkingdata.feishu.cn/wiki/Twatwe2vYi0ng0kFz8yczOIpn2o).
For storage data, TA system provides a variety of export methods, such as [<text underline="true">export data API</text>](https://thinkingdata.feishu.cn/wiki/HpUrwBMDNiGb1skKYYVc5qMnn2P).
In summary, on the basis of the above custom collection, TA system can support the update, deletion and transfer of relevant user data as developers' collection needs and users' actual needs change, thus providing users with the "right to correct", "right to delete" and "right to transfer" stipulated in GDPR.
### The Whole LifeCycle of Data is Transparent, Auditable, Highly Available and Reliable
TA system is a collection of data collection, reception, processing, storage, calculation, application in one of the user behavior analysis tools, data in the whole Life Time every link, are transparent and auditable. The TA system supports access and operation of all data components in the link, thus ensuring that every process of any piece of data from generation to application is traceable.
If in the actual data application process, for specific reasons, it is necessary to audit a certain link in the system, counting technology will provide relevant technical support as much as possible to ensure the transparency of the whole process.
At the same time, TA system has realized high availability and reliability of all components, ensuring the integrity of data service and data storage, which conforms to the principle of "data integrity and confidentiality".
## Other Suggestions
As a third-party data service provider, Count Technology is always committed to helping customers complete GDPR compliance from the product level. At the same time, it is also recommended that our customers increase their attention to user privacy. The following are some suggested measures from the developer level
A. Writing and completing a privacy policy
It is strongly recommended that you write your product's privacy policy and include standard terms on GDPR compliance, which will help your users to further understand the product's privacy protection policy.
B. Protecting users' right to information
In your product, you need to provide a clear application for data collection consent, and data collection is only allowed when the user agrees, so as to ensure that the user is informed when the user data is collected, not collected by default.
