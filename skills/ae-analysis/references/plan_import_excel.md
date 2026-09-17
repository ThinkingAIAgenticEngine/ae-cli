# tracking plan import-excel

Use only when the user asks to import a tracking plan Excel file that was uploaded as an input file.

Command:

```bash
ae-cli tracking plan import-excel --project-id <project_id>
```

Capability id: `tracking.plan.import_excel`

Input sends `project_id`, `input_file_id`, and optional `lang`. Do not send camelCase aliases.

Output is the capability gateway envelope: success is `ok=true,data,meta`; failure is `ok=false,error`.

Parameters:

| Parameter | Description | Required |
| --- | --- | --- |
| `--project-id` | Numeric project ID. | Yes |
| `--input-file-id` | Existing input_file_id returned by `analysis input-file upload --purpose track.program.xlsx`. | Yes |
| `--lang` | Excel language: zh, en, ja, ko, zh_CN, en_US, ja_JP, or ko_KR. | No |

