"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  detectPackageManager: () => detectPackageManager,
  generateBundle: () => generateBundle,
  generateEntryPoint: () => generateEntryPoint,
  generateInstallCommand: () => generateInstallCommand,
  generateSourceFiles: () => generateSourceFiles,
  generateUninstallCommand: () => generateUninstallCommand,
  generateWalletModulesCode: () => generateWalletModulesCode,
  installDependencies: () => installDependencies,
  loadConfig: () => loadConfig,
  uninstallDependencies: () => uninstallDependencies,
  validateDependencies: () => validateDependencies
});
module.exports = __toCommonJS(index_exports);

// src/config/loader.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));

// src/config/schema.ts
var import_ajv = __toESM(require("ajv"));
var configSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  required: ["networks"],
  properties: {
    networks: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["package"],
        properties: {
          package: { type: "string", description: "WDK wallet/protocol module name" }
        }
      },
      minProperties: 1,
      description: "Map of module keys to package name"
    },
    protocols: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["package"],
        properties: {
          package: { type: "string", description: "WDK protocol module name" }
        }
      },
      description: "Map of protocol keys to package name"
    },
    preloadModules: {
      type: "array",
      items: { type: "string" },
      description: "Modules to preload (native addons)"
    },
    output: {
      type: "object",
      properties: {
        bundle: { type: "string", description: "Output bundle path" },
        types: { type: "string", description: "Output types path" }
      }
    },
    options: {
      type: "object",
      properties: {
        minify: { type: "boolean", description: "Minify output" },
        sourceMaps: { type: "boolean", description: "Generate source maps" },
        targets: {
          type: "array",
          items: { type: "string" },
          description: "Target platforms for bare-pack"
        }
      }
    }
  }
};
var ajv = new import_ajv.default({ allErrors: true, verbose: true });
var validate = ajv.compile(configSchema);
function validateConfigSchema(config) {
  const valid = validate(config);
  if (!valid && validate.errors) {
    const errors = validate.errors.map((e) => {
      const path5 = e.instancePath || "root";
      return `  - ${path5}: ${e.message}`;
    });
    throw new Error(`Invalid configuration:
${errors.join("\n")}`);
  }
}
function validateConfig(config) {
  validateConfigSchema(config);
}

// src/constants.ts
var DEFAULT_OUTPUT_DIR = ".wdk";
var DEFAULT_BUNDLE_FILENAME = "wdk-worklet.bundle.js";
var DEFAULT_TYPES_FILENAME = "index.d.ts";
var DEFAULT_ENTRY_FILENAME = "wdk-worklet.generated.js";
var DEFAULT_BUNDLE_PATH = `./.wdk-bundle/${DEFAULT_BUNDLE_FILENAME}`;
var DEFAULT_TYPES_PATH = `./${DEFAULT_OUTPUT_DIR}/${DEFAULT_TYPES_FILENAME}`;
var DEFAULT_BUNDLE_BUILD_HOSTS = ["ios-arm64", "ios-arm64-simulator", "ios-x64-simulator", "android-arm64", "android-arm", "android-arm64", "android-ia32", "android-x64"];

