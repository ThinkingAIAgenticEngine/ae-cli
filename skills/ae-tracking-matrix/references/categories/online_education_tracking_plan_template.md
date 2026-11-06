# online_education_tracking_plan.xlsx Tracking Plan


## #Event Data

| Event Name | Event Display Name | Event Description | Event Tag | Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ta_app_install | App Install | Reported on actual installation and startup of the APP |  |  |  |  |  |
| ta_app_start | App Start | Triggered when the app starts, timing begins |  | #resume_from_background | Resumed from background | bool |  |
| ta_app_end | App Logout | Recorded on app logout, timing ends |  | #duration | Event duration | number | [1200,3600] |
| ta_app_crash | App Crash | Reports APP crash events |  |  |  |  |  |
| first_device_add | Device Added | *Use the first-event feature to judge whether the device is newly added |  |  |  |  |  |
| register | User/Account Registration | Reported when (account) registration is completed |  | reg_type | Registration method | text | WeChat,Facebook,Google |
| login | User/Account Login | Reported after (account) login succeeds |  | first_login | First login | bool |  |
| logout | User/Account Logout | Reported after (account) logout succeeds |  | account_duration | Account online duration | number | [1200,3600] |
| consent_privacy_accept | Accept Privacy Policy |  |  | version | Policy version | text |  |
|  |  |  |  | accept | Accept | bool |  |
| onboarding_goal_select | Learning Goal Selection |  |  | goal | Goal | text | exam,career_upskill,hobby,school_support |
|  |  |  |  | goal_horizon_days | Goal horizon days | number | {30,365} |
| onboarding_subject_select | Preferred Subject Selection |  |  | subjects_count | Number of subjects selected | number | {1,8} |
|  |  |  |  | first_subject | First subject | text | math,english,cs,business,design,language,physics,chem |
| onboarding_placement_test_start | Placement Test Start |  |  | test_type | Test type | text | english_level,math_baseline,cs_basics |
|  |  |  |  | expected_duration_min | Expected duration (min) | number | {10,60} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| onboarding_placement_test_result | Placement Test Result |  |  | score_percent | Score % | number | {0,100} |
|  |  |  |  | recommended_level | Recommended level | text | beginner,intermediate,advanced |
|  |  |  |  | path_id | Learning path ID | text |  |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| home_feed_expose | Home Feed Impression |  |  | module | Module | text | continue_learning,recommended,top_rated,trending,for_you |
|  |  |  |  | card_count | First-screen card count | number | {1,20} |
| search_open | Search Open |  |  | from | Source | text | home,header,empty_state,shortcut |
|  |  |  |  | hot_terms_shown | Hot terms shown | number | {0,10} |
| search_submit | Search Submit |  |  | query_len | Query length | number | {1,32} |
|  |  |  |  | filter_used | Filter used | bool |  |
|  |  |  |  | vertical | Vertical | text | course,lesson,instructor,track |
| course_detail_view | Course Detail Impression |  |  | course_id | Course ID | text |  |
|  |  |  |  | entry | Entry | text | home,search,category,share,notification |
|  |  |  |  | preview_video | Has preview video | bool |  |
| course_syllabus_expand | Course Syllabus Expand |  |  | sections_count | Number of sections | number | {1,200} |
|  |  |  |  | expanded_section_index | Expanded index | number | {1,200} |
| instructor_profile_view | Instructor Profile Impression |  |  | instructor_id | Instructor ID | text |  |
|  |  |  |  | entry | Entry | text | course_detail,search,discussion |
| enroll_course_free | Free Course Enrollment |  |  | course_id | Course ID | text |  |
|  |  |  |  | source | Source | text | course_detail,syllabus,home,deeplink |
| add_to_cart | Add to Cart |  |  | course_id | Course ID | text |  |
|  |  |  |  | price_usd | Price USD | number | [0.01,999.99] |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| checkout_start | Checkout Start |  |  | items_count | Items count | number | {1,10} |
|  |  |  |  | coupon_applied | Coupon applied | bool |  |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| payment_success | Payment Success |  |  | order_id | Order ID | text |  |
|  |  |  |  | amount_usd | Amount USD | number | [0.01,9999.99] |
|  |  |  |  | method | Payment method | text | WeChat,Alipay,CreditCard,ApplePay,GooglePay |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| payment_fail | Payment Fail |  |  | order_id | Order ID | text |  |
|  |  |  |  | reason | Failure reason | text | declined,network,cancel,error,3ds_fail |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| subscribe_pro_start | Subscription Start |  |  | plan | Plan | text | Monthly,Quarterly,Annual |
|  |  |  |  | trial_days | Trial days | number | {0,30} |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| subscribe_pro_success | Subscription Success |  |  | order_id | Order ID | text |  |
|  |  |  |  | plan | Plan | text | Monthly,Quarterly,Annual |
|  |  |  |  | auto_renew | Auto renew | bool |  |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| subscribe_cancel | Subscription Cancel |  |  | reason | Reason | text | price,not_using,content_quality,other |
|  |  |  |  | currency | Currency | text | CNY,USD,EUR,JPY |
|  |  |  |  | fx_rate | FX rate | number | [0.1,10] |
|  |  |  |  | payment_retry | Retry count | number | {0,3} |
| course_start | Start Course |  |  | course_id | Course ID | text |  |
|  |  |  |  | progress_percent | Progress % | number | {0,100} |
| lesson_enter | Enter Lesson |  |  | course_id | Course ID | text |  |
|  |  |  |  | lesson_id | Lesson ID | text |  |
|  |  |  |  | content_type | Content type | text | video,reading,practice,coding,lab |
| video_play_request | Play Request |  |  | lesson_id | Lesson ID | text |  |
|  |  |  |  | drm | DRM | text | Widevine,FairPlay,PlayReady,None |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| video_first_frame | First Frame |  |  | ttff_ms | Time to first frame ms | number | {200,8000} |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| video_play_start | Play Start |  |  | bitrate_kbps | Bitrate kbps | number | {150,12000} |
|  |  |  |  | muted | Muted | bool |  |
|  |  |  |  | subtitle_lang | Subtitle | text | off,zh,en,ja,ko,es |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| video_buffer_start | Buffer Start |  |  | reason | Reason | text | network,seek,bitrate_switch,other |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| video_buffer_end | Buffer End |  |  | rebuffer_ms | Rebuffer duration ms | number | {50,60000} |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| video_seek | Seek |  |  | from_sec | From sec | number | {0,7200} |
|  |  |  |  | to_sec | To sec | number | {0,7200} |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| video_speed_change | Playback Speed Change |  |  | from | Original speed | number | [0.5,3.0] |
|  |  |  |  | to | New speed | number | [0.5,3.0] |
|  |  |  |  | player | Player | text | exoplayer,avplayer,web |
|  |  |  |  | cdn | CDN | text | Akamai,CloudFront,Fastly,Self |
|  |  |  |  | abr | Adaptive bitrate | bool |  |
|  |  |  |  | resolution | Resolution | text | 360p,480p,720p,1080p,2K |
|  |  |  |  | dropped_frames | Dropped frames | number | {0,500} |
| transcript_toggle | Captions/Transcript Toggle |  |  | before | Before toggle | text | on,off |
|  |  |  |  | after | After toggle | text | on,off |
|  |  |  |  | panel_type | Panel type | text | captions,transcript,translation |
| note_add | Add Class Note |  |  | note_chars | Note character count | number | {1,5000} |
|  |  |  |  | timestamp_sec | In-video timestamp | number | {0,7200} |
| bookmark_add | Bookmark/Favorite Lesson |  |  | lesson_id | Lesson ID | text |  |
|  |  |  |  | reason | Reason | text | review_later,important,exam_related |
| resource_download | Resource Download |  |  | file_id | File ID | text |  |
|  |  |  |  | file_type | Type | text | pdf,slides,zip,code,excel |
| lesson_complete | Lesson Complete |  |  | completion_ratio | Completion ratio | number | [0,1] |
|  |  |  |  | auto_advance | Auto advance to next | bool |  |
| practice_session_start | Practice Start |  |  | mode | Mode | text | spaced_repetition,random_set,exam_simulation |
|  |  |  |  | target_count | Target question count | number | {5,100} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| practice_question_show | Question Shown |  |  | question_id | Question ID | text |  |
|  |  |  |  | difficulty | Difficulty | text | easy,medium,hard |
|  |  |  |  | has_hint | Has hint | bool |  |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| practice_hint_request | Request Hint |  |  | question_id | Question ID | text |  |
|  |  |  |  | hint_level | Hint level | text | step1,step2,full |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| practice_answer_submit | Submit Answer |  |  | question_id | Question ID | text |  |
|  |  |  |  | correct | Correct | bool |  |
|  |  |  |  | time_spent_sec | Time spent sec | number | {1,600} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| practice_session_end | Practice End |  |  | answered | Answered count | number | {1,500} |
|  |  |  |  | correct_rate | Correct rate | number | [0,1] |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| quiz_start | Quiz Start |  |  | quiz_id | Quiz ID | text |  |
|  |  |  |  | time_limit_min | Time limit min | number | {10,180} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| quiz_submit | Quiz Submit |  |  | attempt_id | Attempt ID | text |  |
|  |  |  |  | answers_count | Answered count | number | {1,200} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| quiz_result | Quiz Result |  |  | score_percent | Score % | number | {0,100} |
|  |  |  |  | passed | Passed | bool |  |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| assignment_open | Homework Open |  |  | assignment_id | Homework ID | text |  |
|  |  |  |  | due_in_days | Days until due | number | {-1,60} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| assignment_upload | Homework Upload |  |  | files_count | File count | number | {1,20} |
|  |  |  |  | total_size_mb | Total size MB | number | {1,10000} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| plagiarism_check_request | Plagiarism Check Request |  |  | tool | Plagiarism tool | text | turnitin,internal,none |
|  |  |  |  | estimated_wait_sec | Estimated wait sec | number | {5,600} |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| plagiarism_check_result | Plagiarism Check Result |  |  | similarity_percent | Similarity % | number | {0,100} |
|  |  |  |  | flagged | Flagged as anomalous | bool |  |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| coding_lab_open | Coding Lab Open |  |  | lab_id | Lab ID | text |  |
|  |  |  |  | language | Programming language | text | python,java,cpp,js,go |
|  |  |  |  | language | Programming language | text | python,java,cpp,js,go |
|  |  |  |  | runtime_ms | Runtime ms | number | {1,120000} |
|  |  |  |  | memory_mb | Memory MB | number | {10,4096} |
| coding_file_edit | Code Edit |  |  | file_path | File path | text |  |
|  |  |  |  | edit_chars | Edit character count | number | {1,5000} |
|  |  |  |  | language | Programming language | text | python,java,cpp,js,go |
|  |  |  |  | runtime_ms | Runtime ms | number | {1,120000} |
|  |  |  |  | memory_mb | Memory MB | number | {10,4096} |
| coding_run | Code Run |  |  | run_id | Run ID | text |  |
|  |  |  |  | test_cases | Test case count | number | {0,100} |
|  |  |  |  | language | Programming language | text | python,java,cpp,js,go |
|  |  |  |  | runtime_ms | Runtime ms | number | {1,120000} |
|  |  |  |  | memory_mb | Memory MB | number | {10,4096} |
| coding_test_result | Test Result |  |  | passed_cases | Passed cases | number | {0,100} |
|  |  |  |  | failed_cases | Failed cases | number | {0,100} |
|  |  |  |  | compile_error | Compile error | bool |  |
|  |  |  |  | language | Programming language | text | python,java,cpp,js,go |
|  |  |  |  | runtime_ms | Runtime ms | number | {1,120000} |
|  |  |  |  | memory_mb | Memory MB | number | {10,4096} |
| ai_code_explain_request | AI Code Explanation Request |  |  | selection_lines | Selected code lines | number | {1,200} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_code_explain_result | AI Code Explanation Result |  |  | #duration | Duration sec | number | {1,600} |
|  |  |  |  | success | Success | bool |  |
|  |  |  |  | tokens_out | Output tokens | number | {20,3000} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_tutor_question_request | AI Tutor Question Request |  |  | question_len | Question length | number | {3,500} |
|  |  |  |  | subdomain | Subject subdomain | text | grammar,algebra,algorithms,marketing,finance,physics |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_tutor_answer_result | AI Tutor Answer Result |  |  | #duration | Duration sec | number | {1,600} |
|  |  |  |  | success | Success | bool |  |
|  |  |  |  | citations | Citation count | number | {0,10} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_summarize_lecture_request | AI Lesson Summary Request |  |  | lesson_id | Lesson ID | text |  |
|  |  |  |  | target_len | Target length | text | bullet_5,bullet_10,short,medium,long |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_summarize_lecture_result | AI Lesson Summary Result |  |  | #duration | Duration sec | number | {1,600} |
|  |  |  |  | success | Success | bool |  |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_generate_flashcards_request | AI Flashcard Generation Request |  |  | source_type | Source type | text | lesson,notes,upload |
|  |  |  |  | requested_count | Requested count | number | {5,100} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| ai_generate_flashcards_result | AI Flashcard Generation Result |  |  | #duration | Duration sec | number | {1,600} |
|  |  |  |  | cards_generated | Cards generated | number | {1,100} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| learning_path_recommend_request | Personalized Path Recommendation Request |  |  | goal | Goal | text | exam,career_upskill,hobby,school_support |
|  |  |  |  | time_per_day_min | Daily available time min | number | {10,180} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| learning_path_recommend_result | Personalized Path Recommendation Result |  |  | #duration | Duration sec | number | {1,600} |
|  |  |  |  | modules | Module count | number | {1,50} |
|  |  |  |  | model | Model | text | gpt-4o,claude-3.5,gemini-1.5,local-llm |
|  |  |  |  | provider | Provider | text | OpenAI,Anthropic,Google,SelfHosted |
|  |  |  |  | tokens_in | Input Tokens | number | {1,4000} |
|  |  |  |  | temperature | Temperature | number | [0,1] |
|  |  |  |  | cache_hit | Cache hit | bool |  |
| live_class_schedule_view | Live Class Schedule View |  |  | calendar_range_days | Calendar range days | number | {7,30} |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| live_class_reminder_set | Live Class Reminder Set |  |  | live_id | Live ID | text |  |
|  |  |  |  | reminder_minutes | Reminder minutes in advance | number | {5,120} |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| live_class_join | Join Live Class |  |  | live_id | Live ID | text |  |
|  |  |  |  | role | Role | text | student,ta,instructor |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| live_class_chat_send | Live Class Chat Send |  |  | len | Text length | number | {1,300} |
|  |  |  |  | emoji | Contains emoji | bool |  |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| live_class_poll_vote | Live Class Poll Vote |  |  | poll_id | Poll ID | text |  |
|  |  |  |  | option_index | Option index | number | {1,10} |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| live_class_question_submit | Live Class Question Submit |  |  | question_len | Question length | number | {3,500} |
|  |  |  |  | is_anonymous | Anonymous question | bool |  |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| live_class_leave | Leave Live Class |  |  | #duration | Stay duration sec | number | {1,14400} |
|  |  |  |  | watched_ratio | Watched ratio | number | [0,1] |
|  |  |  |  | join_latency_ms | Join latency ms | number | {0,60000} |
|  |  |  |  | avg_bitrate_kbps | Average bitrate | number | {150,8000} |
|  |  |  |  | chat_rate_per_min | Chat rate per min | number | {0,300} |
| discussion_open | Discussion Forum Open |  |  | course_id | Course ID | text |  |
|  |  |  |  | threads_loaded | Threads loaded | number | {0,200} |
| discussion_thread_create | Create Discussion Thread |  |  | title_len | Title length | number | {3,140} |
|  |  |  |  | body_len | Body length | number | {1,5000} |
| discussion_reply_create | Create Discussion Reply |  |  | reply_len | Reply length | number | {1,2000} |
|  |  |  |  | mentions | @mention count | number | {0,10} |
| discussion_upvote | Discussion Upvote |  |  | target_type | Target type | text | thread,reply |
| discussion_mark_answer | Mark as Answer |  |  | reply_id | Reply ID | text |  |
| certificate_request | Certificate Request |  |  | course_id | Course ID | text |  |
|  |  |  |  | expected_wait_min | Expected wait min | number | {1,120} |
| certificate_ready | Certificate Ready |  |  | certificate_id | Certificate ID | text |  |
|  |  |  |  | shareable | Shareable | bool |  |
| certificate_share | Certificate Share |  |  | channel | Channel | text | LinkedIn,WeChat,Twitter,CopyLink |
| study_reminder_set | Study Reminder Set |  |  | hour_local | Local hour | number | {0,23} |
|  |  |  |  | repeat | Repeat | text | daily,weekdays,custom |
| notification_received | Notification Received |  |  | type | Type | text | lesson_continue,quiz_due,live_start,marketing,system |
|  |  |  |  | silent | Silent | bool |  |
| notification_open | Notification Click |  |  | type | Type | text | lesson_continue,quiz_due,live_start,marketing,system |
|  |  |  |  | target | Target | text | course,lesson,quiz,live,settings,home |
| calendar_sync_enable | Calendar Sync Enable |  |  | provider | Provider | text | AppleCalendar,GoogleCalendar,Other |
| download_start | Offline Download Start |  |  | lesson_id | Lesson ID | text |  |
|  |  |  |  | est_size_mb | Estimated size MB | number | {1,20000} |
| download_complete | Offline Download Complete |  |  | size_mb | Actual size MB | number | {1,20000} |
|  |  |  |  | checksum_ok | Checksum passed | bool |  |
| offline_mode_enter | Enter Offline Mode |  |  | pending_sync_items | Pending sync items | number | {0,5000} |
| offline_mode_exit | Exit Offline Mode |  |  | synced_items | Synced items | number | {0,5000} |
| settings_open | Open Settings |  |  | tab | Tab | text | general,privacy,notification,download,about |
| profile_view | Profile View |  |  | role | Role | text | student,instructor |
|  |  |  |  | streak_days | Consecutive study days | number | {0,365} |
| learning_goal_update | Learning Goal Update |  |  | goal | Goal | text | exam,career_upskill,hobby,school_support |
|  |  |  |  | time_per_day_min | Daily time min | number | {10,180} |
| proctoring_session_start | Proctoring Session Start |  |  | exam_id | Exam ID | text |  |
|  |  |  |  | camera | Camera enabled | bool |  |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| proctoring_flag_event | Proctoring Anomaly Event |  |  | flag_type | Anomaly type | text | multiple_faces,tab_switch,noise,absence,lighting |
|  |  |  |  | severity | Severity | text | low,medium,high |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| proctoring_session_end | Proctoring Session End |  |  | total_flags | Anomaly count | number | {0,50} |
|  |  |  |  | verdict | Verdict | text | pass,review,fail |
|  |  |  |  | attempt_id | Quiz attempt ID | text |  |
|  |  |  |  | proctoring | Proctored | bool |  |
| error_occurred | Error Occurred |  |  | error_type | Error type | text | rate_limit,timeout,internal,validation |
|  |  |  |  | error_code | Error code | text | 429,408,500,400 |
|  |  |  |  | retry_after_sec | Suggested retry sec | number | {0,120} |
| rate_limit_hit | Rate Limit Hit |  |  | limit_type | Limit type | text | rpm,rps,tpm,tokens |
|  |  |  |  | limit_value | Limit value | number | {1,200000} |
|  |  |  |  | scope | Scope | text | user,org,api_key |
| network_change | Network Change |  |  | from | Original network | text | WiFi,4G,5G,Ethernet |
|  |  |  |  | to | New network | text | WiFi,4G,5G,Ethernet |
|  |  |  |  | rtt_ms | Round-trip latency ms | number | {5,500} |
|  |  |  |  | loss_rate | Packet loss rate | number | [0,1] |
| funnel_activation_register | Activation Funnel - Register |  |  | method | Method | text | Phone,Email,OAuth |
| funnel_activation_goal_set | Activation Funnel - Goal Set |  |  | goal | Goal | text | exam,career_upskill,hobby,school_support |
| funnel_activation_first_enroll | Activation Funnel - First Enrollment |  |  | course_id | Course ID | text |  |
| funnel_activation_first_lesson | Activation Funnel - First Lesson |  |  | lesson_id | Lesson ID | text |  |
| funnel_activation_d2_return | Activation Funnel - Day 2 Return |  |  | returned | Returned | bool |  |
| funnel_enroll_checkout | Enrollment Funnel - Checkout |  |  | items_count | Items count | number | {1,10} |
| funnel_enroll_payment | Enrollment Funnel - Payment |  |  | amount_usd | Amount USD | number | [0.01,9999.99] |
| funnel_learning_first_completion | Learning Funnel - First Completion |  |  | lesson_id | Lesson ID | text |  |
| funnel_quiz_pass | Quiz Funnel - Pass |  |  | quiz_id | Quiz ID | text |  |
| funnel_subscribe_conversion | Subscription Funnel - Conversion |  |  | plan | Plan | text | Monthly,Annual |


