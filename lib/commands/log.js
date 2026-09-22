import { execSync } from "child_process";
import pc from "picocolors";
import { getCurrentBranch } from "../git.js";
import { showInfo, showError } from "../ui.js";

/**
 * Display graphical git commit log.
 * @param {number} [lines=20]
 */
export function showGitLog(lines = 20) {
	const branch = getCurrentBranch();
	showInfo(`Menampilkan riwayat commit (${pc.cyan(branch)}):`);
	console.log();

	try {
		execSync(`git log --graph --all --decorate --oneline -n ${lines}`, {
			stdio: "inherit",
		});
		console.log();
	} catch (error) {
		showError("Gagal menampilkan git log.", error);
	}
}
