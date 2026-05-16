# /explain-pr — Explain changes since staging branch

Explain all changes in the working tree compared to the **staging** branch. **Do not ask for or expect any files** — use git to see what's changed.

1. **Get the full picture**
   - Run `git status` to see staged, unstaged, and untracked files.
   - Run `git diff staging` (or `git diff origin/staging` if you need the remote ref) to see all differences (staged + unstaged) since the staging branch.
   - If there are untracked files, note them and summarize what they add.

2. **Explain the changes**
   - Group by area (e.g. by feature, config, tests, docs).
   - For each changed file (or logical group):
     - Say what was added, removed, or modified and why it matters.
     - Call out any breaking changes, new dependencies, or config/env impact.
   - Keep the explanation clear and scannable (short paragraphs or bullets).

3. **PR-style summary**
   - End with a short "PR summary": what this work does from staging's perspective, and any notes for reviewers (e.g. "focus on X", "deploy/config change in Y").

Do not make any changes; only read git state and explain.
