import * as p from "@clack/prompts";
import pc from "picocolors";
import {
	runGit,
	getCurrentBranch,
	hasStagedChanges,
	hasUnstagedChanges,
	hasUntrackedFiles,
	stageAll,
	safePushBranch,
} from "../git.js";
import {
	handleCancel,
	withSpinner,
	showError,
	showSuccess,
	showInfo,
} from "../ui.js";

const COMMIT_TYPES = [
	{
		value: "Feature",
		label: "✨ Feature",
		hint: "Fitur atau fungsionalitas baru",
	},
	{ value: "Fix", label: "🐛 Fix", hint: "Perbaikan bug pada kode" },
	{
		value: "Sprint",
		label: "🏃 Sprint",
		hint: "Inisialisasi / konfigurasi sprint",
	},
	{
		value: "Hotfix",
		label: "🚑 Hotfix",
		hint: "Perbaikan darurat di level production",
	},
	{ value: "Merge", label: "🔀 Merge", hint: "Penggabungan antar branch" },
	{ value: "Release", label: "📦 Release", hint: "Rilis versi aplikasi" },
	{
		value: "Refactor",
		label: "♻️ Refactor",
		hint: "Restrukturisasi kode tanpa mengubah fungsionalitas",
	},
	{
		value: "Docs",
		label: "📝 Docs",
		hint: "Penambahan atau perubahan dokumentasi",
	},
	{
		value: "Test",
		label: "🧪 Test",
		hint: "Menambahkan atau memperbaiki testing",
	},
	{
		value: "Chore",
		label: "🔧 Chore",
		hint: "Perubahan build tooling, config, atau dependencies",
	},
];

/**
 * Interactive commit wizard.
 * @param {object} options
 */
export async function commitWizard(options = {}) {
	const currentBranch = getCurrentBranch();

	// Check repo status
	const hasStaged = hasStagedChanges();
	const hasUnstaged = hasUnstagedChanges();
	const hasUntracked = hasUntrackedFiles();

	if (!hasStaged && !hasUnstaged && !hasUntracked) {
		showInfo(
			"Working directory bersih. Tidak ada file yang diubah untuk dicommit.",
		);
		return;
	}

	// If no staged changes, offer to stage all
	if (!hasStaged) {
		const stageAction = handleCancel(
			await p.select({
				message: pc.yellow(
					"Tidak ada perubahan yang di-stage (git add). Apa yang ingin Anda lakukan?",
				),
				options: [
					{
						value: "stage_all",
						label: "Stage semua file (git add -A)",
						hint: "Rekomendasi",
					},
					{
						value: "cancel",
						label: "Batal (saya akan git add manual)",
						hint: "Batalkan",
					},
				],
			}),
		);

		if (stageAction === "cancel") {
			showInfo(
				"Silakan lakukan `git add` manual pada file yang ingin Anda commit.",
			);
			return;
		}

		stageAll();
		p.log.step(pc.green("✔ Semua perubahan berhasil di-stage."));
	}

	// Get commit type
	let type = options.type;
	if (!type) {
		type = handleCancel(
			await p.select({
				message: "Pilih tipe perubahan (Commit Type):",
				options: COMMIT_TYPES,
			}),
		);
	} else {
		// find matching type case-insensitively
		const matched = COMMIT_TYPES.find(
			(t) => t.value.toLowerCase() === type.toLowerCase(),
		);
		type = matched ? matched.value : type;
	}

	// Get commit message
	let message = options.message;
	if (!message) {
		message = handleCancel(
			await p.text({
				message: "Masukkan pesan commit:",
				placeholder: "contoh: integrasi payment gateway Xendit",
				validate: (value) => {
					if (!value || !value.trim())
						return "Pesan commit tidak boleh kosong!";
					if (value.trim().length < 3)
						return "Pesan commit terlalu pendek (min 3 karakter).";
				},
			}),
		);
	}

	const formattedMessage = `[${type}] : ${message.trim()}`;

	// Execute git commit
	try {
		await withSpinner(
			"Menyimpan commit...",
			async () => {
				runGit(`commit -m "${formattedMessage.replace(/"/g, '\\"')}"`);
			},
			`Commit tersimpan: ${pc.bold(formattedMessage)}`,
			"Gagal melakukan commit.",
		);

		// Ask to push immediately
		const shouldPush = handleCancel(
			await p.confirm({
				message: `Push commit ke remote (${pc.cyan(currentBranch)}) sekarang?`,
				initialValue: true,
			}),
		);

		if (shouldPush) {
			await withSpinner(
				`Mendorong perubahan ke remote origin/${currentBranch}...`,
				async () => {
					safePushBranch();
				},
				`Berhasil dipush ke remote origin/${currentBranch}!`,
				"Gagal melakukan push.",
			);
		}

		showSuccess("Alur kerja commit berhasil diselesaikan!");
	} catch (error) {
		showError(error.message);
	}
}
