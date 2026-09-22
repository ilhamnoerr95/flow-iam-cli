import * as p from "@clack/prompts";
import pc from "picocolors";
import { runGit, getDefaultBranch, isWorkingTreeClean } from "../git.js";
import {
	handleCancel,
	withSpinner,
	normalizeBranchName,
	showError,
	showWarn,
} from "../ui.js";

/**
 * Create a new hotfix branch from default branch.
 * @param {string} [name]
 */
export async function createHotfix(name) {
	let hotfixName = name;

	if (!isWorkingTreeClean()) {
		const proceed = handleCancel(
			await p.confirm({
				message: pc.yellow(
					"Working directory memiliki perubahan uncommitted. Lanjutkan?",
				),
				initialValue: false,
			}),
		);
		if (!proceed) {
			showWarn("Silakan commit atau stash perubahan Anda terlebih dahulu.");
			return;
		}
	}

	if (!hotfixName) {
		hotfixName = handleCancel(
			await p.text({
				message: "Masukkan nama Hotfix:",
				placeholder: "contoh: patch-security-auth atau fix-null-pointer",
				validate: (val) =>
					!val?.trim() ? "Nama hotfix tidak boleh kosong!" : undefined,
			}),
		);
	}

	const clean = normalizeBranchName(hotfixName).replace(/^hotfix\//, "");
	const fullBranch = `hotfix/${clean}`;
	const defaultBranch = getDefaultBranch();

	try {
		await withSpinner(
			`Menyiapkan ${pc.red(fullBranch)} dari ${pc.green(defaultBranch)}...`,
			async () => {
				runGit(`checkout ${defaultBranch}`);
				try {
					runGit(`pull origin ${defaultBranch}`);
				} catch {
					// continue
				}
				runGit(`checkout -b ${fullBranch}`);
				try {
					runGit(`push -u origin ${fullBranch}`);
				} catch {
					// continue
				}
			},
			`Branch ${pc.red(fullBranch)} berhasil dibuat dan dipush ke remote!`,
			`Gagal membuat branch ${fullBranch}`,
		);

		p.note(
			`Branch aktif: ${pc.red(fullBranch)}\nBase: ${pc.dim(defaultBranch)}`,
			"Hotfix Siap Dikerjakan",
		);
	} catch (error) {
		showError(error.message);
	}
}
