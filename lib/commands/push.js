import pc from "picocolors";
import { getCurrentBranch, safePushBranch } from "../git.js";
import { withSpinner, showError, showSuccess } from "../ui.js";

/**
 * Push current branch safely to remote with upstream handling.
 */
export async function pushCommand() {
	const currentBranch = getCurrentBranch();

	if (!currentBranch) {
		showError("Tidak dapat mendeteksi branch aktif saat ini.");
		return;
	}

	try {
		await withSpinner(
			`Mendorong branch ${pc.cyan(currentBranch)} ke remote origin...`,
			async () => {
				safePushBranch();
			},
			`Branch ${pc.cyan(currentBranch)} berhasil dipush ke remote!`,
			`Gagal melakukan push ke remote.`,
		);
		showSuccess("Push selesai dengan sukses.");
	} catch (error) {
		showError(error.message);
	}
}
