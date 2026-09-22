import { execSync } from "child_process";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { handleCancel, showError, showSuccess, showInfo } from "../ui.js";

function commandExists(cmd) {
	try {
		execSync(`which ${cmd}`, { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

const INSTALLERS = {
	macOS: {
		GitHub: {
			check: "gh",
			cmd: "brew install gh && gh auth login",
		},
		GitLab: {
			check: "glab",
			cmd: "brew install glab && glab auth login",
		},
		Bitbucket: {
			check: "bitbucket-cli",
			cmd: "brew install bitbucket-cli",
		},
	},
	"Linux (Ubuntu/Debian)": {
		GitHub: {
			check: "gh",
			cmd: `(type -p wget >/dev/null || sudo apt install wget -y) && \
sudo mkdir -p -m 755 /etc/apt/keyrings && \
out=$(mktemp) && wget -nv -O$out https://cli.github.com/packages/githubcli-archive-keyring.gpg && \
cat $out | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
sudo apt update && \
sudo apt install gh -y`,
		},
		GitLab: {
			check: "glab",
			cmd: `sudo apt update && sudo apt install glab -y || echo "Silakan unduh paket .deb dari https://gitlab.com/gitlab-org/cli"`,
		},
		Bitbucket: {
			check: "bitbucket-cli",
			cmd: null,
		},
	},
	"Linux (Fedora/RHEL/CentOS)": {
		GitHub: {
			check: "gh",
			cmd: `sudo dnf install 'dnf-command(config-manager)' -y && sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo && sudo dnf install gh -y`,
		},
		GitLab: {
			check: "glab",
			cmd: `sudo dnf install glab -y`,
		},
		Bitbucket: {
			check: "bitbucket-cli",
			cmd: null,
		},
	},
};

/**
 * Interactive platform CLI installer.
 */
export async function installPlatform() {
	let detectedOS = "macOS";
	if (process.platform === "darwin") {
		detectedOS = "macOS";
	} else if (process.platform === "linux") {
		detectedOS = "Linux (Ubuntu/Debian)";
	}

	const osChoice = handleCancel(
		await p.select({
			message: "Pilih Sistem Operasi Anda:",
			options: [
				{
					value: "macOS",
					label: "macOS (Homebrew)",
					hint: process.platform === "darwin" ? "Terdeteksi" : "",
				},
				{
					value: "Linux (Ubuntu/Debian)",
					label: "Linux (Ubuntu / Debian / Mint)",
					hint: process.platform === "linux" ? "Terdeteksi" : "",
				},
				{
					value: "Linux (Fedora/RHEL/CentOS)",
					label: "Linux (Fedora / RHEL / CentOS)",
				},
			],
			initialValue: detectedOS,
		}),
	);

	const platformChoice = handleCancel(
		await p.select({
			message: "Pilih platform Git CLI yang ingin dipasang:",
			options: [
				{
					value: "GitHub",
					label: "GitHub CLI (gh)",
					hint: commandExists("gh")
						? pc.green("Sudah terpasang")
						: pc.dim("Belum terpasang"),
				},
				{
					value: "GitLab",
					label: "GitLab CLI (glab)",
					hint: commandExists("glab")
						? pc.green("Sudah terpasang")
						: pc.dim("Belum terpasang"),
				},
				{
					value: "Bitbucket",
					label: "Bitbucket CLI",
					hint: pc.dim("Dukungan terbatas"),
				},
			],
		}),
	);

	const installerInfo = INSTALLERS[osChoice]?.[platformChoice];

	if (!installerInfo || !installerInfo.cmd) {
		showError(
			`Installer otomatis untuk ${platformChoice} di ${osChoice} belum tersedia secara resmi.`,
		);
		return;
	}

	if (commandExists(installerInfo.check)) {
		showInfo(
			`${platformChoice} CLI (${installerInfo.check}) sudah terpasang di sistem Anda!`,
		);
		const reinstall = handleCancel(
			await p.confirm({
				message: "Jalankan ulang perintah instalasi/login?",
				initialValue: false,
			}),
		);
		if (!reinstall) return;
	}

	p.note(installerInfo.cmd, "Perintah yang akan dijalankan");

	const proceed = handleCancel(
		await p.confirm({
			message: "Jalankan perintah instalasi di atas sekarang?",
			initialValue: true,
		}),
	);

	if (!proceed) {
		showInfo("Instalasi dibatalkan.");
		return;
	}

	try {
		execSync(installerInfo.cmd, {
			stdio: "inherit",
			shell: true,
		});
		showSuccess(`Instalasi ${platformChoice} CLI selesai!`);
	} catch (err) {
		showError("Instalasi gagal: " + err.message);
	}
}
