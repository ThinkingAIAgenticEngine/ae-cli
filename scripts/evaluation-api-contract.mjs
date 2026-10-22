/** Extract method/path/operation IDs from the platform's block-path OpenAPI layout. */
export function evaluationOperations(source) {
  const operations = [];
  let path;
  let method;
  for (const line of source.split(/\r?\n/)) {
    if (line === 'components:') break;
    const pathMatch = line.match(/^  (\/.+):\s*$/);
    if (pathMatch) { path = pathMatch[1]; method = undefined; }
    const methodMatch = line.match(/^    (get|post|put|patch|delete):/);
    if (methodMatch) method = methodMatch[1].toUpperCase();
    const operationMatch = line.match(/\boperationId:\s*(\w+)/);
    if (operationMatch) {
      if (!path || !method) throw new Error('OpenAPI operation has no method/path');
      operations.push({ method, path, operation_id: operationMatch[1] });
    }
  }
  if (!operations.length) throw new Error('OpenAPI contains no operations');
  return operations.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

export function normalizedOperation(method, path) {
  return `${method.toUpperCase()} ${path.replace(/\{[^}]+\}/g, '{}')}`;
}