## #Common Event Properties

| Property Name (required) | Property Display Name | Property Type (required) | Property Description |
| --- | --- | --- | --- |


## #User Data

| Property Name (required) | Property Display Name | Property Type (required) | Update Method | Property Description |
| --- | --- | --- | --- | --- |
| register_time | Registration time | time | user_setOnce |  |
| first_enroll_time | First enrollment time | time | user_setOnce |  |
| first_lesson_time | First lesson time | time | user_setOnce |  |
| last_active_time | Last active time | time | user_set |  |
| courses_enrolled | Enrolled courses count | number | user_set |  |
| courses_in_progress | In-progress courses count | number | user_set |  |
| total_study_minutes | Total study minutes | number | user_set |  |
| avg_quiz_score | Average quiz score | number | user_set |  |
| quizzes_passed | Quizzes passed | number | user_set |  |
| assignments_submitted | Assignments submitted | number | user_set |  |
| certificates_earned | Certificates earned | number | user_set |  |
| live_classes_attended | Live classes attended | number | user_set |  |
| discussion_posts | Discussion threads count | number | user_set |  |
| discussion_replies | Discussion replies count | number | user_set |  |
| ai_tutor_queries | AI tutor query count | number | user_set |  |
| ai_flashcards_generated | AI flashcards count | number | user_set |  |
| coding_runs | Code run count | number | user_set |  |
| subscription_status | Subscription status | text | user_set |  |
