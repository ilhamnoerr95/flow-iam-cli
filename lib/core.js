import { Command } from "commander";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { isGitRepo, getCurrentBranch, getRemoteUrl, initGit } from "./git.js";
import {
	FLOW_VERSION,
	showBanner,
	handleCancel,
	showInfo,
	showSuccess,
} from "./ui.js";
import { createSprint, finishSprint } from "./commands/sprint.js";
import { createFeature, finishFeature } from "./commands/feature.js";
import { createHotfix } from "./commands/hotfix.js";
import { createFix } from "./commands/fix.js";
import { commitWizard } from "./commands/commit.js";
import { pushCommand } from "./commands/push.js";
import { createPullRequest } from "./commands/pr.js";
import { showGitLog } from "./commands/log.js";
import { installPlatform } from "./commands/install.js";

/**
 * Launch interactive menu wizard using @clack/prompts.
 */
export async function interactiveMenu() {
	showBanner();

	if (!isGitRepo()) {
		p.log.warn(pc.yellow("Direktori saat ini bukan git repository."));
		const shouldInit = handleCancel(
			await p.confirm({
				message: "Apakah Anda ingin menjalankan `git init` sekarang?",
				initialValue: true,
			}),
		);
		if (shouldInit) {
			initGit();
			showSuccess("Git repository berhasil diinisialisasi.");
		} else {
			p.outro(pc.dim("Sampai jumpa!"));
			return;
		}
	}

	const currentBranch = getCurrentBranch();
	const remote = getRemoteUrl();

	p.intro(
		`${pc.bold("Status:")} Branch: ${pc.cyan(currentBranch || "detached")} ${remote ? pc.dim(`• Remote: ${remote}`) : ""}`,
	);

	const action = handleCancel(
		await p.select({
			message: "Pilih aksi Git workflow:",
			options: [
				{
					value: "sprint",
					label: "🏃 Create Sprint",
					hint: "Buat branch sprint/* dari default branch",
				},
				{
					value: "feature",
					label: "🚀 Create Feature",
					hint: "Buat branch feature/* dari branch sprint",
				},
				{
					value: "commit",
					label: "✍️ Commit Wizard",
					hint: "Panduan commit terstruktur & opsi auto-push",
				},
				{
					value: "push",
					label: "⬆️ Push Branch",
					hint: "Push branch aktif ke remote secara aman",
				},
				{
					value: "feature-finish",
					label: "🏁 Feature Finish",
					hint: "Merge feature ke sprint & bersihkan branch",
				},
				{
					value: "sprint-finish",
					label: "🏁 Sprint Finish",
					hint: "Merge sprint ke develop/main & bersihkan branch",
				},
				{
					value: "hotfix",
					label: "🚑 Create Hotfix",
					hint: "Buat branch hotfix/* dari default branch",
				},
				{
					value: "fix",
					label: "🔧 Create Fix",
					hint: "Buat branch fix/* dari branch non-master",
				},
				{
					value: "pr",
					label: "🔀 Pull / Merge Request",
					hint: "Buat PR di GitHub / GitLab",
				},
				{
					value: "log",
					label: "📜 Git Log",
					hint: "Visualisasi riwayat commit branch",
				},
				{
					value: "remote",
					label: "🌐 Git Remote",
					hint: "Tampilkan informasi remote repository",
				},
				{
					value: "install",
					label: "📥 Install CLI Tool",
					hint: "Pasang GitHub CLI, GitLab CLI, atau Bitbucket",
				},
				{ value: "exit", label: "🚪 Keluar", hint: "Tutup flow-iam" },
			],
		}),
	);

	switch (action) {
		case "sprint":
			await createSprint();
			break;
		case "feature":
			await createFeature();
			break;
		case "commit":
			await commitWizard();
			break;
		case "push":
			await pushCommand();
			break;
		case "feature-finish":
			await finishFeature();
			break;
		case "sprint-finish":
			await finishSprint();
			break;
		case "hotfix":
			await createHotfix();
			break;
		case "fix":
			await createFix();
			break;
		case "pr":
			await createPullRequest();
			break;
		case "log":
			showGitLog();
			break;
		case "remote":
			showInfo(`Remote origin: ${remote || "Belum ada remote origin"}`);
			break;
		case "install":
			await installPlatform();
			break;
		case "exit":
			p.outro(pc.magenta("Terima kasih telah menggunakan flow-iam! 👋"));
			return;
	}

	p.outro(pc.green("Selesai."));
}

