import { OfficeError } from '../db/error.ts';

type Body = Record<string, unknown>;
type Rule = (value: unknown) => boolean;
const nonEmpty: Rule = (value) => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
export const text: Rule = (value) => typeof value === 'string' && !value.includes('\0');
export const oneOf = (...values: string[]): Rule => (value) => typeof value === 'string' && values.includes(value);
const settings = {
  provider: oneOf('claude', 'codex', 'agy', 'demo'),
  model: text,
  effort: oneOf('low', 'medium', 'high', 'xhigh'),
  workspacePath: nonEmpty,
};
export const agentFields = {
  displayName: nonEmpty,
  role: oneOf('president', 'dept_manager', 'employee'),
  teamId: nonEmpty,
  avatarColor: (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value),
  ...settings,
};
export const taskFields = {
  title: nonEmpty, prompt: nonEmpty, agentId: nonEmpty, kind: oneOf('task', 'consultation', 'proposal'), ...settings,
};

export async function readJsonBody<T>(request: Request, fields: Record<string, Rule>, required: string[] = [], optional = false) {
  const raw = await request.text();
  let parsed: unknown;
  try {
    parsed = optional && raw.trim() === '' ? {} : JSON.parse(raw);
  } catch {
    throw new OfficeError(400, 'Invalid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new OfficeError(400, 'Expected a JSON object');
  }
  const input = parsed as Body;
  for (const name of required) {
    if (!Object.hasOwn(input, name)) throw new OfficeError(400, 'Missing field: ' + name);
  }
  for (const [name, value] of Object.entries(input)) {
    if (!Object.hasOwn(fields, name) || !fields[name]!(value)) {
      throw new OfficeError(400, 'Invalid field: ' + name);
    }
  }
  return input as T;
}
