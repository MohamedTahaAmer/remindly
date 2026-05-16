# /update-pr — Push commits and refresh PR description

Run this workflow. Your responsibility is to **confirm there is an open PR for the current branch**, **push any local commits**, then **update the PR description** so it reflects the current state of the branch.

## 1. Check current branch and open PR

- Run `git branch --show-current` to get the current branch name.
- Run `gh pr view` (from the repo root). If no PR is found for this branch, **stop** and tell the user there is no open PR for the current branch; they can create one with `gh pr create`.
- If a PR exists, note its number and URL from the output.

## 2. Push commits

- Run `git status` to see if there are unpushed commits.
- If the branch is ahead of its upstream, run `git push` (or `git push -u origin <branch>` if the branch has no upstream yet).
- If push fails (e.g. conflicts, permission), report the error and stop.

## 3. Gather branch state for the description

- Run `git log main..HEAD --oneline` (or `git log origin/main..HEAD --oneline` if needed) to list commits on this branch that are not on main.
- Run `git diff main...HEAD --stat` (or `origin/main...HEAD`) to list files changed in this PR.
- Use this to build an accurate **Summary** (what the PR does) and **Commits** list for the description.

## 4. Update the PR description

- Build a PR body that includes:
  - **Summary**: Bullet points covering the main changes (features, fixes, refactors, docs, etc.) in clear, concise language. Match the actual commits and file changes.
  - **Commits (this branch)**: Numbered list of commit subjects (one line each) from the branch, in order from oldest to newest.
- Update the PR using the number from step 1: run `gh pr edit <number> --body "..."` with the full description (escape any quotes inside the body), or write the body to a temporary file and run `gh pr edit <number> --body-file /tmp/pr-body.md`.
- Confirm success and output the PR URL to the user.

If at any step the branch has no open PR, push fails, or `gh` is not available, report clearly and stop.
