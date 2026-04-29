# flow-iam

**Version: v1.2.0**

`flow-iam` is a custom CLI helper tool to simplify and standardize your Git branching workflow. It provides commands for creating sprints, features, hotfixes, fixes, commits, and PR/MR operations using either GitHub CLI (`gh`) or GitLab CLI (`glab`) or BitBucket CLI.

---

## 🚀 Features

- Initialize Git project
- Create sprint branches (take from master)
- Create feature branches (take from sprint)
- Create hotfix (take from master)
- create fix branches (take from anywhere except master)
- Commit with validation
- Create Pull Requests (PR) or Merge Requests (MR) (only for github or gitlab)
- Visualize commit history
- Interactive CLI mode
- push to remote
- sprint-finish & feature-finish for fast-forward without merge-request or pull request and automatically delete branch local and remote
- Installing Github/Gitlab/Bitbucket(on progress) platform
