import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The agents' write guard (.claude/hooks/write-only-under.sh): exit 2 blocks the tool call.
const root = join(import.meta.dirname, '..');
const guard = join(root, '.claude', 'hooks', 'write-only-under.sh');
const run = (input: object, ...args: string[]) =>
  spawnSync(guard, ['.claude/improve', ...args], {
    input: JSON.stringify(input),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  }).status;
const write = (file_path: string) => run({ tool_name: 'Write', tool_input: { file_path } });
const bash = (command: string) =>
  run({ tool_name: 'Bash', tool_input: { command } }, '--bash-read-only');

describe('write guard', () => {
  it('lets writes in its folder through', () => {
    expect(write('.claude/improve/LOG.md')).toBe(0);
    expect(write(join(root, '.claude/improve/PROPOSALS.md'))).toBe(0);
  });

  it('blocks writes anywhere else, including escapes and look-alike folders', () => {
    expect(write('.claude/CLAUDE.md')).toBe(2);
    expect(write('.claude/improve/../settings.json')).toBe(2);
    expect(write('.claude/improve-evil/x.md')).toBe(2);
    expect(write('/etc/passwd')).toBe(2);
    expect(run({ tool_name: 'Edit', tool_input: {} })).toBe(2);
  });

  it('allows only read-only Bash when asked to', () => {
    expect(bash('git log --oneline -20')).toBe(0);
    expect(bash('git show HEAD --stat | head -40')).toBe(0);
    expect(bash('graphify query "where is the log"')).toBe(0);
    expect(bash('git commit -m x')).toBe(2);
    expect(bash('git log > .claude/CLAUDE.md')).toBe(2);
    expect(bash('cat a; rm -rf b')).toBe(2);
    expect(bash('echo $(id)')).toBe(2);
    expect(bash('sed -i s/a/b/ x')).toBe(2);
    expect(bash('graphify update .')).toBe(2);
  });

  it('closes the known bypasses of read-only Bash', () => {
    expect(bash('git log --output=x.md')).toBe(2);
    expect(bash('git diff --ext-diff')).toBe(2);
    expect(bash('git log\nrm -rf x')).toBe(2);
    expect(bash('cat <(touch x)')).toBe(2);
    expect(bash('cat $HOME/.ssh/id_rsa')).toBe(2);
    expect(bash('sort -o x.md y')).toBe(2);
    expect(bash('uniq a b')).toBe(2);
    expect(bash('')).toBe(2);
  });

  it('fails closed when it cannot read the call', () => {
    expect(run({ tool_input: { file_path: '.claude/CLAUDE.md' } })).toBe(2);
    expect(
      spawnSync(guard, ['.claude/improve'], {
        input: 'not json',
        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
      }).status,
    ).toBe(2);
  });

  it('leaves Bash alone without the flag, and other tools alone', () => {
    expect(run({ tool_name: 'Bash', tool_input: { command: 'npm test' } })).toBe(0);
    expect(run({ tool_name: 'Read', tool_input: { file_path: '/etc/hosts' } })).toBe(0);
  });
});
