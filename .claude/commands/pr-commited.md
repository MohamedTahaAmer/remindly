# /pr-commited — Push existing commits and create PR against staging

Run this workflow. Commits are already made on the current branch — just push and create a PR.

1. **Validate branch**
   Run `git branch --show-current`. If the branch is `staging` or `main`, stop and tell the user to switch to a feature branch first.

2. **Fetch latest staging**
   Run `git fetch origin staging` to ensure we have the latest remote staging.

3. **Show commits that will be in the PR**
   Run `git log origin/staging..HEAD --oneline` to list all commits ahead of staging.
   If there are **no commits** ahead of staging, stop and tell the user there's nothing to PR.

4. **Push the branch**
   Run `git push -u origin <branch-name>`. If it already tracks a remote, use `git push`.

5. **Create the PR**
   Use `gh pr create --base staging` with:
   - **Title**: derive from the branch name — convert `type/description-here` to a readable title (e.g. `fix/generated-images-miss-position` → `fix: generated images miss position`). Keep it under 70 characters.
   - **Body**: use this format (pass via HEREDOC for correct formatting):

     ```
     ## Summary
     <2-4 bullet points summarizing the changes based on the commit messages and diffs>

     ## Commits
     <paste the output of `git log origin/staging..HEAD --oneline`>
     ```

     If a PR already exists for this branch, tell the user and skip creation.

Do the steps in order. Do not create new commits or modify existing ones. Do not rebase or merge. Just push what's there and open the PR.
