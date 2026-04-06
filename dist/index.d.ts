/**
 * Configuration types for wdk-worklet-bundler
 */
interface WdkBundleConfig {
    /** Module definitions: key -> package path */
    networks: {
        [networkName: string]: {
            package: string;
        };
    };
    /** Protocol definitions: key -> package path */
    protocols?: {
        [protocolName: string]: {
            package: string;
            [key: string]: any;
        };
    };
    /** Modules to preload (native addons like spark-frost-bare-addon) */
    preloadModules?: string[];
    /** Output paths */
    output?: {
        bundle?: string;
        types?: string;
    };
    /** Build options */
    options?: {
        minify?: boolean;
        sourceMaps?: boolean;
        targets?: string[];
    };
}
interface ResolvedConfig extends WdkBundleConfig {
    /** Absolute path to config file */
    configPath: string;
    /** Absolute path to project root */
    projectRoot: string;
    /** Resolved output paths (absolute) */
    resolvedOutput: {
        bundle: string;
        types: string;
    };
}

/**
 * Configuration loader
 */

declare function loadConfig(configPath?: string): Promise<ResolvedConfig>;

interface ModuleInfo {
    name: string;
    path: string;
    version: string;
    isLocal: boolean;
}
interface ValidationResult {
    valid: boolean;
    installed: ModuleInfo[];
    missing: string[];
}
declare function validateDependencies(modules: string[], projectRoot: string): ValidationResult;
declare function detectPackageManager(projectRoot: string): 'npm' | 'yarn' | 'pnpm';
declare function generateInstallCommand(missing: string[], packageManager?: 'npm' | 'yarn' | 'pnpm'): string;
interface InstallResult {
    success: boolean;
    command: string;
    installed: string[];
    failed: string[];
    error?: string;
}
interface UninstallResult {
    success: boolean;
    command: string;
    removed: string[];
    failed: string[];
    error?: string;
}
declare function installDependencies(missing: string[], projectRoot: string, options?: {
    verbose?: boolean;
}): InstallResult;
declare function generateUninstallCommand(packages: string[], packageManager?: 'npm' | 'yarn' | 'pnpm'): string;
declare function uninstallDependencies(packages: string[], projectRoot: string, options?: {
    verbose?: boolean;
}): UninstallResult;

/**
 * Bundle generator
 * Orchestrates the full bundle generation process
 */

interface GenerateBundleOptions {
    dryRun?: boolean;
    verbose?: boolean;
    silent?: boolean;
    skipTypes?: boolean;
    skipGeneration?: boolean;
}
interface GenerateBundleResult {
    success: boolean;
    bundlePath: string;
    typesPath: string;
    bundleSize: number;
    duration: number;
    error?: string;
    missingModule?: string;
}
/**
 * Generate WDK bundle from configuration
 */
declare function generateBundle(config: ResolvedConfig, options?: GenerateBundleOptions): Promise<GenerateBundleResult>;
/**
 * Generate only the entry point
 * Useful for debugging or custom bundling workflows
 */
declare function generateSourceFiles(config: ResolvedConfig, options?: {
    verbose?: boolean;
}): Promise<{
    entryPath: string;
}>;

declare function generateEntryPoint(config: ResolvedConfig, outputDir: string): Promise<string>;

/**
 * Wallet modules code generator
 */

/**
 * Generate wallet modules code section
 */
declare function generateWalletModulesCode(config: ResolvedConfig): string;

export { type GenerateBundleOptions, type GenerateBundleResult, type InstallResult, type ModuleInfo, type ResolvedConfig, type UninstallResult, type ValidationResult, type WdkBundleConfig, detectPackageManager, generateBundle, generateEntryPoint, generateInstallCommand, generateSourceFiles, generateUninstallCommand, generateWalletModulesCode, installDependencies, loadConfig, uninstallDependencies, validateDependencies };
