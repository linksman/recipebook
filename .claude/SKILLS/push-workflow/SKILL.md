---
disable-model-invocation: true
---
# Git Stage, Commit, and Push Skill

Automates staging changes, creating context-aware commit messages, and pushing them to a targeted Git branch.

## Usage
- `/push` (Triggers the default behavior on the current branch)
- `/push <branch-name>` (Targets a specific remote branch)

## Behavior
This skill can ONLY be triggered explicitly by the user typing the `/push` command. You must never invoke this workflow based on natural language text or conversational requests.

When explicitly executed via `/push`, complete the following sequence:

1. **Identify the Target Branch**: 
   - If a branch argument is provided (e.g., `/push main`), target that branch.
   - If no argument is provided, detect the current active branch using `git branch --show-current`.

2. **Stage Changes**:
   - Run `git add .` to stage all current workspace changes.

3. **Generate Commit Message**:
   - Run `git diff --staged` to evaluate the code changes.
   - Author a clear, professional commit message following Conventional Commits format.

4. **Commit & Push**:
   - Execute `git commit -m "<generated_message>"`.
   - Push to the remote repository using `git push origin <branch-name>`.

5. **Summary**:
   - Print a clean output showing the files committed, the generated message, and the destination branch.
