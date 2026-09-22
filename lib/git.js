import { execSync } from "child_process";

/**
 * Execute a git command with error handling.
 * @param {string} cmd
 * @param {object} options
 * @returns {string}
 */
export function runGit(cmd, { silent = false, stdio = "pipe" } = {}) {
	try {
		const result = execSync(`git ${cmd}`, {
			stdio,
			encoding: "utf-8",
		});
		const trimmed = (result || "").trim();
		if (!silent && trimmed && stdio === "pipe") {
			// return trimmed
		}
		return trimmed;
	} catch (error) {
		const errorMsg =
			error.stderr?.toString() || error.stdout?.toString() || error.message;
		const err = new Error(errorMsg.trim());
		err.originalError = error;
		throw err;
	}
}

/**
 * Check if the current directory is a git repository.
 * @returns {boolean}
 */
export function isGitRepo() {
	try {
		runGit("rev-parse --is-inside-work-tree", { silent: true });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get the current active branch name.
 * @returns {string}
 */
export function getCurrentBranch() {
	try {
		return runGit("rev-parse --abbrev-ref HEAD", { silent: true });
	} catch {
		return "";
	}
}

/**
 * Auto-detect default branch (main or master).
 * @returns {string}
 */
export function getDefaultBranch() {
	try {
		// Check remote HEAD symbolic-ref if available
		const remoteHead = runGit("symbolic-ref refs/remotes/origin/HEAD", {
			silent: true,
		});
		if (remoteHead) {
			const parts = remoteHead.split("/");
			return parts[parts.length - 1];
		}
	} catch {
		// fallback check
	}

	// Check if main branch exists locally or on remote
	try {
		runGit("show-ref --verify --quiet refs/heads/main", { silent: true });
		return "main";
	} catch {
		// not local main
	}

	try {
		runGit("show-ref --verify --quiet refs/remotes/origin/main", {
			silent: true,
		});
		return "main";
	} catch {
		// not remote main
	}

	return "master";
}

/**
 * Get list of local branch names.
 * @param {string} prefix - Optional prefix filter e.g. "sprint/" or "feature/"
 * @returns {string[]}
 */
export function getLocalBranches(prefix = "") {
	try {
		const raw = runGit("branch --format='%(refname:short)'", { silent: true });
		const branches = raw
			.split("\n")
			.map((b) => b.replace(/^['"]|['"]$/g, "").trim())
			.filter(Boolean);

		if (prefix) {
			return branches.filter((b) => b.startsWith(prefix));
		}
		return branches;
	} catch {
		return [];
	}
}

/**
 * Get list of remote branch names.
 * @param {string} prefix - Optional prefix filter e.g. "sprint/"
 * @returns {string[]}
 */
export function getRemoteBranches(prefix = "") {
	try {
		const raw = runGit("branch -r --format='%(refname:short)'", {
			silent: true,
		});
		const branches = raw
			.split("\n")
			.map((b) => b.replace(/^['"]|['"]$/g, "").trim())
			.filter((b) => b && !b.includes("/HEAD") && b.includes("/"))
			.map((b) => b.replace(/^[^/]+\//, ""));

		const unique = [...new Set(branches)];
		if (prefix) {
			return unique.filter((b) => b.startsWith(prefix));
		}
		return unique;
	} catch {
		return [];
	}
}

/**
 * Get deduplicated list of all branches (local and remote).
 * @param {string} prefix
 * @returns {string[]}
 */
export function getAllBranches(prefix = "") {
	const local = getLocalBranches(prefix);
	const remote = getRemoteBranches(prefix);
	return [...new Set([...local, ...remote])];
}

/**
 * Check if working directory has uncommitted changes.
 * @returns {boolean}
 */
export function isWorkingTreeClean() {
	try {
		const status = runGit("status --porcelain", { silent: true });
		return status.length === 0;
	} catch {
		return false;
	}
}

/**
 * Check if there are staged changes ready to be committed.
 * @returns {boolean}
 */
export function hasStagedChanges() {
	try {
		// exit code 1 if there are staged changes, 0 if clean
		runGit("diff --cached --quiet", { silent: true });
		return false;
	} catch {
		return true;
	}
}

/**
 * Check if there are unstaged changes.
 * @returns {boolean}
 */
export function hasUnstagedChanges() {
	try {
		// exit code 1 if there are changes, 0 if clean
		runGit("diff --quiet", { silent: true });
		return false;
	} catch {
		return true;
	}
}

/**
 * Check if there are untracked files.
 * @returns {boolean}
 */
export function hasUntrackedFiles() {
	try {
		const untracked = runGit("ls-files --others --exclude-standard", {
			silent: true,
		});
		return untracked.length > 0;
	} catch {
		return false;
	}
}

/**
 * Stage all files.
 */
export function stageAll() {
	return runGit("add -A");
}

/**
 * Safe push current branch.
 */
export function safePushBranch() {
	const branch = getCurrentBranch();
	if (!branch) {
		throw new Error("Cannot determine current branch.");
	}

	try {
		// Check if tracking branch exists
		runGit(`rev-parse --symbolic-full-name --verify ${branch}@{u}`, {
			silent: true,
		});
		return runGit("push");
	} catch {
		return runGit(`push -u origin ${branch}`);
	}
}

/**
 * Delete a branch locally and remotely.
 * @param {string} branch
 * @param {object} options
 */
export function deleteBranch(branch, { local = true, remote = true } = {}) {
	const results = { local: false, remote: false };

	if (local) {
		try {
			runGit(`branch -D ${branch}`);
			results.local = true;
		} catch {
			results.local = false;
		}
	}

	if (remote) {
		try {
			runGit(`push origin --delete ${branch}`);
			results.remote = true;
		} catch {
			results.remote = false;
		}
	}

	return results;
}

/**
 * Get git remote URL.
 * @returns {string}
 */
export function getRemoteUrl() {
	try {
		return runGit("remote get-url origin", { silent: true });
	} catch {
		return "";
	}
}

/**
 * Initialize a new git repository.
 */
export function initGit() {
	return runGit("init");
}
