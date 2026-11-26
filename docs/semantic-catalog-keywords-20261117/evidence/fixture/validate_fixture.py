"""Independent structure/source checks; does not evaluate retrieval outcomes."""
import ast
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
workspace = root.parents[2]
source = workspace / 'docs/business-semantics/cli-consumption-20261116'
load = lambda path: json.loads(path.read_text())
rows = load(root / 'rows.json')
queries = load(root / 'queries.json')
gold = load(root / 'gold.json')
freeze = load(root / 'freeze.json')
state = load(source / 'fixture-lifecycle/state-final.json')
catalog = {r['id']: r for r in load(source / 'scale-fixture/catalog.json')['data']['items']}
assert len(rows) == 60 == len({row['id'] for row in rows})
assert len(queries) == 16 and all(set(q) == {'id', 'question'} for q in queries)
assert [g['id'] for g in gold] == [q['id'] for q in queries]
assert sum(not g['required_candidate_ids'] for g in gold) == 2
assert hashlib.sha256((root / 'gold.json').read_bytes()).hexdigest() == freeze['gold_sha256']
ids = {row['id'] for row in rows}
for g in gold:
    for field in ['required_candidate_ids', 'acceptable_extra_candidate_ids', 'required_dependency_ids']:
        assert set(g[field]) <= ids
    assert not (set(g['required_candidate_ids']) & set(g['acceptable_extra_candidate_ids']))
for row in rows:
    original = state.get(row['id']) or catalog[row['id']]
    for field in ['title', 'summary', 'keywords']:
        assert row[field] == original.get(field, [])
    if row['id'] in state:
        assert row['content'] == original['content']
    else:
        assert row['content'] == '星岛餐厅。' + original['summary']
    assert set(row['dependency_ids']) <= ids
    assert 2 <= len(row['improved_keywords']) <= 5
    for field in ['keywords', 'improved_keywords']:
        for keyword in row[field]:
            assert keyword in row['content'] or any(
                keyword in s.get('excerpt', '') or keyword in s.get('original_keywords', [])
                for s in row['sources'])
for arm in 'ABCD':
    entries = load(root / f'catalog-{arm}.json')
    assert [entry['id'] for entry in entries] == [row['id'] for row in rows]
    fields = ['title', 'summary'] + (['keywords'] if arm in 'BD' else [])
    prefix = 'improved_' if arm in 'CD' else ''
    for entry, row in zip(entries, rows):
        assert set(entry) == {'id'} | set(fields)
        for field in fields:
            assert entry[field] == row[prefix + field]
assert load(root / 'bodies.json') == [
    {key: row[key] for key in ['id', 'content', 'dependency_ids']} for row in rows]
for filename in ['build_fixture.py', 'validate_fixture.py']:
    ast.parse((root / filename).read_text())
for filename in root.iterdir():
    if filename.is_file():
        assert not any(line.rstrip() != line for line in filename.read_text().splitlines()), filename
result = {
    'status': 'passed', 'row_count': len(rows), 'query_count': len(queries),
    'baseline_keyword_rows': sum(bool(row['keywords']) for row in rows),
    'improved_keyword_rows': sum(bool(row['improved_keywords']) for row in rows),
    'gold_sha256': freeze['gold_sha256'],
    'checks': ['unique IDs', 'question-only schema', 'gold references and SHA-256',
               'baseline metadata exact equality to source', 'body exact equality to source',
               'all old and revised keywords supported by content or sources',
               'revised keyword count 2..5', 'four-arm field and order equality',
               'body projection equality', 'Python AST', 'trailing whitespace'],
    'scope': 'Fixture integrity only; no retrieval result or model-token measurement.',
}
(root / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