// src/config/loader.ts
var CONFIG_FILES = [
  "wdk.config.js",
  "wdk.config.cjs",
  "wdk.config.mjs"
];
function findConfigFile(dir) {
  for (const filename of CONFIG_FILES) {
    const filepath = import_path.default.join(dir, filename);
    if (import_fs.default.existsSync(filepath)) {
      return filepath;
    }
  }
  return null;
}
async function loadConfigFile(filepath) {
  const ext = import_path.default.extname(filepath);
  if (ext === ".json" || filepath.endsWith(".wdkrc")) {
    const content = import_fs.default.readFileSync(filepath, "utf-8");
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Invalid JSON in config file ${filepath}: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  const resolved = require.resolve(filepath);
  delete require.cache[resolved];
  const config = require(filepath);
  return config.default || config;
}
async function loadConfig(configPath) {
  const cwd = process.cwd();
  let filepath;
  if (configPath) {
    filepath = import_path.default.resolve(cwd, configPath);
    if (!import_fs.default.existsSync(filepath)) {
      throw new Error(`Config file not found: ${filepath}`);
    }
  } else {
    const found = findConfigFile(cwd);
    if (!found) {
      throw new Error(
        `No wdk.config.js found. Run \`npx wdk-worklet-bundler init\` to create one.
Searched for: ${CONFIG_FILES.join(", ")}`
      );
    }
    filepath = found;
  }
  const config = await loadConfigFile(filepath);
  validateConfig(config);
  const projectRoot = import_path.default.dirname(filepath);
  const resolvedOutput = {
    bundle: import_path.default.resolve(
      projectRoot,
      config.output?.bundle || DEFAULT_BUNDLE_PATH
    ),
    types: import_path.default.resolve(
      projectRoot,
      config.output?.types || DEFAULT_TYPES_PATH
    )
  };
  return {
    ...config,
    configPath: filepath,
    projectRoot,
    resolvedOutput
  };
}

// src/validators/dependencies.ts
var import_fs2 = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
function resolveModule(modulePath, projectRoot) {
  if (modulePath.startsWith(".") || modulePath.startsWith("/")) {
    const absolutePath = import_path2.default.resolve(projectRoot, modulePath);
    if (import_fs2.default.existsSync(absolutePath)) {
      const pkgPath2 = import_path2.default.join(absolutePath, "package.json");
      let pkg2 = { name: import_path2.default.basename(absolutePath), version: "local" };
      if (import_fs2.default.existsSync(pkgPath2)) {
        try {
          pkg2 = JSON.parse(import_fs2.default.readFileSync(pkgPath2, "utf-8"));
        } catch {
        }
      }
      return {
        name: pkg2.name,
        path: absolutePath,
        version: pkg2.version,
        isLocal: true
      };
    }
    return null;
  }
  const nodeModulesPath = import_path2.default.join(projectRoot, "node_modules", modulePath);
  if (!import_fs2.default.existsSync(nodeModulesPath)) {
    return null;
  }
  const pkgPath = import_path2.default.join(nodeModulesPath, "package.json");
  if (!import_fs2.default.existsSync(pkgPath)) {
    return null;
  }
  let pkg;
  try {
    pkg = JSON.parse(import_fs2.default.readFileSync(pkgPath, "utf-8"));
  } catch {
    return null;
  }
  return {
    name: pkg.name,
    path: nodeModulesPath,
    version: pkg.version,
    isLocal: false
  };
}
function validateDependencies(modules, projectRoot) {
  const installed = [];
  const missing = [];
  for (const modulePath of modules) {
    const info = resolveModule(modulePath, projectRoot);
    if (info) {
      installed.push(info);
    } else {
      missing.push(modulePath);
    }
  }
  return {
    valid: missing.length === 0,
    installed,
    missing
  };
}
function detectPackageManager(projectRoot) {
  if (import_fs2.default.existsSync(import_path2.default.join(projectRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (import_fs2.default.existsSync(import_path2.default.join(projectRoot, "yarn.lock"))) {
    return "yarn";
  }
  return "npm";
}
function generateInstallCommand(missing, packageManager = "npm") {
  const packages = missing.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  if (packages.length === 0) {
    return "";
  }
  switch (packageManager) {
    case "yarn":
      return `yarn add ${packages.join(" ")}`;
    case "pnpm":
      return `pnpm add ${packages.join(" ")}`;
    default:
      return `npm install ${packages.join(" ")}`;
  }
}
function installDependencies(missing, projectRoot, options = {}) {
  const { execSync: execSync2 } = require("child_process");
  const packages = missing.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  const localPaths = missing.filter(
    (m) => m.startsWith(".") || m.startsWith("/")
  );
  if (packages.length === 0) {
    return {
      success: localPaths.length === 0,
      command: "",
      installed: [],
      failed: localPaths,
      error: localPaths.length > 0 ? `Cannot auto-install local paths: ${localPaths.join(", ")}` : void 0
    };
  }
  const packageManager = detectPackageManager(projectRoot);
  const command = generateInstallCommand(packages, packageManager);
  try {
    execSync2(command, {
      cwd: projectRoot,
      stdio: options.verbose ? "inherit" : "pipe"
    });
    return {
      success: localPaths.length === 0,
      command,
      installed: packages,
      failed: localPaths,
      error: localPaths.length > 0 ? `Cannot auto-install local paths: ${localPaths.join(", ")}` : void 0
    };
  } catch (error) {
    return {
      success: false,
      command,
      installed: [],
      failed: [...packages, ...localPaths],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function generateUninstallCommand(packages, packageManager = "npm") {
  const npmPackages = packages.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  if (npmPackages.length === 0) {
    return "";
  }
  switch (packageManager) {
    case "yarn":
      return `yarn remove ${npmPackages.join(" ")}`;
    case "pnpm":
      return `pnpm remove ${npmPackages.join(" ")}`;
    default:
      return `npm uninstall ${npmPackages.join(" ")}`;
  }
}
function uninstallDependencies(packages, projectRoot, options = {}) {
  const { execSync: execSync2 } = require("child_process");
  const npmPackages = packages.filter(
    (m) => !m.startsWith(".") && !m.startsWith("/")
  );
  if (npmPackages.length === 0) {
    return {
      success: true,
      command: "",
      removed: [],
      failed: []
    };
  }
  const packageManager = detectPackageManager(projectRoot);
  const command = generateUninstallCommand(npmPackages, packageManager);
  try {
    execSync2(command, {
      cwd: projectRoot,
      stdio: options.verbose ? "inherit" : "pipe"
    });
    return {
      success: true,
      command,
      removed: npmPackages,
      failed: []
    };
  } catch (error) {
    return {
      success: false,
      command,
      removed: [],
      failed: npmPackages,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// src/bundler/index.ts
var import_fs4 = __toESM(require("fs"));
var import_path4 = __toESM(require("path"));
var import_child_process = require("child_process");

// src/generators/entry.ts
var import_fs3 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));

// src/generators/wallet-modules.ts
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function toVarName(pkg) {
  const clean = pkg.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "_");
  return clean.split("_").map(capitalize).join("");
}
function generateWalletModulesCode(config) {
  const lines = [];
  if (config.preloadModules?.length) {
    lines.push("// Preload modules");
    for (const mod of config.preloadModules) {
      lines.push(`require('${mod}');`);
    }
    lines.push("");
  }
  lines.push("// Load WDK core");
  lines.push(`const wdkModule = require('@tetherto/wdk', { with: { imports: 'bare-node-runtime/imports' }});`);
  lines.push("const WDK = wdkModule.default || wdkModule.WDK || wdkModule;");
  lines.push("");
  lines.push("// Load wallet modules");
  const packages = /* @__PURE__ */ new Map();
  for (const networkConfig of Object.values(config.networks)) {
    const pkg = networkConfig.package;
    if (!packages.has(pkg)) {
      packages.set(pkg, toVarName(pkg));
    }
  }
  for (const [pkgPath, varName] of packages) {
    lines.push(`const ${varName}Raw = require('${pkgPath}', { with: { imports: 'bare-node-runtime/imports' }});`);
    lines.push(`const ${varName} = ${varName}Raw.default || ${varName}Raw;`);
  }
  lines.push("");
  lines.push("// Map networks to wallet managers");
  lines.push("const walletManagers = {};");
  for (const [networkName, networkConfig] of Object.entries(config.networks)) {
    const pkg = networkConfig.package;
    const varName = packages.get(pkg);
    lines.push(`walletManagers['${networkName}'] = ${varName};`);
  }
  return lines.join("\n");
}

// src/generators/protocol-modules.ts
function capitalize2(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function toVarName2(pkg) {
  const clean = pkg.replace(/^@[^/]+\//, "").replace(/[^a-zA-Z0-9]/g, "_");
  return clean.split("_").map(capitalize2).join("");
}
function generateProtocolModulesCode(config) {
  if (!config.protocols) {
    return "// No protocols configured";
  }
  const lines = [];
  lines.push("// Load protocol modules");
  const packages = /* @__PURE__ */ new Map();
  for (const protocolConfig of Object.values(config.protocols)) {
    const pkg = protocolConfig.package;
    if (!packages.has(pkg)) {
      packages.set(pkg, toVarName2(pkg));
    }
  }
  for (const [pkgPath, varName] of packages) {
    lines.push(`const ${varName}Raw = require('${pkgPath}', { with: { imports: 'bare-node-runtime/imports' }});`);
    lines.push(`const ${varName} = ${varName}Raw.default || ${varName}Raw;`);
  }
  lines.push("");
  lines.push("// Map protocols to protocol managers");
  lines.push("const protocolManagers = {};");
  for (const [protocolName, protocolConfig] of Object.entries(config.protocols)) {
    const pkg = protocolConfig.package;
    const varName = packages.get(pkg);
    lines.push(`protocolManagers['${protocolName}'] = ${varName};`);
  }
  return lines.join("\n");
}

// src/generators/entry.ts
async function generateEntryPoint(config, outputDir) {
  const walletModulesCode = generateWalletModulesCode(config);
  const protocolModulesCode = generateProtocolModulesCode(config);
  const entryCode = `
// Auto-generated by @tetherto/wdk-worklet-bundler
// Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}
// DO NOT EDIT MANUALLY

// Handle unhandled promise rejections and exceptions
if (typeof Bare !== 'undefined' && Bare.on) {
  Bare.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection in worklet:', error);
  })
  Bare.on('uncaughtException', (error) => {
    console.error('Uncaught exception in worklet:', error);
  })
}

require('bare-node-runtime/global');

const { IPC: BareIPC } = BareKit
const { HRPC, registerRpcHandlers, utils } = require('@tetherto/pear-wrk-wdk/worklet', { with: { imports: 'bare-node-runtime/imports' }});
const { logger } = utils;

// ============================================================
// WALLET MODULES (Generated from config)
// ============================================================
${walletModulesCode}

// ============================================================
// PROTOCOL MODULES (Generated from config)
// ============================================================
${protocolModulesCode}

const rpc = new HRPC(BareIPC);

let wdk = null;

const context = {
  wdk,
  WDK,
  walletManagers,
  protocolManagers: typeof protocolManagers !== 'undefined' ? protocolManagers : {},
  wdkLoadError: null
}

registerRpcHandlers(rpc, context);
logger.info('Worklet started');
`.trim();
  await import_fs3.default.promises.mkdir(outputDir, { recursive: true });
  const entryPath = import_path3.default.join(outputDir, DEFAULT_ENTRY_FILENAME);
  await import_fs3.default.promises.writeFile(entryPath, entryCode, "utf-8");
  return entryPath;
}

// src/bundler/index.ts
function runBarePack(options) {
  const { entryPath, outputPath, importsPath, targets, cwd, verbose } = options;
  const args = ["--no-install", "bare-pack"];
  for (const target of targets) {
    if (!/^[a-z0-9-]+$/i.test(target)) {
      throw new Error(`Invalid target format: ${target}`);
    }
    args.push("--host", target);
  }
  args.push("--linked", "--imports", importsPath, "--out", outputPath, entryPath);
  if (verbose) {
    console.log(`  Running: npx ${args.join(" ")}`);
    console.log(`  CWD: ${cwd}`);
  }
  try {
    (0, import_child_process.execSync)(`npx ${args.join(" ")}`, {
      cwd,
      stdio: verbose ? "inherit" : "pipe"
    });
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : "";
    const stdout = error.stdout ? error.stdout.toString() : "";
    const output = stderr + stdout;
    const match = output.match(/MODULE_NOT_FOUND: Cannot find module '(.+?)'/);
    if (match && match[1]) {
      const missingModule = match[1];
      const err = new Error(`Missing module: ${missingModule}`);
      err.missingModule = missingModule;
      throw err;
    }
    throw error;
  }
}
function generateImportsFile(outputDir) {
  const imports = {};
  const importsPath = import_path4.default.join(outputDir, "pack.imports.json");
  import_fs4.default.writeFileSync(importsPath, JSON.stringify(imports, null, 2));
  return importsPath;
}
function generateIndexFile(outputDir) {
  const indexContent = `/**
 * WDK Bundle Exports
 * Generated by @tetherto/wdk-worklet-bundler
 */

const bundle = require('./${DEFAULT_BUNDLE_FILENAME}');

module.exports = {
  bundle
};
`;
  const indexPath = import_path4.default.join(outputDir, "index.js");
  import_fs4.default.writeFileSync(indexPath, indexContent);
}
function getDefaultHosts() {
  return DEFAULT_BUNDLE_BUILD_HOSTS;
}
async function generateBundle(config, options = {}) {
  const startTime = Date.now();
  const { dryRun, verbose, silent } = options;
  const log = (msg) => {
    if (!silent) console.log(msg);
  };
  const generatedDir = import_path4.default.join(config.projectRoot, DEFAULT_OUTPUT_DIR);
  if (dryRun) {
    log("Dry run - would generate:");
    log(`  Output dir: ${generatedDir}`);
    log(`  Entry: ${generatedDir}/wdk-worklet.generated.js`);
    log(`  HRPC: ${generatedDir}/hrpc/`);
    log(`  Schema: ${generatedDir}/schema/`);
    log(`  Bundle: ${config.resolvedOutput.bundle}`);
    if (!options.skipTypes) {
      log(`  Types: ${config.resolvedOutput.types}`);
    }
    return {
      success: true,
      bundlePath: config.resolvedOutput.bundle,
      typesPath: config.resolvedOutput.types,
      bundleSize: 0,
      duration: Date.now() - startTime
    };
  }
  try {
    import_fs4.default.mkdirSync(generatedDir, { recursive: true });
    import_fs4.default.mkdirSync(import_path4.default.dirname(config.resolvedOutput.bundle), { recursive: true });
    let entryPath;
    let importsPath;
    if (options.skipGeneration) {
      if (verbose) log("  Skipping artifact generation, using existing files...");
      entryPath = import_path4.default.join(generatedDir, DEFAULT_ENTRY_FILENAME);
      importsPath = import_path4.default.join(generatedDir, "pack.imports.json");
      if (!import_fs4.default.existsSync(entryPath)) {
        throw new Error(`Artifacts not found at ${entryPath}. Run without --skip-generation first.`);
      }
      if (!import_fs4.default.existsSync(importsPath)) {
        throw new Error(`Artifacts not found at ${importsPath}. Run without --skip-generation first.`);
      }
    } else {
      if (verbose) log("  Using HRPC bindings from @tetherto/pear-wrk-wdk");
      if (verbose) log("  Generating worklet entry point...");
      entryPath = await generateEntryPoint(config, generatedDir);
      if (verbose) log(`    Entry: ${entryPath}`);
      if (verbose) log("  Generating imports file...");
      importsPath = generateImportsFile(generatedDir);
    }
    if (verbose) log("  Running bare-pack...");
    const targets = config.options?.targets || getDefaultHosts();
    try {
      runBarePack({
        entryPath,
        outputPath: config.resolvedOutput.bundle,
        importsPath,
        targets,
        cwd: config.projectRoot,
        verbose
      });
    } catch (barePackError) {
      if (barePackError.missingModule) {
        return {
          success: false,
          bundlePath: config.resolvedOutput.bundle,
          typesPath: config.resolvedOutput.types,
          bundleSize: 0,
          duration: Date.now() - startTime,
          error: `Missing module: ${barePackError.missingModule}`,
          missingModule: barePackError.missingModule
        };
      }
      const errorMsg = barePackError instanceof Error ? barePackError.message : String(barePackError);
      return {
        success: false,
        bundlePath: config.resolvedOutput.bundle,
        typesPath: config.resolvedOutput.types,
        bundleSize: 0,
        duration: Date.now() - startTime,
        error: `bare-pack failed: ${errorMsg}

This usually means:
  1. WDK modules are not installed in the project
  2. A dependency uses Node.js APIs not available in Bare runtime

Generated files are available at:
  Entry: ${entryPath}
You can run bare-pack manually once dependencies are resolved.`
      };
    }
    let bundleSize = 0;
    if (import_fs4.default.existsSync(config.resolvedOutput.bundle)) {
      bundleSize = import_fs4.default.statSync(config.resolvedOutput.bundle).size;
    }
    if (!options.skipTypes) {
      if (verbose) log("  Generating TypeScript declarations...");
      await generateTypeDeclarations(config);
    }
    if (verbose) log("  Generating index.js...");
    generateIndexFile(generatedDir);
    return {
      success: true,
      bundlePath: config.resolvedOutput.bundle,
      typesPath: config.resolvedOutput.types,
      bundleSize,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      bundlePath: config.resolvedOutput.bundle,
      typesPath: config.resolvedOutput.types,
      bundleSize: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function generateTypeDeclarations(config) {
  const generatedDir = import_path4.default.join(config.projectRoot, ".wdk");
  const indexDtsPath = import_path4.default.join(generatedDir, "index.d.ts");
  import_fs4.default.mkdirSync(generatedDir, { recursive: true });
  const networks = Object.keys(config.networks);
  const protocols = config.protocols ? Object.keys(config.protocols) : [];
  const declarations = `
/**
 * WDK Bundle TypeScript Declarations
 * Generated by @tetherto/wdk-worklet-bundler
 * Generated at: ${(/* @__PURE__ */ new Date()).toISOString()}
 */

export type NetworkName = ${networks.map((n) => `'${n}'`).join(" | ")};
export type ProtocolName = ${protocols.length ? protocols.map((n) => `'${n}'`).join(" | ") : "never"};

export const bundle: string;
`;
  import_fs4.default.writeFileSync(indexDtsPath, declarations);
}
async function generateSourceFiles(config, options = {}) {
  const generatedDir = import_path4.default.join(config.projectRoot, DEFAULT_OUTPUT_DIR);
  if (options.verbose) console.log("  Generating worklet entry point...");
  const entryPath = await generateEntryPoint(config, generatedDir);
  generateImportsFile(generatedDir);
  generateIndexFile(generatedDir);
  return {
    entryPath
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectPackageManager,
  generateBundle,
  generateEntryPoint,
  generateInstallCommand,
  generateSourceFiles,
  generateUninstallCommand,
  generateWalletModulesCode,
  installDependencies,
  loadConfig,
  uninstallDependencies,
  validateDependencies
});
