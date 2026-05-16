# /explain — Explain changes since last commit

Explain all changes in the working tree compared to the **last commit** (HEAD). **Do not ask for or expect any files** — use git to see what's changed.

1. **Get the full picture**
   - Run `git status` to see staged, unstaged, and untracked files.
   - Run `git diff HEAD` to see all differences (staged + unstaged) since the last commit.
   - If there are untracked files, note them and summarize what they add.

2. **Explain the changes**
   - Group by area (e.g. by feature, config, tests, docs).
   - For each changed file (or logical group):
     - Say what was added, removed, or modified and why it matters.
     - Call out any breaking changes, new dependencies, or config/env impact.
   - Keep the explanation clear and scannable (short paragraphs or bullets).

3. **Optional summary**
   - End with a one- or two-line summary of "what this branch is doing" relative to the last commit.

Do not make any changes; only read git state and explain.
