import * as p from "@clack/prompts";
import pc from "picocolors";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
export const FLOW_VERSION = pkg.version;

/**
 * Render the branded CLI header banner.
 * @param {string} subtitle
 */
export function showBanner(subtitle = "Git Workflow & Branching Assistant") {
	console.log();
	console.log(pc.cyan("  ╔═══════════════════════════════════════════╗"));
	console.log(
		pc.cyan("  ║") +
			pc.bold(pc.magenta("               FLOW - IAM                  ")) +
			pc.cyan("║"),
	);
	console.log(
		pc.cyan("  ║") +
			pc.dim(`       v${FLOW_VERSION} • Git Workflow CLI         `) +
			pc.cyan("║"),
	);
	console.log(pc.cyan("  ╚═══════════════════════════════════════════╝"));
	if (subtitle) {
		console.log(pc.dim(`  ${subtitle}\n`));
	}
}

/**
 * Check if user cancelled prompt and exit gracefully.
 * @param {any} value
 */
export function handleCancel(value) {
	if (p.isCancel(value)) {
		p.cancel(pc.yellow("Operasi dibatalkan."));
		process.exit(0);
	}
	return value;
}

/**
 * Execute an async or sync operation with an interactive spinner.
 * @param {string} startText
 * @param {() => Promise<any> | any} action
 * @param {string} successText
 * @param {string} failureText
 */
export async function withSpinner(startText, action, successText, failureText) {
	const s = p.spinner();
	s.start(startText);
	try {
		const result = await action();
		s.stop(successText || "Selesai!");
		return result;
	} catch (error) {
		s.stop(pc.red(failureText || "Gagal!"), 1);
		throw error;
	}
}

/**
 * Format branch name with standard rules (lowercase, replace spaces with hyphen).
 * @param {string} name
 * @returns {string}
 */
export function normalizeBranchName(name) {
	return (name || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9-_./]/g, "");
}

/**
 * Display an error message formatted nicely.
 * @param {string} message
 * @param {Error} [error]
 */
export function showError(message, error) {
	p.log.error(pc.red(message));
	if (error && error.message && error.message !== message) {
		p.log.error(pc.dim(error.message));
	}
}

/**
 * Display a success message.
 * @param {string} message
 */
export function showSuccess(message) {
	p.log.success(pc.green(message));
}

/**
 * Display an informational message.
 * @param {string} message
 */
export function showInfo(message) {
	p.log.info(pc.cyan(message));
}

/**
 * Display a warning message.
 * @param {string} message
 */
export function showWarn(message) {
	p.log.warn(pc.yellow(message));
}