/**
 * Main CLI entrypoint.
 * @param {string[]} argv
 */
export async function run(argv = process.argv) {
	// If no arguments, launch interactive menu directly
	if (!argv || argv.length <= 2) {
		await interactiveMenu();
		return;
	}

	// Normalize legacy shorthand flags mapping to command names
	const aliasMap = {
		"-i": "init",
		"-s": "sprint",
		"-f": "feature",
		"-hx": "hotfix",
		"-c": "commit",
		"-p": "push",
		"-sf": "sprint-finish",
		"-ff": "feature-finish",
		"-l": "log",
		"-r": "remote",
		"-ins": "install-plat-repo",
	};

	const normalizedArgv = [...argv];
	if (aliasMap[normalizedArgv[2]]) {
		normalizedArgv[2] = aliasMap[normalizedArgv[2]];
	}

	const program = new Command();

	program
		.name("flow-iam")
		.description(
			"Git workflow helper CLI (sprint, feature, hotfix, fix, commit, etc.)",
		)
		.version(FLOW_VERSION, "-v, --version", "Tampilkan versi flow-iam");

	program
		.command("init")
		.description("Inisialisasi Git repository pada direktori saat ini")
		.action(() => {
			initGit();
			showSuccess("Git repository berhasil diinisialisasi.");
		});

	program
		.command("sprint [name]")
		.description("Buat sprint branch baru dari default branch")
		.action(async (name) => {
			await createSprint(name);
		});

	program
		.command("feature [name]")
		.option("-s, --sprint <sprint>", "Branch sprint dasar")
		.description("Buat feature branch baru dari sprint")
		.action(async (name, options) => {
			await createFeature({ name, sprint: options.sprint });
		});

	program
		.command("hotfix [name]")
		.description("Buat hotfix branch dari default branch")
		.action(async (name) => {
			await createHotfix(name);
		});

	program
		.command("fix [name]")
		.option("-t, --target <target>", "Target branch sumber (bukan master/main)")
		.description("Buat fix branch dari branch sumber")
		.action(async (name, options) => {
			await createFix({ name, target: options.target });
		});

	program
		.command("commit")
		.option("-m, --message <msg>", "Pesan commit")
		.option(
			"-t, --type <type>",
			"Tipe commit (Feature, Fix, Sprint, Hotfix, dll)",
		)
		.description("Commit wizard interaktif dengan validasi & push")
		.action(async (options) => {
			await commitWizard(options);
		});

	program
		.command("push")
		.description("Push branch aktif ke remote secara aman")
		.action(async () => {
			await pushCommand();
		});

	program
		.command("sprint-finish [target]")
		.option("-d, --delete", "Hapus branch setelah merge")
		.description("Finish sprint branch, merge ke target & bersihkan branch")
		.action(async (target, options) => {
			await finishSprint({ target, delete: options.delete });
		});

	program
		.command("feature-finish [target]")
		.description("Finish feature branch, merge ke sprint & bersihkan branch")
		.action(async (target) => {
			await finishFeature({ target });
		});

	program
		.command("pr")
		.alias("mr")
		.description("Buat Pull Request (GitHub) atau Merge Request (GitLab)")
		.action(async () => {
			await createPullRequest();
		});

	program
		.command("log")
		.option("-n, --lines <number>", "Jumlah commit yang ditampilkan", "20")
		.description("Visualisasi commit history secara grafis")
		.action((options) => {
			showGitLog(parseInt(options.lines, 10) || 20);
		});

	program
		.command("remote")
		.description("Tampilkan remote URL repository")
		.action(() => {
			const url = getRemoteUrl();
			showInfo(`Remote origin: ${url || "Tidak ada remote origin"}`);
		});

	program
		.command("install-plat-repo")
		.description("Install platform CLI (GitHub CLI, GitLab CLI, Bitbucket)")
		.action(async () => {
			await installPlatform();
		});

	program
		.command("menu")
		.description("Tampilkan menu interaktif")
		.action(async () => {
			await interactiveMenu();
		});

	if (normalizedArgv[2] === "help") {
		program.outputHelp();
		return;
	}

	await program.parseAsync(normalizedArgv);
}
