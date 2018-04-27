> This is a utility module that helps you work with electron inside nuxt.

**Features**
- Automagically starts/restarts electron when changes are made
- Seamless integration with nuxt build/generate

## Setup
- Add `@nuxtjs/electron` dependency using yarn or npm to your project
- Add `@nuxtjs/electron` to `modules` section of `nuxt.config.js`
```js
  modules: [
    ['@nuxtjs/electron', {
      main: 'main.js',
      build: {
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

### `build.babel` - babel-loader config
  - Default: `{ presets: [ ['env', {'targets': { 'node': 7 }, 'useBuiltIns': true }] ], plugins: ['add-module-exports'] }`

### `build.extend(config, options, nuxt)` - webpack config
  - @config: `webpack config object`
  - @options: `module options object`
  - @nuxt: `nuxt.options object`
