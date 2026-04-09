## Worktree Management
- After completing work in a worktree, always merge to main and clean up
- Run `git worktree prune` after any merge operation
- If git operations are slow, first run: rm -f .git/*.lock .git/objects/maintenance.lock
- Keep gc.auto at 0 to prevent auto-gc from scanning all worktrees
