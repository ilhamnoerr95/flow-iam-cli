import { execSync } from "child_process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import {
	getCurrentBranch,
	getDefaultBranch,
	getAllBranches,
	getRemoteUrl,
	runGit,
} from "../git.js";
import {
	handleCancel,
	withSpinner,
	showError,
	showSuccess,
	showInfo,
} from "../ui.js";

function commandExists(cmd) {
	try {
		execSync(`which ${cmd}`, { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * Interactive Pull Request / Merge Request creator.
 */
export async function createPullRequest() {
	const currentBranch = getCurrentBranch();
	const remoteUrl = getRemoteUrl();
	const defaultBranch = getDefaultBranch();

	if (!remoteUrl) {
		showError(
			"Remote origin tidak ditemukan. Pastikan repo terhubung ke remote git.",
		);
		return;
	}

	// Detect platform
	const isGitHub = remoteUrl.includes("github.com");
	const isGitLab = remoteUrl.includes("gitlab.com");
	const isBitbucket = remoteUrl.includes("bitbucket.org");

	p.log.info(
		`Branch sumber (Head): ${pc.cyan(currentBranch)}\nRemote: ${pc.dim(remoteUrl)}`,
	);

	// Target base branch
	const targetChoices = [
		{
			value: defaultBranch,
			label: `${defaultBranch} (Default production branch)`,
		},
		{ value: "develop", label: "develop (Development branch)" },
		{ value: "staging", label: "staging (Staging branch)" },
	];

	// Add existing sprint branches if any
	const sprintBranches = getAllBranches("sprint/");
	for (const s of sprintBranches) {
		targetChoices.push({ value: s, label: `${s} (Sprint branch)` });
	}
	targetChoices.push({
		value: "_custom",
		label: "Branch lain (Ketik manual)...",
	});

	let targetBranch = handleCancel(
		await p.select({
			message: "Pilih target branch (Base):",
			options: targetChoices,
		}),
	);

	if (targetBranch === "_custom") {
		targetBranch = handleCancel(
			await p.text({
				message: "Masukkan target branch:",
				validate: (v) =>
					!v?.trim() ? "Target branch tidak boleh kosong!" : undefined,
			}),
		);
	}

	// Default title based on last commit
	let defaultTitle = "";
	try {
		defaultTitle = runGit("log -1 --pretty=%s", { silent: true });
	} catch {
		defaultTitle = currentBranch;
	}

	const title = handleCancel(
		await p.text({
			message: "Judul PR / MR:",
			initialValue: defaultTitle,
			validate: (v) => (!v?.trim() ? "Judul tidak boleh kosong!" : undefined),
		}),
	);

	const body = handleCancel(
		await p.text({
			message: "Deskripsi / Catatan (opsional):",
			placeholder: "Jelaskan perubahan secara ringkas...",
		}),
	);

	// GitHub Flow
	if (isGitHub) {
		if (commandExists("gh")) {
			const mode = handleCancel(
				await p.select({
					message: "Metode pembuatan PR:",
					options: [
						{
							value: "cli",
							label: "Buat langsung via GitHub CLI (gh)",
							hint: "Instan",
						},
						{
							value: "web",
							label: "Buka di Web Browser (gh pr create --web)",
							hint: "Lengkap",
						},
					],
				}),
			);

			try {
				if (mode === "web") {
					execSync(
						`gh pr create --base "${targetBranch}" --head "${currentBranch}" --title "${title}" --web`,
						{ stdio: "inherit" },
					);
				} else {
					await withSpinner(
						"Membuat Pull Request di GitHub...",
						async () => {
							const cmd = `gh pr create --base "${targetBranch}" --head "${currentBranch}" --title "${title}" --body "${body || ""}"`;
							execSync(cmd, { stdio: "pipe" });
						},
						"Pull Request berhasil dibuat di GitHub!",
						"Gagal membuat Pull Request via GitHub CLI.",
					);
				}
				return;
			} catch (err) {
				showError("Gagal menjalankan gh CLI: " + err.message);
			}
		} else {
			showInfo("GitHub CLI (`gh`) belum terpasang.");
			// Parse owner and repo from URL
			const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
			if (match) {
				const [, owner, repo] = match;
				const compareUrl = `https://github.com/${owner}/${repo}/compare/${targetBranch}...${currentBranch}?expand=1`;
				p.note(
					`Buat PR manual melalui link berikut:\n${pc.cyan(compareUrl)}`,
					"Link Web Browser",
				);
			}
		}
	} else if (isGitLab) {
		if (commandExists("glab")) {
			try {
				await withSpinner(
					"Membuat Merge Request di GitLab...",
					async () => {
						const cmd = `glab mr create --target-branch "${targetBranch}" --source-branch "${currentBranch}" --title "${title}" --description "${body || ""}"`;
						execSync(cmd, { stdio: "pipe" });
					},
					"Merge Request berhasil dibuat di GitLab!",
					"Gagal membuat Merge Request via GitLab CLI.",
				);
				return;
			} catch (err) {
				showError("Gagal menjalankan glab: " + err.message);
			}
		} else {
			showInfo("GitLab CLI (`glab`) belum terpasang.");
		}
	} else {
		showInfo("Platform remote tidak terdeteksi otomatis atau Bitbucket.");
	}
}
