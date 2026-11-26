# About Agentic Engine

When the user chooses **Learn about AE**, use the introduction in the display language and include the official links for their market from [Product resources](#product-resources).

In a local agent, finish the pre-registration introduction with **Create an AE account** as the next choice. Open registration only after the user chooses it. After login return to the experience choice. After an experiment keep the same session and return to the report's follow-up choices.

## Web onboarding

Use the introduction in the conversation language. Use `product_resource_market` from the latest Web onboarding `run` or `--dry-run` result to select the [product website and contact page](#product-resources). Show only those two resources as clickable text links with the localized labels below. Omit the links when the field is absent or `null`. Before the Demo, return to the same Web opening picker. After a verified experiment, return to the same [report follow-up choices](demo-operations.md#choose-the-next-step).

## Product resources

In a local agent, use the market confirmed for the signed-in account's AE host. Before sign-in, use the confirmed registration market. Take all links from that one row, including the manual and case studies. For example, a Chinese conversation in the United States market uses Chinese link labels and the United States URLs. When the market is unknown, show the introduction and add the links once the market is confirmed. For Web, follow the [Web market rule](#web-onboarding).

| Market | Product website | Contact us | Cases or reading | Manual |
| --- | --- | --- | --- | --- |
| China (`cn`) | https://www.thinkingai.cn/ | https://www.thinkingai.cn/request-demo/ | [Enterprise AI Agent use cases](https://www.thinkingai.cn/blog/enterprise-ai-agent-14-use-cases-casebook/) | [ThinkingAI documentation](https://docs.thinkingai.cn/6.1/zh/) |
| United States (`us`) | https://www.thinkingai.io/en/ | https://www.thinkingai.io/en/contact-sales/ | [Agentic Engine white paper](https://thinkingai.io/en/ebooks/agentic-engine-white-paper/) | [ThinkingAI documentation](https://docs.thinkingai.io/en/) |
| Japan (`jp`) | https://www.thinkingai.io/jp/ | https://www.thinkingai.io/jp/request-demo/ | — | — |
| South Korea (`kr`) | https://www.thinkingai.io/kr/ | https://www.thinkingai.io/kr/request-demo/ | — | — |

Show the available links as text links. After the verified local report, use the same row's website for **Learn about AE** and contact page for **Contact us**. In a local agent, show the product video when the host supplies a verified playable asset for that market.

## Localized labels

Use the label for the customer's conversation language. The market determines the link destinations.

| Action | 中文 | English | 日本語 | 한국어 |
| --- | --- | --- | --- | --- |
| Register | 创建 AE 账号 | Create an AE account | AE アカウントを作成 | AE 계정 만들기 |
| Learn | 先了解 ThinkingAI | See what ThinkingAI can do | ThinkingAI について | ThinkingAI 알아보기 |
| Connect data | 接入数据 | Connect my data | データを接続 | 데이터 연결 |
| Continue Demo | 继续体验Demo | Continue the demo | デモを続ける | 데모 계속하기 |
| Change Demo | 换个 Demo 继续 | Try another demo | 別のデモを試す | 다른 데모 체험하기 |
| Finish Demo | 完成体验 | Finish the demo | デモを終了 | 체험 완료 |
| End experience | 体验结束 | End the experience | 体験を終了 | 체험 종료 |

## 中文

**Agentic Engine（AE）**是 ThinkingAI 为产品、运营和数据团队打造的 AI Agent 平台。接入业务数据、团队知识库和运营工具后，你可以在当前 AI 工具里提问。分析 Agent 按团队的指标口径查数，运营 Agent 可以找出值得跟进的用户，并为他们准备合适的消息。

比如，新注册用户第二天很少回来。你可以用 AE 比较各渠道的留存，查看用户集中在哪一步退出新手引导，并通过原始报表核对结果。你还能用 A/B 实验比较两版引导，看看哪一版让更多用户留下来。

产品官网 · 联系我们

## English

**Agentic Engine (AE)** is ThinkingAI’s AI agent platform for product, growth, and data teams. Connect your business data, team knowledge, and engagement tools, then ask questions in your current AI tool. An analysis agent uses your team's metric definitions, and an engagement agent can identify users worth following up with and prepare messages for them.

If few new users return the next day, you can use AE to compare retention across channels, find where users drop out of onboarding, and check the underlying reports. An A/B test can then compare two onboarding flows to see which one keeps more users.

Product website · Contact us

## 日本語

**Agentic Engine（AE）**は、ThinkingAI がプロダクト、グロース、データチーム向けに提供する AI エージェントプラットフォームです。業務データ、チームのナレッジ、エンゲージメントツールを接続すると、普段使っている AI ツールから質問できます。分析エージェントはチームの指標定義に沿ってデータを調べ、エンゲージメントエージェントはフォローすべきユーザーを見つけてメッセージを準備します。

たとえば、新規登録ユーザーが翌日にほとんど戻ってこない場合、チャネル別の継続率を比較し、オンボーディングのどこでユーザーが離脱したかを調べ、元のレポートで確認できます。さらに A/B テストで二つのオンボーディングを比較し、どちらがより多くのユーザーの継続につながるかを検証できます。

製品サイト · お問い合わせ

## 한국어

**Agentic Engine(AE)**은 ThinkingAI가 제품, 성장, 데이터 팀을 위해 만든 AI 에이전트 플랫폼입니다. 비즈니스 데이터, 팀 지식, 운영 도구를 연결하면 현재 사용하는 AI 도구에서 질문할 수 있습니다. 분석 에이전트는 팀의 지표 정의에 따라 데이터를 분석하고, 운영 에이전트는 후속 대응이 필요한 사용자를 찾아 메시지를 준비합니다.

예를 들어 신규 가입 사용자가 다음 날 거의 돌아오지 않는다면, 채널별 리텐션을 비교하고 온보딩에서 사용자가 주로 이탈하는 단계를 찾아 원본 보고서로 확인할 수 있습니다. 두 온보딩 흐름을 A/B 테스트로 비교해 어느 쪽에서 더 많은 사용자가 계속 이용하는지도 확인할 수 있습니다.

제품 웹사이트 · 문의하기
