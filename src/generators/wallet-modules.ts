/**
 * Wallet modules code generator
 */

import type { ResolvedConfig } from '../config/types'

/**
 * Capitalize first letter
 */
function capitalize (str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert module key to variable name
 */
function toVarName (pkg: string): string {
  // Remove scope (@scope/), split by non-alphanumeric, camelCase
  const clean = pkg.replace(/^@[^/]+\//, '').replace(/[^a-zA-Z0-9]/g, '_')
  return clean.split('_').map(capitalize).join('')
}

/**
 * Generate wallet modules code section
 */
export function generateWalletModulesCode (config: ResolvedConfig): string {
  const lines: string[] = []

  if (config.preloadModules?.length) {
    lines.push('// Preload modules')
    for (const mod of config.preloadModules) {
      lines.push(`require('${mod}');`)
    }
    lines.push('')
  }

  lines.push('// Load WDK core')
  lines.push('const wdkModule = require(\'@tetherto/wdk\', { with: { imports: \'bare-node-runtime/imports\' }});')
  lines.push('const WDK = wdkModule.default || wdkModule.WDK || wdkModule;')
  lines.push('')

  lines.push('// Load wallet modules')

  const packages = new Map<string, string>()

  for (const networkConfig of Object.values(config.networks)) {
    const pkg = networkConfig.package
    if (!packages.has(pkg)) {
      packages.set(pkg, toVarName(pkg))
    }
  }

  for (const [pkgPath, varName] of packages) {
    lines.push(`const ${varName}Raw = require('${pkgPath}', { with: { imports: 'bare-node-runtime/imports' }});`)
    lines.push(`const ${varName} = ${varName}Raw.default || ${varName}Raw;`)
  }
  lines.push('')

  lines.push('// Map networks to wallet managers')
  lines.push('const walletManagers = {};')

  for (const [networkName, networkConfig] of Object.entries(config.networks)) {
    const pkg = networkConfig.package
    const varName = packages.get(pkg)
    lines.push(`walletManagers['${networkName}'] = ${varName};`)
  }

  return lines.join('\n')
}
