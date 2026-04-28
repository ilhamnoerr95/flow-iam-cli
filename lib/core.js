import { execSync } from "child_process";
import readline from "readline";

const FLOW_VERSION = "1.0.0";

function runGit(cmd) {
  try {
    const result = execSync(`git ${cmd}`, { stdio: "pipe" }).toString();
    console.log(result);
  } catch (e) {
    console.error("❌ Error:", e.message);
  }
}

function initBranch() {
  return runGit("init");
}

function currentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
}

function safePush() {
  const branch = currentBranch();
  console.log("🚀 Current branch:", branch);

  try {
    execSync(`git rev-parse --symbolic-full-name --verify ${branch}@{u}`);
    runGit("push");
  } catch {
    runGit(`push -u origin ${branch}`);
  }
}

function createSprint(name) {
  const branch = name.replace(/\s+/g, "-");
  runGit("checkout master");
  runGit("pull origin master");
  runGit(`checkout -b sprint/${branch}`);
  runGit(`push -u origin sprint/${branch}`);
}

function createFeature(sprint, feature) {
  runGit(`checkout sprint/${sprint}`);
  runGit(`pull origin sprint/${sprint}`);
  runGit(`checkout -b feature/${feature}`);
  runGit(`push -u origin feature/${feature}`);
}

function commit() {
  const types = {
    1: "Feature",
    2: "Sprint",
    3: "Hotfix",
    4: "Fix",
    5: "Merge",
    6: "Release",
  };

  console.log("=== Branch Types ===");
  console.table(types);
  console.log("===========================\n");

  prompt("Title [1-6]: ", (t) => {
    const real = types[t];
    if (!real) {
      console.log("❌ invalid title");
      return;
    }
    prompt("Message: ", (msg) => {
      runGit(`commit -m "[${real}] : ${msg}"`);
    });
  });
}

function hotfix() {
  console.log("hotfix");
}
function helpMessage() {
  const HELP_TEXT = `
    flow-iam is a tool to help you manage your git workflow.
    
    Usage: flow-iam [options]
    
      init (-i)                           init the project
      sprint (-s) <name>                  create a sprint branch from master
      feature (-f) <name>                 create a feature branch from sprint
      hotfix (-hx) <name>                 create a hotfix branch from master
      fix <target_branch> <fix_branch>    create a fix branch from target_branch
    
      sprint-finish (sf)                  finish sprint & optionally delete branch
      feature-finish (ff)                 finish feature & delete branch
    
      commit (-c) <message>                create a commit
      pr/mr                               create a pull request or merge request
    
      log (-l)                            show the log of your branch
      push (-p)                           push branch to remote
    
      help (-h)                           show this help message
      remote (-r)                         show remote origin
      version (-v, --version)             show the version of flow-iam
    `;

  console.log(HELP_TEXT);
}

export function run(argv) {
  const cmd = argv[2];

  switch (cmd) {
    case "-i":
    case "init":
      initBranch();
      break;

    case "-s":
    case "sprint":
      prompt("Sprint name: ", (name) => createSprint(name));
      break;

    case "-f":
    case "feature":
      prompt("Sprint name: ", (s) => {
        prompt("Feature name: ", (f) => createFeature(s, f));
      });
      break;

    case "-c":
    case "commit":
      commit();
      break;

    case "-p":
    case "push":
      safePush();
      break;

    case "-hx":
    case "hotfix":
      hotfix();
      break;
    case "-h":
    case "help":
      helpMessage();
      break;

    case "-v":
    case "--version":
    case "version":
      console.log("flow-iam version:", FLOW_VERSION);
      break;

    case "-r":
    case "remote":
      runGit("remote -v");
      break;

    default:
      console.log("❌ Command not found");
  }
}

function prompt(question, cb) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(question, (answer) => {
    rl.close();
    cb(answer);
  });
}
