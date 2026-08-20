# local-data fixtures

Regression anchors ported from `ae-file-data-import/scripts/test_data`. These files are
inputs for the `data-integration inspect/convert` pipeline and are read-only in tests.

The Chinese column headers, record values, and time formats (`姓名`, `张三`, `上海`,
`2024年1月16日 16:00:00`, `是`/`否`) are **real business data**. The English-only rule for
CLI source and output does not apply to them — they must be preserved verbatim to exercise
encoding detection, value mapping, and Chinese time-format parsing.

| File | Exercises |
| --- | --- |
| `01_normal_ecommerce.csv` | Mixed time formats (epoch, slash, compact, English month, Chinese), JSON-as-string, Chinese city values |
| `02_no_header.csv` | Headerless input via `--headers` |
| `03_chinese_headers.csv` | Chinese headers |
| `04_illegal_headers.csv` | Header sanitization |
| `05_mixed_types.json.csv` | JSON string / empty-column handling |
| `06_quoted_whitespace.csv` | Quoted CSV whitespace |
| `07_gbk_encoding.csv` | GBK/GB2312 encoding detection |
| `08_id_column_downgrade.csv` | ID-like columns that must not be treated as identity |
| `09_time_formats.csv` | Epoch seconds/millis, ISO, slash, compact time formats |
| `10_array_object_data.csv` | Array/object cell data |
| `11_edge_cases.csv` | Missing / N/A / boolean-ish / decimal values |
| `12_boolean_variants.csv` | Boolean literals (`true`, `FALSE`, `yes`, `1`, `是`, …) |
| `13_multi_sheet.xlsx` | Multi-sheet Excel |
| `14_large_50k.csv` | Large file (50k rows) |
| `15_tsv_data.tsv` | TSV |
| `16_txt_csv_content.txt` | CSV content in a `.txt` (sniffing) |
| `17_ndjson_basic.ndjson` | Basic NDJSON |
| `18_ndjson_sparse.ndjson` | Sparse NDJSON columns |
| `19_ndjson_nested.ndjson` | Nested NDJSON (`flatten_rules`) |
| `20_txt_ndjson_content.txt` | NDJSON content in a `.txt` (sniffing) |
| `21_ndjson_deep_nested.ndjson` | Deeply nested NDJSON |
| `22_ndjson_object_array.ndjson` | Object-array NDJSON |
| `23_ndjson_type_conflict.ndjson` | Cross-row type conflicts (number vs string vs boolean) |
| `24_csv_deep_nested.csv` | Multi-level nested JSON in a CSV cell (`flatten_rules` with `<column>.<deep path>`) |
