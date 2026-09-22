import * as p from "@clack/prompts";
import pc from "picocolors";
import {
	runGit,
	getCurrentBranch,
	getAllBranches,
	isWorkingTreeClean,
	deleteBranch,
} from "../git.js";
import {
	handleCancel,
	withSpinner,
	normalizeBranchName,
	showError,
	showSuccess,
	showWarn,
} from "../ui.js";

/**
 * Create a new feature branch based on a sprint branch.
 * @param {object} options
 */
export async function createFeature(options = {}) {
	let sprintBranch = options.sprint;
	let featureName = options.name;

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

	// Detect existing sprint branches
	if (!sprintBranch) {
		const existingSprints = getAllBranches("sprint/");
		if (existingSprints.length > 0) {
			const choices = existingSprints.map((s) => ({
				value: s,
				label: s,
			}));
			choices.push({
				value: "_custom",
				label: "Ketik nama sprint lain...",
				hint: "Input manual",
			});

			const selected = handleCancel(
				await p.select({
					message: "Pilih base Sprint branch:",
					options: choices,
				}),
			);

			if (selected === "_custom") {
				const customSprint = handleCancel(
					await p.text({
						message: "Masukkan nama Sprint:",
						validate: (val) =>
							!val?.trim() ? "Nama sprint tidak boleh kosong!" : undefined,
					}),
				);
				sprintBranch = normalizeBranchName(customSprint).startsWith("sprint/")
					? normalizeBranchName(customSprint)
					: `sprint/${normalizeBranchName(customSprint)}`;
			} else {
				sprintBranch = selected;
			}
		} else {
			const customSprint = handleCancel(
				await p.text({
					message: "Masukkan nama Sprint dasar:",
					placeholder: "contoh: sprint-25",
					validate: (val) =>
						!val?.trim() ? "Nama sprint tidak boleh kosong!" : undefined,
				}),
			);
			sprintBranch = normalizeBranchName(customSprint).startsWith("sprint/")
				? normalizeBranchName(customSprint)
				: `sprint/${normalizeBranchName(customSprint)}`;
		}
	} else if (!sprintBranch.startsWith("sprint/")) {
		sprintBranch = `sprint/${normalizeBranchName(sprintBranch)}`;
	}

	// Ask feature name
	if (!featureName) {
		featureName = handleCancel(
			await p.text({
				message: "Masukkan nama Feature:",
				placeholder: "contoh: user-authentication atau payment-gateway",
				validate: (val) =>
					!val?.trim() ? "Nama feature tidak boleh kosong!" : undefined,
			}),
		);
	}

	const cleanFeature = normalizeBranchName(featureName).replace(
		/^feature\//,
		"",
	);
	const fullBranch = `feature/${cleanFeature}`;

	try {
		await withSpinner(
			`Menyiapkan feature ${pc.cyan(fullBranch)} dari ${pc.green(sprintBranch)}...`,
			async () => {
				runGit(`checkout ${sprintBranch}`);
				try {
					runGit(`pull origin ${sprintBranch}`);
				} catch {
					// offline or no upstream yet
				}
				runGit(`checkout -b ${fullBranch}`);
				try {
					runGit(`push -u origin ${fullBranch}`);
				} catch {
					// offline or push error
				}
			},
			`Branch ${pc.cyan(fullBranch)} berhasil dibuat dari ${pc.green(sprintBranch)}!`,
			`Gagal membuat branch ${fullBranch}`,
		);

		p.note(
			`Branch aktif: ${pc.green(fullBranch)}\nBase sprint: ${pc.dim(sprintBranch)}`,
			"Feature Siap Dikerjakan",
		);
	} catch (error) {
		showError(error.message);
	}
}

/**
 * Finish a feature branch: merge into sprint and cleanup.
 * @param {object} options
 */
export async function finishFeature(options = {}) {
	const current = getCurrentBranch();

	if (!current.startsWith("feature/")) {
		showError(
			`Anda saat ini berada di branch '${pc.yellow(current)}'. Perintah feature-finish hanya berlaku pada branch 'feature/*'.`,
		);
		return;
	}

	let targetSprint = options.target;

	if (!targetSprint) {
		const existingSprints = getAllBranches("sprint/");
		if (existingSprints.length > 0) {
			const choices = existingSprints.map((s) => ({
				value: s,
				label: s,
			}));
			choices.push({
				value: "_custom",
				label: "Ketik branch sprint lain...",
			});

			const selected = handleCancel(
				await p.select({
					message: "Pilih target Sprint branch untuk merge:",
					options: choices,
				}),
			);

			if (selected === "_custom") {
				const custom = handleCancel(
					await p.text({
						message: "Masukkan target sprint branch:",
						validate: (v) =>
							!v?.trim() ? "Target sprint tidak boleh kosong!" : undefined,
					}),
				);
				targetSprint = custom.startsWith("sprint/")
					? custom
					: `sprint/${custom}`;
			} else {
				targetSprint = selected;
			}
		} else {
			const custom = handleCancel(
				await p.text({
					message: "Masukkan target Sprint branch (contoh: sprint/sprint-25):",
					validate: (v) =>
						!v?.trim() ? "Target sprint tidak boleh kosong!" : undefined,
				}),
			);
			targetSprint = custom.startsWith("sprint/") ? custom : `sprint/${custom}`;
		}
	}

	if (!isWorkingTreeClean()) {
		showError(
			"Working directory tidak bersih. Mohon commit atau stash perubahan terlebih dahulu.",
		);
		return;
	}

	const shouldDelete = handleCancel(
		await p.confirm({
			message: `Hapus branch feature ${pc.red(current)} (lokal & remote) setelah merge selesai?`,
			initialValue: true,
		}),
	);

	try {
		await withSpinner(
			`Menggabungkan feature ${pc.cyan(current)} ke ${pc.green(targetSprint)}...`,
			async () => {
				try {
					runGit(`pull origin ${current}`);
				} catch {
					// continue
				}

				runGit(`checkout ${targetSprint}`);
				try {
					runGit(`pull origin ${targetSprint}`);
				} catch {
					// continue
				}

				try {
					runGit(`merge --no-ff ${current}`);
				} catch (err) {
					throw new Error(
						"Terjadi merge conflict! Silakan resolve conflict secara manual:\n   git add .\n   git commit",
					);
				}

				try {
					runGit(`push origin ${targetSprint}`);
				} catch {
					// continue
				}
			},
			`Berhasil merge ${pc.cyan(current)} ke ${pc.green(targetSprint)}!`,
			"Gagal melakukan merge feature.",
		);

		if (shouldDelete) {
			await withSpinner(
				`Membersihkan branch ${pc.red(current)}...`,
				async () => {
					deleteBranch(current, { local: true, remote: true });
				},
				`Branch ${pc.dim(current)} berhasil dihapus (lokal & remote).`,
				`Gagal menghapus branch ${current}`,
			);
		}

		showSuccess(
			`Feature finish selesai! Anda sekarang berada di branch '${targetSprint}'.`,
		);
	} catch (error) {
		showError(error.message);
	}
}
