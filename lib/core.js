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
  for (const [key, value] of Object.entries(types)) {
    console.log(`${key}. ${value}`);
  }
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

function hotfix(name) {
  const branch = name.replace(/\s+/g, "-");

  console.log(`🔥 Make new hotfix: hotfix/${branch}`);

  // co master first and pull it
  runGit("checkout master");
  runGit("pull origin");
  console.log(`🚀 Checkout master & pull it ...`);

  // make new branch hotfix from master
  runGit(`checkout -b hotfix/${branch}`);
  console.log(`🚀 Checkout to hotfix/${branch}`);

  // Push branch hotfix to remote
  runGit(`push -u origin hotfix/${branch}`);
  console.log(`✅ hotfix/${branch} successfully pushed to remote`);
}
function fix(params) {
  const { t, f } = params;
  const target_branch = t.replace(/\s+/g, "-");

  const fix_branch = f.replace(/\s+/g, "-");

  if (target_branch != "master") {
    console.log(`🔥 Make new fix branch: fix/${fix_branch}`);

    runGit(`checkout ${target_branch}`);
    runGit(`pull origin`);
    console.log(`🚀 Checkout ${target_branch} & pull it ...`);

    runGit(`checkout -b fix/${fix_branch}`);
    console.log(`🚀 Checkout to ${fix_branch} ...`);

    runGit(`push -u origin fix/${fix_branch}`);
    console.log(`✅ fix/${branch} successfully pushed to remote`);
  } else {
    console.log("❌ Fix branch not for master");
  }
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
    
      sprint-finish (-sf)                  finish sprint & optionally delete branch
      feature-finish (-ff)                 finish feature & delete branch
    
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
function flowIam() {
  const menu = {
    1: "Create your sprint",
    2: "Create your feature",
    3: "Create your hotfix",
    4: "Create your fix",
    5: "Create your commit message",
    6: "Create pull request or merge request",
    7: "show log",
    8: "Sprint-finish",
    9: "Feature-finish",
    10: "Exit",
    11: "Help",
  };
  console.log("🎯 Menu flow-iam:");
  for (const [key, value] of Object.entries(menu)) {
    console.log(`${key}. ${value}`);
  }
  console.log("===========================\n");
  prompt("👉 Input your choice [1-11]: ", (c) => {
    console.log(c);
    if (c == 1) prompt("Sprint name: ", (name) => createSprint(name));
    if (c == 2)
      prompt("Sprint name: ", (s) => {
        prompt("Feature name: ", (f) => createFeature(s, f));
      });
    if (c == 3) prompt("Hotfix name: ", (n) => hotfix(n));
    if (c == 4)
      prompt("Target branch:", (t) => {
        prompt("Fix branch", (f) => {
          fix({ t, f });
        });
      });
    if (c == 5) commit();
    if (c == 6) console.log("ON PROGRESS");
    if (c == 7) console.log("ON PROGRESS");
    if (c == 8) console.log("ON PROGRESS");
    if (c == 9) console.log("ON PROGRESS");
    if (c == 10) console.log("👋 Goodbye!");
    if (c == 11) helpMessage();
  });
}

export function run(argv) {
  const cmd = argv[2];
  // kalau tidak ada command → tampilkan menu
  if (!cmd) {
    return flowIam(); // misalnya show menu + prompt
  }
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
      prompt("Hotfix name: ", (n) => hotfix(n));
      break;
    case "fix":
      prompt("Target branch:", (t) => {
        prompt("Fix branch", (f) => {
          fix({ t, f });
        });
      });
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
      console.log(`❌ Unknown command: ${cmd}\n`);
      return flowIam();
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
