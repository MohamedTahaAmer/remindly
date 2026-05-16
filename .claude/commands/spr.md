# /spr — Create Stacked PR ("Chained" PRs)

Use this workflow when you need to build Feature B on top of Feature A, but Feature A is still in code review.

## The Strategy: "Branch Off, then Rebase"

The goal is to keep your new work in a separate PR that "points" to the first one, then clean up the history once the first PR is merged.

---

## Steps

### 1. **Create your new branch**

If you've already started coding on top of Feature A, make sure you branch off `feature-A`, not `staging`.

```bash
git checkout feature-A
git checkout -b feature-B
```

### 2. **Develop Feature B**

Code normally on your `feature-B` branch. Make logical commits as you go.

### 3. **Open a "Chained" Pull Request**

When you open the PR for `feature-B`, **change the base branch to `feature-A`** instead of `staging`.

**Default (wrong):** `staging ← feature-B` (This will show all changes from A AND B).

**Correct way:** `feature-A ← feature-B`.

**Why this works:** The PR for Feature B will only show the diff of your new work. Reviewers see only what you changed, not the underlying Feature A changes.

### 4. **Keep Both PRs in Sync (Optional)**

If Feature A gets new commits or feedback changes, you can keep Feature B in sync:

```bash
git checkout feature-B
git fetch origin
git rebase origin/feature-A
```

Resolve any conflicts if they arise, then force-push Feature B if needed:

```bash
git push origin feature-B --force
```

### 5. **Once Feature A is Merged — The Cleanup**

Once `feature-A` is approved and merged into `staging`, your `feature-B` branch is technically still "pointing" to a branch that's no longer separate. You need to move it to `staging`.

#### Step 5a: Update your local staging

```bash
git checkout staging
git pull origin staging
```

#### Step 5b: Rebase Feature B onto staging

```bash
git checkout feature-B
git rebase staging
```

If there are conflicts, Git will ask you to resolve them now:

1. **Fix each conflicted file** (search for `<<<<<<<`, `=======`, `>>>>>>>`).
2. **Stage the resolved files:**
   ```bash
   git add <resolved-files>
   ```
3. **Continue the rebase:**
   ```bash
   git rebase --continue
   ```

#### Step 5c: Update the PR base branch

In GitHub/GitLab, change the base branch of your Feature B PR from `feature-A` to `staging`.

Since you rebased, the history will be clean, and only the Feature B changes will remain in the PR.

#### Step 5d: Force-push to update the PR

```bash
git push origin feature-B --force
```

---

## Pro-Tips for "Stacked" PRs

- **Label them:** Title your second PR something like `[STACKED] Feature B` or mention the dependency clearly.

- **Mention the dependency:** In the description of PR B, write:

  ```
  Note: This depends on PR #123. Do not merge until #123 is closed.
  ```

- **Atomic commits:** Keep your commits clean. If you need to fix a bug in Feature A while working on Feature B:
  1. Go back to `feature-A` branch.
  2. Make the fix and commit it.
  3. Push to `feature-A`.
  4. Return to `feature-B` and rebase or merge from `feature-A` to keep in sync.

- **Multiple levels:** You can stack more than two PRs. Just follow the same pattern: `feature-C` branches off `feature-B`, which branches off `feature-A`. The cleanup order is the same: bottom-up.

- **Abort if needed:** If a rebase goes wrong and you want to start over:
  ```bash
  git rebase --abort
  ```

---

## Quick Reference

| Step                                      | Command                                                 |
| ----------------------------------------- | ------------------------------------------------------- |
| Create new branch off Feature A           | `git checkout feature-A && git checkout -b feature-B`   |
| Open PR with correct base                 | Set base to `feature-A` in GitHub                       |
| Keep in sync with Feature A               | `git checkout feature-B && git rebase origin/feature-A` |
| After Feature A merges – fetch staging    | `git checkout staging && git pull origin staging`       |
| After Feature A merges – rebase Feature B | `git checkout feature-B && git rebase staging`          |
| Update PR base back to staging            | Change base branch in GitHub                            |
| Force-push rebased Feature B              | `git push origin feature-B --force`                     |
