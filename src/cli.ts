#!/usr/bin/env node

/**
 * WDK Bundle CLI
 */

import { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { DEFAULT_BUNDLE_BUILD_HOSTS, DEFAULT_BUNDLE_PATH, DEFAULT_TYPES_PATH } from './constants'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json')

const program = new Command()

program.name('wdk-worklet-bundler').description('CLI tool for generating WDK worklet bundles').version(pkg.version)

// Helper to extract unique package names from config
function getPackageList(config: any): string[] {
  const packages = new Set<string>()
  
  // Add core (always required implicitly, unless overriden/preloaded logic changes)
  // For validation, we should probably check it.
  packages.add('@tetherto/wdk')

  if (config.networks) {
    for (const net of Object.values(config.networks) as any[]) {
      if (net.package) packages.add(net.package)
    }
  }

  if (config.preloadModules) {
    for (const mod of config.preloadModules) {
      packages.add(mod)
    }
  }

  return Array.from(packages)
}

program
  .command('generate')
  .description('Generate WDK bundle from configuration')
  .option('-c, --config <path>', 'Path to config file')
  .option('--install', 'Auto-install missing dependencies')
  .option('--cleanup', 'Remove installed dependencies after bundle is created (use with --install)')
  .option('--dry-run', 'Show what would be generated without building')
  .option('-v, --verbose', 'Show verbose output')
  .option('--no-types', 'Skip TypeScript declaration generation')
  .option('--source-only', 'Only generate source files (skip bare-pack)')
  .action(async (options) => {
    const { loadConfig } = await import('./config/loader')
    const { validateDependencies, installDependencies, uninstallDependencies } = await import('./validators/dependencies')
    const { generateBundle, generateSourceFiles } = await import('./bundler')

    // Track packages installed by --install for potential cleanup
    let installedPackages: string[] = []

    try {
      console.log('\n🔍 Reading configuration...\n')
      const config = await loadConfig(options.config)
      console.log(`  Config: ${config.configPath}`)

      console.log('\n📦 Checking dependencies...\n')
      const requiredPackages = getPackageList(config)
      let validation = validateDependencies(requiredPackages, config.projectRoot)

      for (const mod of validation.installed) {
        const version = mod.isLocal ? 'local' : `v${mod.version}`
        console.log(`  ✓ ${mod.name} (${version})`)
      }

      for (const mod of validation.missing) {
        console.log(`  ✗ ${mod} — NOT INSTALLED`)
      }

      // Auto-install missing dependencies if --install flag is set
      if (!validation.valid && options.install) {
        console.log('\n📥 Installing missing dependencies...\n')

        const installResult = installDependencies(validation.missing, config.projectRoot, {
          verbose: options.verbose,
        })

        if (installResult.command) {
          console.log(`  Running: ${installResult.command}\n`)
        }

        if (installResult.installed.length > 0) {
          for (const pkg of installResult.installed) {
            console.log(`  ✓ Installed ${pkg}`)
          }
          // Track installed packages for potential cleanup
          installedPackages = installResult.installed
        }

        if (installResult.failed.length > 0) {
          for (const pkg of installResult.failed) {
            console.log(`  ✗ Failed to install ${pkg}`)
          }
        }

        if (installResult.error && installResult.installed.length === 0) {
          console.log(`\n❌ Installation failed: ${installResult.error}\n`)
          process.exit(1)
        }

        // Re-validate after installation
        validation = validateDependencies(requiredPackages, config.projectRoot)

        if (!validation.valid && !options.sourceOnly) {
          console.log('\n❌ Some dependencies are still missing after installation\n')
          for (const mod of validation.missing) {
            console.log(`  ✗ ${mod}`)
          }
          process.exit(1)
        }
      } else if (!validation.valid && !options.sourceOnly) {
        console.log('\n❌ Cannot generate bundle: missing dependencies\n')
        console.log(`  Run: npm install ${validation.missing.join(' ')}\n`)
        console.log('  Or use --install to auto-install missing dependencies\n')
        console.log('  Or use --source-only to generate source files without bundling\n')
        process.exit(1)
      }

      console.log('\n🌐 Networks configured:\n')
      for (const [name, cfg] of Object.entries(config.networks)) {
        console.log(`  ├── ${name} (${cfg.package})`)
      }

      if (options.sourceOnly) {
        console.log('\n🔧 Generating source files (source-only mode)...\n')

        const result = await generateSourceFiles(config, {
          verbose: options.verbose,
        })

        console.log('\n✅ Source files generated successfully!\n')
        console.log(`  Entry: ${result.entryPath}`)
        console.log('Run bare-pack manually to create the final bundle.\n')
        return
      }

      console.log('\n🔧 Building bundle...\n')

      const result = await generateBundle(config, {
        dryRun: options.dryRun,
        verbose: options.verbose,
        skipTypes: !options.types,
      })

      if (!result.success) {
        console.log(`\n❌ Bundle generation failed:\n`)
        console.log(result.error)
        process.exit(1)
      }

      const sizeKB = (result.bundleSize / 1024).toFixed(1)
      const duration = (result.duration / 1000).toFixed(2)

      console.log('\n✅ Bundle generated successfully!\n')
      console.log(`  Bundle: ${result.bundlePath} (${sizeKB} KB)`)
      if (options.types !== false) {
        console.log(`  Types: ${result.typesPath}`)
      }
      console.log(`  Duration: ${duration}s\n`)

      // Cleanup installed dependencies if --cleanup flag is set
      if (options.cleanup && installedPackages.length > 0) {
        console.log('🧹 Cleaning up installed dependencies...\n')

        const uninstallResult = uninstallDependencies(installedPackages, config.projectRoot, {
          verbose: options.verbose,
        })

        if (uninstallResult.command) {
          console.log(`  Running: ${uninstallResult.command}\n`)
        }

        if (uninstallResult.removed.length > 0) {
          for (const pkg of uninstallResult.removed) {
            console.log(`  ✓ Removed ${pkg}`)
          }
          console.log('')
        }

        if (!uninstallResult.success) {
          console.log(`\n⚠️  Cleanup warning: ${uninstallResult.error}\n`)
        }
      } else if (options.cleanup && installedPackages.length === 0) {
        console.log('ℹ️  No dependencies to clean up (nothing was installed by --install)\n')
      }
    } catch (error) {
      console.error('\n❌ Error:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('init')
  .description('Create a new wdk.config.js file')
  .option('--from-pear-wrk-wdk <path>', 'Migrate from existing pear-wrk-wdk setup')
  .option('-y, --yes', 'Use defaults without prompting')
  .action(async (options) => {
    const configPath = path.join(process.cwd(), 'wdk.config.js')

    if (fs.existsSync(configPath) && !options.yes) {
      console.log('\n⚠️  wdk.config.js already exists.\n')
      console.log('  Use --yes to overwrite.\n')
      process.exit(1)
    }

    if (options.fromPearWrkWdk) {
      const sourcePath = path.resolve(options.fromPearWrkWdk)
      const schemaPath = path.join(sourcePath, 'schema.json')

      if (!fs.existsSync(schemaPath)) {
        console.error(`\n❌ schema.json not found at ${schemaPath}\n`)
        process.exit(1)
      }

      try {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
        const walletModules = schema.config?.walletModules || {}
        const preloadModules = schema.config?.preloadModules || []

        const networks: Record<string, any> = {}

        for (const [key, cfg] of Object.entries(walletModules) as [
          string,
          { modulePath: string; networks: string[] }
        ][]) {
          for (const network of cfg.networks) {
            networks[network] = {
              package: cfg.modulePath
            }
          }
        }

        const configContent = generateConfigTemplate(networks, preloadModules)
        fs.writeFileSync(configPath, configContent)

        console.log('\n✅ Created wdk.config.js from pear-wrk-wdk schema\n')
      } catch (error) {
        console.error('\n❌ Failed to migrate:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    } else {
      const defaultNetworks = {
        ethereum: {
          package: '@tetherto/wdk-wallet-evm-erc-4337'
        },
      }

      const configContent = generateConfigTemplate(defaultNetworks, [])
      fs.writeFileSync(configPath, configContent)

      console.log('\n✅ Created wdk.config.js\n')
      console.log('  Edit the file to configure your networks and modules.\n')
    }
  })

program
  .command('validate')
  .description('Validate configuration without building')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const { loadConfig } = await import('./config/loader')
    const { validateDependencies } = await import('./validators/dependencies')

    try {
      console.log('\n🔍 Validating configuration...\n')

      const config = await loadConfig(options.config)
      console.log(`  ✓ Config file valid: ${config.configPath}`)

      const requiredPackages = getPackageList(config)
      const validation = validateDependencies(requiredPackages, config.projectRoot)

      console.log('\n📦 Dependencies:\n')
      for (const mod of validation.installed) {
        console.log(`  ✓ ${mod.name}`)
      }
      for (const mod of validation.missing) {
        console.log(`  ✗ ${mod} — NOT INSTALLED`)
      }

      if (validation.valid) {
        console.log('\n✅ Configuration is valid and ready to build!\n')
      } else {
        console.log('\n⚠️  Missing dependencies. Install them before building.\n')
        process.exit(1)
      }
    } catch (error) {
      console.error('\n❌ Validation failed:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

program
  .command('list-modules')
  .description('List available WDK modules')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const modules = [
      { name: '@tetherto/wdk', description: 'WDK Core', required: true },
      { name: '@tetherto/wdk-wallet-evm', description: 'EVM chains (EOA)' },
      { name: '@tetherto/wdk-wallet-evm-erc-4337', description: 'EVM with Account Abstraction' },
      { name: '@tetherto/wdk-wallet-btc', description: 'Bitcoin' },
      { name: '@tetherto/wdk-wallet-spark', description: 'Spark (Lightning)' },
      { name: '@tetherto/wdk-wallet-ton', description: 'TON' },
      { name: '@tetherto/wdk-wallet-solana', description: 'Solana' },
    ]

    if (options.json) {
      console.log(JSON.stringify(modules, null, 2))
      return
    }

    console.log('\n📦 Available WDK Modules\n')
    for (const mod of modules) {
      const badge = mod.required ? ' [required]' : ''
      console.log(`  ${mod.name}${badge}`)
      console.log(`    ${mod.description}\n`)
    }
  })

program
  .command('clean')
  .description('Remove generated .wdk folder')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    const wdkDir = path.join(process.cwd(), '.wdk')

    if (!fs.existsSync(wdkDir)) {
      console.log('\n✓ Nothing to clean - .wdk folder does not exist\n')
      return
    }

    if (!options.yes) {
      const readline = await import('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })

      const answer = await new Promise<string>((resolve) => {
        rl.question('\n⚠️  This will delete the .wdk folder. Continue? [y/N] ', resolve)
      })
      rl.close()

      if (answer.toLowerCase() !== 'y') {
        console.log('\n  Cancelled.\n')
        return
      }
    }

    try {
      fs.rmSync(wdkDir, { recursive: true, force: true })
      console.log('\n✓ Removed .wdk folder\n')
    } catch (error) {
      console.error('\n❌ Failed to remove .wdk folder:', error instanceof Error ? error.message : error)
      process.exit(1)
    }
  })

/**
 * Generate config template
 */
function generateConfigTemplate(
  networks: Record<string, any>,
  preloadModules: string[]
): string {
  const networksStr = Object.entries(networks)
    .map(([key, value]) => {
      // Clean value to be just package
      const pkg = value.package || value
      return `    ${key}: { package: '${pkg}' }`
    })
    .join(',\n')

  const preloadStr =
    preloadModules.length > 0 ? `  preloadModules: [\n    '${preloadModules.join("',\n    '")}'\n  ],\n` : ''

  return `/**
 * WDK Bundle Configuration
 * Generated by @tetherto/wdk-worklet-bundler
 *
 * For documentation see: https://github.com/tetherto/wdk-worklet-bundler
 */

module.exports = {
  // Network mappings
  // Map logical network names to WDK wallet packages
  networks: {
${networksStr}
  },

${preloadStr}  // Output paths (optional, defaults shown)
  output: {
    bundle: '${DEFAULT_BUNDLE_PATH}',
    types: '${DEFAULT_TYPES_PATH}'
  },

  // Build options (optional)
  options: {
    // minify: false,
    // sourceMaps: false,
    targets: ${DEFAULT_BUNDLE_BUILD_HOSTS}
  }
};
`
}

program.parse()
