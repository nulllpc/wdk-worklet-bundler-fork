# @tetherto/wdk-worklet-bundler

CLI tool for generating WDK worklet bundles. This tool acts as a "Chef" that takes your specific "ingredients" (WDK Modules) and cooks them into a single, optimized bundle for your React Native application.

## Installation

```bash
npm install -g @tetherto/wdk-worklet-bundler
# or run directly
npx @tetherto/wdk-worklet-bundler
```

## Quick Start

1.  **Initialize** a configuration in your React Native project:
    ```bash
    wdk-worklet-bundler init
    ```

2.  **Configure** your networks in `wdk.config.js`:
    ```javascript
    module.exports = {
      networks: {
        ethereum: {
          package: '@tetherto/wdk-wallet-evm-erc-4337'
        },
        bitcoin: {
          package: '@tetherto/wdk-wallet-btc'
        }
      }
    };
    ```

3.  **Generate** the bundle:
    ```bash
    # Automatically installs missing WDK modules to your devDependencies
    wdk-worklet-bundler generate --install
    ```

4.  **Use** it in your App:
    ```typescript
    import { bundle, HRPC } from './.wdk'; // Default output location
    
    // Pass to your WdkAppProvider or worklet loader
    ```

## Architecture

*   **Bundler (The Chef):** A build tool that doesn't hold logic itself. It orchestrates the creation of the worklet bundle.
*   **Modules (The Ingredients):** Standalone packages (e.g., `@tetherto/wdk-wallet-btc`) that implement specific blockchain logic.
*   **Core (`@tetherto/pear-wrk-wdk`):** The runtime library that powers the worklet's communication (HRPC).

We recommend installing all WDK modules and the core library as **`devDependencies`** to keep your application bundle clean. The bundler compiles them into a separate artifact.

## Commands

### `generate`
Builds the worklet bundle.

```bash
wdk-worklet-bundler generate [options]
```

**Options:**
*   `--install`: Automatically install missing modules listed in your config (saves to `devDependencies`).
*   `--keep-artifacts`: Keep the intermediate `.wdk/` folder (useful for debugging generated source code). By default, this is cleaned up.
*   `--source-only`: Generate the entry files but skip the final `bare-pack` bundling step.
*   `--dry-run`: Print what would happen without writing files.
*   `--no-types`: Skip generating TypeScript definitions (`index.d.ts`).

### `init`
Creates a fresh `wdk.config.js` file.

```bash
wdk-worklet-bundler init

```

### `validate`
Checks if your configuration is valid and if all required dependencies are installed.

```bash
wdk-worklet-bundler validate
```

## Configuration Reference (`wdk.config.js`)

```javascript
module.exports = {
  // Map logical network names to WDK wallet packages
  networks: {
    ethereum: { 
      package: '@tetherto/wdk-wallet-evm-erc-4337' 
    },
    local_dev: {
      package: './local-packages/my-custom-wallet' // Local paths supported
    }
  },

  // Map logical protocol names to WDK protocol packages
  protocols: {
    aaveEvm: {
      package: '@tetherto/wdk-protocol-aave-lending-evm'
    }
  },

  // Native addons to preload (e.g. for specific crypto requirements)
  preloadModules: [
    'spark-frost-bare-addon'
  ],

  // Customize output locations
  output: {
    bundle: './.wdk-bundle/wdk-worklet.bundle.js',
    types: './.wdk/index.d.ts'
  },

  // Build options
  options: {
    targets: ['ios-arm64', 'android-arm64'] // bare-pack targets
  }
};
```

## Troubleshooting

**"Module not found" during generation:**
Run `wdk-worklet-bundler generate --install`. This ensures all packages defined in your config (plus the core `@tetherto/pear-wrk-wdk`) are present in your `node_modules`.

**"Missing dependency" inside the worklet:**
If you see runtime errors about missing modules inside the worklet, ensure `pear-wrk-wdk` is properly installed. The bundler treats it as an external dependency that must be present.

## License

Apache-2.0