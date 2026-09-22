import * as p from "@clack/prompts";
import pc from "picocolors";
import {
	runGit,
	getCurrentBranch,
	getDefaultBranch,
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
 * Create a new sprint branch.
 * @param {string} [name]
 */
export async function createSprint(name) {
	let sprintName = name;

	if (!sprintName) {
		sprintName = handleCancel(
			await p.text({
				message: "Masukkan nama Sprint:",
				placeholder: "contoh: sprint-25 atau sprint-q4",
				validate: (value) => {
					if (!value || !value.trim()) return "Nama sprint tidak boleh kosong!";
					if (value.includes(" "))
						return "Gunakan tanda strip (-) sebagai pengganti spasi.";
				},
			}),
		);
	}

	const cleanName = normalizeBranchName(sprintName).replace(/^sprint\//, "");
	const fullBranch = `sprint/${cleanName}`;
	const defaultBranch = getDefaultBranch();

	if (!isWorkingTreeClean()) {
		const proceed = handleCancel(
			await p.confirm({
				message: pc.yellow(
					"Working directory memiliki perubahan uncommitted. Lanjutkan tetap membuat branch?",
				),
				initialValue: false,
			}),
		);
		if (!proceed) {
			showWarn("Silakan commit atau stash perubahan Anda terlebih dahulu.");
			return;
		}
	}

	try {
		await withSpinner(
			`Menyiapkan branch ${pc.cyan(fullBranch)} dari ${pc.green(defaultBranch)}...`,
			async () => {
				runGit(`checkout ${defaultBranch}`);
				try {
					runGit(`pull origin ${defaultBranch}`);
				} catch {
					// pull origin might fail if no remote or offline, continue
				}
				runGit(`checkout -b ${fullBranch}`);
				try {
					runGit(`push -u origin ${fullBranch}`);
				} catch {
					// offline or push permissions
				}
			},
			`Branch ${pc.cyan(fullBranch)} berhasil dibuat & dipush ke remote!`,
			`Gagal membuat branch ${fullBranch}`,
		);

		p.note(
			`Branch aktif saat ini: ${pc.green(fullBranch)}\nBase: ${pc.dim(defaultBranch)}`,
			"Sprint Siap Digunakan",
		);
	} catch (error) {
		showError(`Gagal membuat sprint: ${error.message}`);
	}
}

/**
 * Finish a sprint branch: merge into develop/main and optionally cleanup.
 * @param {object} options
 */
export async function finishSprint(options = {}) {
	const current = getCurrentBranch();

	if (!current.startsWith("sprint/")) {
		showError(
			`Anda saat ini berada di branch '${pc.yellow(current)}'. Perintah sprint-finish hanya berlaku pada branch 'sprint/*'.`,
		);
		return;
	}

	let targetBranch = options.target;
	if (!targetBranch) {
		const defaultBranch = getDefaultBranch();
		const commonTargets = [
			{
				value: "develop",
				label: "develop",
				hint: "Standard git-flow development branch",
			},
			{
				value: "development",
				label: "development",
				hint: "Alternative development branch",
			},
			{ value: "staging", label: "staging", hint: "Pre-production testing" },
			{
				value: defaultBranch,
				label: defaultBranch,
				hint: "Main / Production branch",
			},
			{
				value: "_custom",
				label: "Branch lain (Ketik manual)...",
				hint: "Custom target",
			},
		];

		const selected = handleCancel(
			await p.select({
				message: "Pilih target branch untuk merge sprint:",
				options: commonTargets,
				initialValue: "develop",
			}),
		);

		if (selected === "_custom") {
			targetBranch = handleCancel(
				await p.text({
					message: "Masukkan target branch:",
					validate: (val) =>
						!val?.trim() ? "Target branch tidak boleh kosong!" : undefined,
				}),
			);
		} else {
			targetBranch = selected;
		}
	}

	let shouldDelete = options.delete;
	if (shouldDelete === undefined) {
		shouldDelete = handleCancel(
			await p.confirm({
				message: `Hapus branch ${pc.red(current)} (lokal & remote) setelah merge selesai?`,
				initialValue: true,
			}),
		);
	}

	if (!isWorkingTreeClean()) {
		showError(
			"Working directory tidak bersih. Mohon commit atau stash perubahan terlebih dahulu.",
		);
		return;
	}

	try {
		await withSpinner(
			`Menggabungkan (merge) ${pc.cyan(current)} ke ${pc.green(targetBranch)}...`,
			async () => {
				// checkout target
				runGit(`checkout ${targetBranch}`);
				try {
					runGit(`pull origin ${targetBranch}`);
				} catch {
					// continue
				}

				// merge --no-ff
				try {
					runGit(`merge --no-ff ${current}`);
				} catch (mergeError) {
					throw new Error(
						"Terjadi merge conflict! Silakan resolve conflict secara manual:\n   git add .\n   git commit",
					);
				}

				// push target
				try {
					runGit(`push origin ${targetBranch}`);
				} catch {
					// continue
				}
			},
			`Berhasil merge ${pc.cyan(current)} ke ${pc.green(targetBranch)}!`,
			"Gagal melakukan merge sprint.",
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
			`Sprint finish selesai! Anda sekarang berada di branch '${targetBranch}'.`,
		);
	} catch (error) {
		showError(error.message);
	}
}
