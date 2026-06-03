import fs from 'fs'
import path from 'path'
import os from 'os'
import { resolveModule } from '../../src/validators/dependencies'

describe('Monorepo Support', () => {
  let rootDir: string
  let subProjectDir: string

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wdk-monorepo-test-'))
    subProjectDir = path.join(rootDir, 'packages', 'sub-project')
    fs.mkdirSync(subProjectDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true })
  })

  it('should resolve module in parent node_modules (recursive lookup)', () => {
    const moduleName = '@tetherto/wdk'
    const parentNodeModules = path.join(rootDir, 'node_modules', moduleName)
    fs.mkdirSync(parentNodeModules, { recursive: true })
    fs.writeFileSync(
      path.join(parentNodeModules, 'package.json'),
      JSON.stringify({ name: moduleName, version: '1.0.0' })
    )

    const result = resolveModule(moduleName, subProjectDir)
    expect(result).not.toBeNull()
    expect(result?.name).toBe(moduleName)
    expect(result?.path).toBe(parentNodeModules)
  })

  it('should resolve module multiple levels up', () => {
    const moduleName = '@tetherto/wdk'
    const deepSubProject = path.join(subProjectDir, 'a', 'b', 'c')
    fs.mkdirSync(deepSubProject, { recursive: true })
    
    const parentNodeModules = path.join(rootDir, 'node_modules', moduleName)
    fs.mkdirSync(parentNodeModules, { recursive: true })
    fs.writeFileSync(
      path.join(parentNodeModules, 'package.json'),
      JSON.stringify({ name: moduleName, version: '1.0.0' })
    )

    const result = resolveModule(moduleName, deepSubProject)
    expect(result).not.toBeNull()
    expect(result?.path).toBe(parentNodeModules)
  })

  it('should resolve module via explicit absolute nodeModulesPath', () => {
    const moduleName = '@tetherto/wdk'
    const customNodeModulesDir = path.join(rootDir, 'custom_modules')
    const modulePath = path.join(customNodeModulesDir, moduleName)
    
    fs.mkdirSync(modulePath, { recursive: true })
    fs.writeFileSync(
      path.join(modulePath, 'package.json'),
      JSON.stringify({ name: moduleName, version: '2.0.0' })
    )

    const result = resolveModule(moduleName, subProjectDir, customNodeModulesDir)
    expect(result).not.toBeNull()
    expect(result?.version).toBe('2.0.0')
    expect(result?.path).toBe(modulePath)
  })

  it('should resolve module via explicit relative nodeModulesPath', () => {
    const moduleName = '@tetherto/wdk'
    const relativePath = '../../custom_modules'
    const customNodeModulesDir = path.join(rootDir, 'custom_modules')
    const modulePath = path.join(customNodeModulesDir, moduleName)
    
    fs.mkdirSync(modulePath, { recursive: true })
    fs.writeFileSync(
      path.join(modulePath, 'package.json'),
      JSON.stringify({ name: moduleName, version: '3.0.0' })
    )

    const result = resolveModule(moduleName, subProjectDir, relativePath)
    expect(result).not.toBeNull()
    expect(result?.version).toBe('3.0.0')
  })

  it('should prioritize explicit nodeModulesPath over recursive lookup', () => {
    const moduleName = '@tetherto/wdk'
    
    const parentNodeModules = path.join(rootDir, 'node_modules', moduleName)
    fs.mkdirSync(parentNodeModules, { recursive: true })
    fs.writeFileSync(
      path.join(parentNodeModules, 'package.json'),
      JSON.stringify({ name: moduleName, version: '1.0.0' })
    )

    const customNodeModulesDir = path.join(rootDir, 'custom_modules')
    const customModulePath = path.join(customNodeModulesDir, moduleName)
    fs.mkdirSync(customModulePath, { recursive: true })
    fs.writeFileSync(
      path.join(customModulePath, 'package.json'),
      JSON.stringify({ name: moduleName, version: '2.0.0' })
    )

    const result = resolveModule(moduleName, subProjectDir, customNodeModulesDir)
    expect(result?.version).toBe('2.0.0')
    expect(result?.path).toBe(customModulePath)
  })

  it('should continue searching if recursive lookup finds a malformed package.json', () => {
    const moduleName = '@tetherto/wdk'
    
    const midDir = path.join(rootDir, 'packages')
    const midNodeModules = path.join(midDir, 'node_modules', moduleName)
    fs.mkdirSync(midNodeModules, { recursive: true })
    fs.writeFileSync(path.join(midNodeModules, 'package.json'), '{ invalid json')

    const rootNodeModules = path.join(rootDir, 'node_modules', moduleName)
    fs.mkdirSync(rootNodeModules, { recursive: true })
    fs.writeFileSync(
      path.join(rootNodeModules, 'package.json'),
      JSON.stringify({ name: moduleName, version: '1.0.0' })
    )

    const result = resolveModule(moduleName, subProjectDir)
    expect(result).not.toBeNull()
    expect(result?.version).toBe('1.0.0')
    expect(result?.path).toBe(rootNodeModules)
  })

  it('should return null if module not found anywhere', () => {
    const result = resolveModule('@tetherto/missing', subProjectDir)
    expect(result).toBeNull()
  })
})
