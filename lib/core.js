import { execSync } from "child_process";
import readline from "readline";

const FLOW_VERSION = "1.2.1";

function customCmd(cmd) {
  try {
    execSync(cmd, {
      stdio: "inherit", // realtime output
      shell: true, // penting untuk multi-line & pipe
    });
    console.log("\n✅ Done!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  }
}

function runGit(cmd, option = {}) {
  const { silent = false } = option;
  try {
    const result = execSync(`git ${cmd}`, { stdio: "pipe" }).toString().trim();

    if (!silent && result) {
      console.log(result);
    }
    return result;
  } catch (e) {
    console.log(`❌ Git command failed: git ${cmd}`);
    console.log(e.message);
    throw e;
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

// feature finish
function featureFinish(tBranch) {
  const targetBranch = tBranch.replace(/\s+/g, "-");

  const currentBranchName = currentBranch();

  // Guard: harus di feature/*
  if (!currentBranchName.startsWith("feature/")) {
    console.log("❌ You must be on a 'feature/*' branch to finish a feature.");
    return;
  }

  // Guard: target harus sprint/*
  if (!targetBranch || !targetBranch.startsWith("sprint/")) {
    console.log("❌ Target branch must be a 'sprint/*' branch.");
    return;
  }

  console.log(`🔄 Finishing feature: ${currentBranchName}`);
  console.log(`🎯 Target branch: ${targetBranch}\n`);

  try {
    // Pastikan working dir clean
    const status = runGit("status --porcelain", { silent: true });
    if (status) {
      console.log("Working directory not clean. Please commit/stash first.");
    }

    // Update feature branch dulu
    runGit(`pull origin ${currentBranchName}`);

    // Checkout sprint
    runGit(`checkout ${targetBranch}`);

    // Update sprint branch
    runGit(`pull origin ${targetBranch}`);

    // Merge feature → sprint
    try {
      runGit(`merge --no-ff ${currentBranchName}`);
    } catch (mergeError) {
      console.error("❌ Merge conflict detected!");
      console.log("👉 Resolve conflicts manually, then run:");
      console.log(`   git add .`);
      console.log(`   git commit`);
      return;
    }

    // Push hasil merge
    runGit(`push origin ${targetBranch}`);

    console.log(`✅ Successfully merged into ${targetBranch}`);

    // Cleanup branch
    cleanupBranch(currentBranchName);

    // (optional) balik ke sprint
    runGit(`checkout ${targetBranch}`);
  } catch (error) {
    console.error("❌ Failed to finish feature:", error.message);
  }
}
// sprint finish
function sprintFinish(targetBranch = "develop", del = "n") {
  // normalize input
  const deleteBranch = String(del).toLowerCase() === "y";

  const currentBranchName = currentBranch();

  const allowedTargets = [
    "develop",
    "development",
    "staging",
    "master",
    "main",
  ];

  // Guard: harus di sprint/*
  if (!currentBranchName.startsWith("sprint/")) {
    console.log("❌ You must be on 'sprint/*' branch to finish sprint.");
    return;
  }

  // Guard: target harus valid
  if (!allowedTargets.includes(targetBranch)) {
    console.log(
      `❌ Invalid target branch. Allowed: ${allowedTargets.join(", ")}`,
    );
    return;
  }

  console.log(`🔄 Finishing sprint: ${currentBranchName}`);
  console.log(`🎯 Target branch: ${targetBranch}`);
  console.log(`🧹 Delete branch after merge: ${deleteBranch}\n`);

  try {
    // check working dir clean
    const status = runGit("status --porcelain", { silent: true });
    if (status) {
      console.log("Working directory not clean. Please commit/stash first.");
    }
    // checkout target
    runGit(`checkout ${targetBranch}`);

    // update latest target
    runGit(`pull origin ${targetBranch}`);

    // merge sprint → target
    try {
      runGit(`merge --no-ff ${currentBranchName}`);
    } catch (mergeError) {
      console.error("❌ Merge conflict detected!");
      console.log("👉 Resolve manually, then:");
      console.log("   git add .");
      console.log("   git commit");
      return;
    }

    // push
    runGit(`push origin ${targetBranch}`);

    console.log(`✅ Successfully merged into ${targetBranch}`);

    // cleanup optional
    if (deleteBranch) {
      cleanupBranch(currentBranchName);
    } else {
      console.log("ℹ️ Sprint branch not deleted.");
    }
  } catch (error) {
    console.error("❌ Failed to finish sprint:", error.message);
  }
}

// clean up branch
function cleanupBranch(branch) {
  console.log("\n🧹 Cleaning up sprint branch...");

  try {
    // delete local
    runGit(`branch -d ${branch}`);

    // delete remote
    runGit(`push origin --delete ${branch}`);

    console.log(`✅ Branch '${branch}' removed (local & remote)`);
  } catch (error) {
    console.error("⚠️ Cleanup failed:", error.message);
  }
}

// create sprint
function createSprint(name) {
  const branch = name.replace(/\s+/g, "-");
  runGit("checkout master");
  runGit("pull origin master");
  runGit(`checkout -b sprint/${branch}`);
  runGit(`push -u origin sprint/${branch}`);
}

// feature function
function createFeature(sprint, feature) {
  const sprinter = sprint.replace(/\s+/g, "-");
  const featuree = feature.replace(/\s+/g, "-");

  runGit(`checkout sprint/${sprinter}`);
  runGit(`pull origin sprint/${sprinter}`);
  runGit(`checkout -b feature/${featuree}`);
  runGit(`push -u origin feature/${featuree}`);
}

// commit function
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

// hotfix function
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

// fix function
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

// help message
function helpMessage() {
  const HELP_TEXT = `
    flow-iam is a tool to help you manage your git workflow.
    
    Usage: flow-iam [options]
    
      init (-i)                           init the project
      sprint (-s) <name>                  create a sprint branch from master
      feature (-f) <name>                 create a feature branch from sprint
      hotfix (-hx) <name>                 create a hotfix branch from master
      fix <target_branch> <fix_branch>    create a fix branch from target_branch
    
      sprint-finish (-sf)                 finish sprint & optionally delete branch
      feature-finish (-ff)                finish feature & delete branch
    
      commit (-c) <message>               create a commit
      pr/mr                               create a pull request or merge request
    
      log (-l)                            show the log of your branch
      push (-p)                           push branch to remote
    
      install-plat-repo (-ins)            install GitHub / GitLab / Bitbucket CLI
    
      help (-h)                           show this help message
      remote (-r)                         show remote origin
      version (-v, --version)             show the version of flow-iam
    `;

  console.log(HELP_TEXT);
}

// installing platform
function installPlatform() {
  const OS = ["Mac", "Linux Ubuntu/Debian", "Linux Fedora/RHEL/CentOS"];

  const PLATFORM = ["GitHub", "GitLab", "Bitbucket"];

  const INSTALLER = {
    Mac: {
      GitHub: `brew install gh
      gh auth login
      `,
      GitLab: `brew install glab
      glab auth login
      `,
      Bitbucket: "brew install bitbucket-cli",
    },

    "Linux Ubuntu/Debian": {
      GitHub: `
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg &&
  sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
  sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  
  sudo apt update
  sudo apt install gh
        `,
      GitLab: `
  curl -s https://api.github.com/repos/profclems/glab/releases/latest \
  | grep "browser_download_url.*deb" | cut -d '"' -f 4 | wget -i -
  
  sudo dpkg -i glab_*.deb
        `,
      Bitbucket: "❌ Not officially supported",
    },

    "Linux Fedora/RHEL/CentOS": {
      GitHub: `
  sudo dnf install 'dnf-command(config-manager)'
  sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
  sudo dnf install gh
        `,
      GitLab: `
  curl -s https://api.github.com/repos/profclems/glab/releases/latest \
  | grep "browser_download_url.*rpm" | cut -d '"' -f 4 | wget -i -
  
  sudo rpm -i glab_*.rpm
        `,
      Bitbucket: "❌ Not officially supported",
    },
  };

  function showOptions(title, data) {
    console.log(`=== Choose your ${title}: ===`);
    data.forEach((val, i) => {
      console.log(`${i + 1}. ${val}`);
    });
    console.log("===========================\n");
  }

  function getChoice(input, list) {
    return list[Number(input) - 1] || null;
  }

  function handlePlatform(pChoice, osChoice) {
    const platform = getChoice(pChoice, PLATFORM);
    const os = getChoice(osChoice, OS);

    if (!platform) {
      console.log("❌ Not Available Platform");
      return;
    }

    const command = INSTALLER?.[os]?.[platform];

    console.log(`✅ ${platform} selected`);
    console.log(`🖥️ OS: ${os}\n`);

    if (!command) {
      console.log("❌ No installer available");
      return;
    }

    console.log("🚀 Run this command:\n");
    customCmd(command);
  }

  function handleOS(osChoice) {
    const os = getChoice(osChoice, OS);

    if (!os) {
      console.log("❌ Not Available OS");
      return;
    }

    console.log(`✅ ${os} Picked!\n`);

    showOptions("Platform", PLATFORM);

    prompt("👉 Choose Platform [1-3]: ", (p) => {
      handlePlatform(p, osChoice);
    });
  }

  // start
  showOptions("OS", OS);

  prompt("👉 Choose your OS [1-3]: ", (os) => {
    handleOS(os);
  });
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
    10: "Install Github/Gitlab/Bitbucket",
    11: "Exit",
    12: "Help",
  };
  console.log("🎯 Menu flow-iam:");
  for (const [key, value] of Object.entries(menu)) {
    console.log(`${key}. ${value}`);
  }
  console.log("===========================\n");
  prompt("👉 Input your choice [1-12]: ", (c) => {
    console.log(c);
    if (c == 1) prompt("Sprint/* name: ", (name) => createSprint(name));
    if (c == 2)
      prompt("Sprint/* name: ", (s) => {
        prompt("Feature/* name: ", (f) => createFeature(s, f));
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
    if (c == 7) runGit("log --oneline --graph --all --decorate");
    if (c == 8)
      prompt(
        "Target branch (develop/development/staging/master/main): ",
        (b) => {
          const branch = b.toLowerCase().trim();

          prompt("Delete branch? (y/n): ", (d) => {
            const del = d.toLowerCase().trim();
            sprintFinish(branch, del);
          });
        },
      );
    if (c == 9)
      prompt("Input finish feature target branch: ", (b) => featureFinish(b));
    if (c == 10) installPlatform();
    if (c == 11) console.log("👋 Goodbye!");
    if (c == 12) helpMessage();
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

    case "-sf":
    case "sprint-finish":
      prompt(
        "Target branch (develop/development/staging/master/main): ",
        (b) => {
          const branch = b.toLowerCase().trim();

          prompt("Delete branch? (y/n): ", (d) => {
            const del = d.toLowerCase().trim();
            sprintFinish(branch, del);
          });
        },
      );
      break;

    case "-ff":
    case "feature-finish":
      prompt("Input finish feature target branch: ", (b) => featureFinish(b));
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

    case "-ins":
    case "install-plat-repo":
      installPlatform();
      break;
    case "log":
    case "-l":
      runGit("log --oneline --graph --all --decorate");
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
