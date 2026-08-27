# Experiment SDK Documentation Index

Read this reference before giving exact experiment-SDK versions, dependencies, packages, imports, or API calls.

## Source policy

- Bundled references contain a concise extract for common questions.
- The local official Wiki is preferred for exact version-specific APIs when it contains the relevant main page.
- If the Wiki mirror is missing an experiment page, use the verified official source below and label the local mirror gap.
- Recheck document version and update date before generating production code.
- Do not use a page merely because a link label says it is an SDK page; verify its title and content.

## Experiment SDK matrix

Verified from the official Feishu pages on 2026-07-26:

| Platform | Experiment SDK | Analytics dependency | Remote Config dependency | Main source |
|---|---:|---:|---:|---|
| Android | `TDExperiment` 1.0.1 | `TDAnalytics` >= 3.3.6 | `TDRemoteConfig` >= 1.3.0 | `CQ83wzJjui88V1keGtNcKLxgnXb` |
| iOS | `TDExperiment` 1.0.2 | `ThinkingSDK` >= 3.1.6 | `TDRemoteConfig` >= 1.3.1 | `RlYIwkcvXizJeFkhp2acbWGwnFf` |
| JavaScript | experiment package 1.0.0 | `TDAnalytics` >= 2.6.0 | `TDRemoteconfig` >= 1.3.0 | `GlR8w2bFbiJKqUka03pcJEdnndf` |

Official source pages:

- Client SDK overview: `https://thinkingdata.feishu.cn/wiki/MCy3w6eKjihQsmkZWSQcNlrQnie`
- Android experiment SDK: `https://thinkingdata.feishu.cn/wiki/CQ83wzJjui88V1keGtNcKLxgnXb`
- iOS experiment SDK: `https://thinkingdata.feishu.cn/wiki/RlYIwkcvXizJeFkhp2acbWGwnFf`
- JavaScript experiment SDK: `https://thinkingdata.feishu.cn/wiki/GlR8w2bFbiJKqUka03pcJEdnndf`

## Remote Config dependency matrix

| Platform | Remote Config version | Minimum OS | Main source |
|---|---:|---:|---|
| Android | 1.3.0 | Android 4.0 / API 14 | `Lsdmwhhigi9Z3AkKs2fc9tw3nEd` |
| iOS | 1.3.1 | iOS 9.0 | `K85DwZetDidpMPkGHWhccKQGnUf` |
| JavaScript | 1.3.0 | Not stated in the verified page | `Yg3uw8RDii2WEskhz2Qc4zOanwg` |

Official source pages:

- Android Remote Config: `https://thinkingdata.feishu.cn/wiki/Lsdmwhhigi9Z3AkKs2fc9tw3nEd`
- iOS Remote Config: `https://thinkingdata.feishu.cn/wiki/K85DwZetDidpMPkGHWhccKQGnUf`
- JavaScript Remote Config: `https://thinkingdata.feishu.cn/wiki/Yg3uw8RDii2WEskhz2Qc4zOanwg`

## Local Wiki discovery

The runtime mirror is expected under:

```text
~/.ae-cli/wiki/te-docs/
├── index.md
├── synthesis/
└── raw/
```

Before reading a local experiment page:

1. Check whether `index.md` exists.
2. Search the index and `raw/` for `experiment`, `TDExperiment`, `remote config`, `配置中心`, and `实验`.
3. Choose the latest main page, not a historical/versioned copy.
4. Read synthesis for orientation and raw for exact API details.

At the verification date, the local mirror used to build this reference did not contain experiment or Remote Config pages. Do not assume this remains true after a Wiki refresh.

## Known source conflict

The client SDK overview page labels `AvX7wAp0zix522kSy9BcBziMnJd` as the JavaScript Remote Config document, but that token currently resolves to a Data Platform Release Note. The JavaScript experiment page links to `Yg3uw8RDii2WEskhz2Qc4zOanwg`, which resolves to the verified JavaScript Remote Config 1.3.0 document.

Use `Yg3uw8RDii2WEskhz2Qc4zOanwg` until the overview page is corrected. If either page changes, verify the title, SDK version, and API content again.

## JavaScript spelling warning

The verified JavaScript experiment page spells the global object `TDExpriment`. This may be an SDK export name or a documentation typo. Copy it only after checking the downloaded package or a newer verified main document. Do not silently “correct” it to `TDExperiment`, and do not ship the documented spelling without verification.

## Unsupported exact-code cases

The supplied official pages do not establish an exact server-side experiment SDK or server evaluation API. For server or hybrid implementation, follow the architecture references and use pseudocode until `ae-cli` or verified server documentation resolves a concrete API.
