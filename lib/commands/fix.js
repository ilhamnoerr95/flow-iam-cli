import * as p from "@clack/prompts";
import pc from "picocolors";
import {
	runGit,
	getDefaultBranch,
	getAllBranches,
	isWorkingTreeClean,
} from "../git.js";
import {
	handleCancel,
	withSpinner,
	normalizeBranchName,
	showError,
	showWarn,
} from "../ui.js";

/**
 * Create a fix branch from any branch except default branch (master/main).
 * @param {object} options
 */
export async function createFix(options = {}) {
	let targetBranch = options.target;
	let fixBranch = options.name;
	const defaultBranch = getDefaultBranch();

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

	if (!targetBranch) {
		const allBranches = getAllBranches().filter(
			(b) => b !== defaultBranch && b !== "main" && b !== "master",
		);

		if (allBranches.length > 0) {
			const choices = allBranches.map((b) => ({
				value: b,
				label: b,
			}));
			choices.push({
				value: "_custom",
				label: "Ketik branch target lain...",
			});

			const selected = handleCancel(
				await p.select({
					message: "Pilih target branch sumber (bukan main/master):",
					options: choices,
				}),
			);

			if (selected === "_custom") {
				targetBranch = handleCancel(
					await p.text({
						message: "Masukkan nama target branch sumber:",
						validate: (v) => {
							if (!v?.trim()) return "Target branch tidak boleh kosong!";
							if (v.trim() === "master" || v.trim() === "main") {
								return "Fix branch tidak boleh diturunkan dari master/main! Gunakan hotfix untuk master/main.";
							}
						},
					}),
				);
			} else {
				targetBranch = selected;
			}
		} else {
			targetBranch = handleCancel(
				await p.text({
					message: "Masukkan target branch sumber (bukan main/master):",
					validate: (v) => {
						if (!v?.trim()) return "Target branch tidak boleh kosong!";
						if (v.trim() === "master" || v.trim() === "main") {
							return "Fix branch tidak boleh dari master/main! Gunakan hotfix.";
						}
					},
				}),
			);
		}
	}

	if (targetBranch === "master" || targetBranch === "main") {
		showError(
			"Fix branch tidak diperbolehkan dibuat dari master/main. Gunakan 'hotfix' untuk branch master/main.",
		);
		return;
	}

	if (!fixBranch) {
		fixBranch = handleCancel(
			await p.text({
				message: "Masukkan nama Fix branch:",
				placeholder: "contoh: ui-button-align atau fix-payload-format",
				validate: (v) =>
					!v?.trim() ? "Nama fix branch tidak boleh kosong!" : undefined,
			}),
		);
	}

	const cleanFix = normalizeBranchName(fixBranch).replace(/^fix\//, "");
	const fullBranch = `fix/${cleanFix}`;

	try {
		await withSpinner(
			`Menyiapkan ${pc.cyan(fullBranch)} dari ${pc.green(targetBranch)}...`,
			async () => {
				runGit(`checkout ${targetBranch}`);
				try {
					runGit(`pull origin ${targetBranch}`);
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
			`Branch ${pc.cyan(fullBranch)} berhasil dibuat dari ${pc.green(targetBranch)}!`,
			`Gagal membuat branch ${fullBranch}`,
		);

		p.note(
			`Branch aktif: ${pc.cyan(fullBranch)}\nTarget sumber: ${pc.dim(targetBranch)}`,
			"Fix Branch Siap Digunakan",
		);
	} catch (error) {
		showError(error.message);
	}
}
