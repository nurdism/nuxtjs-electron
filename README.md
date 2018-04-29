<p align="center">
  <img width="128" src="https://i.imgur.com/sY8LqKi.png">
  <br><br>
  <img src="https://david-dm.org/nurdism/nuxtjs-electron/status.svg" alt="Dependencies Status">
  <img src="https://david-dm.org/nurdism/nuxtjs-electron/dev-status.svg" alt="Dev Dependencies Status">
  <img src="https://david-dm.org/nurdism/nuxtjs-electron/peer-status.svg" alt="Peer Dependencies Status">
  <a href="https://www.npmjs.com/package/nuxtjs-electron"><img src="https://img.shields.io/npm/dm/nuxtjs-electron.svg" alt="Downloads"></a>
  <a href="https://www.npmjs.com/package/nuxtjs-electron"><img src="https://img.shields.io/npm/v/nuxtjs-electron.svg" alt="Version"></a>
  <a href="https://www.npmjs.com/package/nuxtjs-electron"><img src="https://img.shields.io/npm/l/nuxtjs-electron.svg" alt="License"></a>
</p>

# nuxtjs-electron

> This is a utility module that helps you work with electron inside nuxt.

**Features**
- Automagically starts/restarts electron when changes are made
- Seamless integration with nuxt build/generate

## Setup
- Add `nuxtjs-electron` dependency using yarn or npm to your project
- Add `nuxtjs-electron` to `modules` section of `nuxt.config.js`
```js
  modules: [
    ['@nuxtjs/electron', {
      main: 'main.js',
      build: {
        warnings: false,
        babel: {
            presets: [ ['env', {'targets': { 'node': 7 }, 'useBuiltIns': true }] ],
            plugins: ['add-module-exports']
        },
        extend(config, options, nuxt) {
          // extend webpack config
        }
      }
    }],
  ]
````

## Options

### `main` - Entry point for electron main
  - Default: `main.js`

### `build.warnings` - hide webpack warnings
  - Default: true

### `build.babel` - babel-loader config
  - Default: `{ presets: [ ['env', {'targets': { 'node': 7 }, 'useBuiltIns': true }] ], plugins: ['add-module-exports'] }`

### `build.extend(config, options, nuxt)` - webpack config
  - @config: `webpack config object`
  - @options: `module options object`
  - @nuxt: `nuxt.options object`
