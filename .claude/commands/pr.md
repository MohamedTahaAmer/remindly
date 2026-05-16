# /pr — Create PR with split commits

Run this workflow. **Do not ask for or expect any files** — use `git status` and `git diff` to see what's changed.

1. **Switch to `staging`**  
   Check out the `staging` branch.

2. **Pull latest**  
   Run `git pull` (or `git pull origin staging`) to get the latest from remote.

3. **Resolve merge conflicts**  
   If there are merge conflicts:
   - List conflicted files.
   - Resolve each conflict (choose correct side or merge edits).
   - Stage resolved files and complete the merge (e.g. `git add` then `git merge --continue` or `git commit` as appropriate).

4. **Create a new branch**  
   Create and check out a new branch for the current work (e.g. `git checkout -b type/short-description`). Use a name that matches the change (e.g. `feat/add-thing`, `chore/update-deps`, `fix/login-redirect`).

5. **Split changes into logical groups and commit each**  
   Run `git status` and `git diff --name-only` (and `git diff --name-only --cached` if needed) to see all changed files.  
   **Group changes logically** (e.g. by area or change type), then create **one commit per group**:
   - **Grouping options** (use what fits best):
     - By **directory/app**: e.g. all `apps/backend/` together, all `apps/web/` together, all `docs/` together, root/config files together.
     - By **change type**: e.g. test/config in one commit, feature code in another, docs in another.
     - By **feature/fix**: if changes clearly belong to distinct features or fixes, split that way.
   - For **each group**:
     1. Stage only the files in that group: `git add <paths>`.
     2. Propose a commit message for that group (see message style below).
     3. Run `git commit -m "..."` (or confirm with the user and then commit).
   - If the user had **only staged files** and no clear grouping, you may make a single commit with those; otherwise prefer at least one sensible split (e.g. backend vs frontend vs config).

   **If there are both staged and unstaged files**: list unstaged paths and ask the user to stage what they want in each commit, or to run `git add -A` and then you split into commits by grouping. Do not stage everything into one commit unless that's the only logical group.

6. **Commit message style** (per commit)  
   Use this repo's style:
   - **Conventional types**: `feat:`, `fix:`, `chore:`, `test:`, `perf:`, `docs:` etc.
   - **Lowercase** after the type; short, clear description.
   - **Include an icon in the subject** (after the type, before the description):
     - `feat:` → `:sparkles:` or `:fire:`
     - `fix:` → `:bug:`
     - `chore:` → `:rotating_light:` (lint/config) or `:sparkles:` (tooling)
     - `test:` → `:test_tube:` or `:sparkles:`
     - `perf:` → `:sparkles:`
     - `docs:` → pick an appropriate icon if needed
   - **Body**: optional second line with more detail.
   - **Optional PR reference** at the end when relevant, e.g. `(#99)`.
   - Examples:
     - `feat: :sparkles: Add db level logs for drizzle queries (#97)`
     - `chore: :rotating_light: Update eslint config of minvo-templates, and fix linting errors (#94)`
     - `test: :test_tube: Update vitest config and test setup to run Integration test in parallel (#81)`
     - `fix: :bug: Specify the test container db version to match the version of the prod db (#70)`

7. **Push the branch**  
   Run `git push -u origin <branch-name>` (using the branch created in step 4). If the branch already exists on remote, use `git push`.

8. **Create the PR**  
   Open a pull request against `staging`:
   - If **GitHub CLI** (`gh`) is available: run `gh pr create --base staging` (optionally add `--title "..."` and `--body "..."`).
   - Otherwise: output the PR URL (e.g. `https://github.com/<org>/<repo>/compare/staging...<branch-name>`) and tell the user to open it in the browser to create the PR.

Do the steps in order. If anything is ambiguous (e.g. new branch name, grouping, or conflict resolution), ask before proceeding. **Always complete steps 7 and 8** so the branch is pushed and the PR is created (or the user has the link to create it).
