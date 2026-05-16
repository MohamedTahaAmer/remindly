# /git-remove-from-cache — Remove a file from git tracking while keeping it on disk

Takes a file path argument: `$ARGUMENTS`

## Workflow

1. Verify the file exists on disk at the given path.
2. Run `git rm --cached <path>` to remove it from the git index (the file stays on your filesystem).
3. Run `git status` to confirm the file now shows as untracked / deleted from index.
4. Tell the user the result and remind them to commit the change.
