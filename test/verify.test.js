import assert from "assert";
import {
	getCurrentBranch,
	getDefaultBranch,
	getLocalBranches,
	getAllBranches,
	isWorkingTreeClean,
	getRemoteUrl,
	isGitRepo,
} from "../lib/git.js";
import { normalizeBranchName } from "../lib/ui.js";

console.log("Running unit tests for git & ui utilities...");

// Test git repo check
assert.strictEqual(isGitRepo(), true, "Should detect git repo");

// Test current branch
const branch = getCurrentBranch();
console.log("Current branch:", branch);
assert.ok(branch.length > 0, "Branch should not be empty");

// Test default branch detection
const defaultBranch = getDefaultBranch();
console.log("Default branch detected:", defaultBranch);
assert.ok(
	defaultBranch === "master" || defaultBranch === "main",
	"Default branch should be master or main",
);

// Test branch listings
const localBranches = getLocalBranches();
console.log("Local branches:", localBranches);
assert.ok(Array.isArray(localBranches), "Local branches should be an array");

const allBranches = getAllBranches();
console.log("All branches:", allBranches);
assert.ok(Array.isArray(allBranches), "All branches should be an array");

// Test remote url
const remote = getRemoteUrl();
console.log("Remote URL:", remote);
assert.ok(remote.includes("flow-iam-cli"), "Remote URL should match");

// Test normalizeBranchName
assert.strictEqual(normalizeBranchName("My Sprint 25"), "my-sprint-25");
assert.strictEqual(
	normalizeBranchName("Feature/Auth Login"),
	"feature/auth-login",
);
assert.strictEqual(
	normalizeBranchName("HOTFIX-critical-1!"),
	"hotfix-critical-1",
);

console.log("✅ All unit tests passed successfully!");
