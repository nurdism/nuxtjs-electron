const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const electron = require('electron')
const format = require('webpack-format-messages')
const { spawn } = require('child_process')

// Plugins
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')

let compiler = null
let instance = null
let restart = false

const log = (info, data, color = 'bgBlue') => {
  let str = ''
  data
    .toString()
    .split(/\r?\n/)
    .forEach(line => {
      str += `${line}\n`
    })

  if (/[0-9A-z]+/.test(str)) {
    console.log(`${chalk.black[color](` ${info}: `)} ${str}`)
  }
}

const config = (options, nuxt, generate) => {
  return {
    mode: nuxt.dev ? 'development' : 'production',

    entry: {
      main: path.join(nuxt.srcDir, options.main)
    },

    externals: [],

    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: options.build.babel ? options.build.babel : {
              presets: [ ['env', { 'targets': { 'node': 7 }, 'useBuiltIns': true }] ],
              plugins: ['add-module-exports']
            }
          }
        },
        {
          test: /\.node$/,
          use: 'node-loader'
        }
      ]
    },

    output: {
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      path: nuxt.dev ? nuxt.buildDir : path.join(nuxt.rootDir, nuxt.generate.dir)
    },

    resolve: {
      extensions: ['.js', '.json', '.node'],
      alias: {
        '~': path.join(nuxt.srcDir),
        '~~': path.join(nuxt.rootDir),
        '@': path.join(nuxt.srcDir),
        '@@': path.join(nuxt.rootDir)
      }
    },

    plugins: [],

    target: 'electron-main',

    node: {
      __dirname: false,
      __filename: false
    }
  }
}

const plugins = (config, options, nuxt, generate) => {
  if (nuxt.build.analyze) {
    config.plugins.push(new BundleAnalyzerPlugin(nuxt.build.analyze))
  }

  if (generate) {
    if (nuxt.generate.minify.minifyJS) {
      config.plugins.push(new UglifyJSPlugin({
        parallel: true,
        sourceMap: true
      }))
    }

    let pkg = path.join(nuxt.srcDir, 'package.json')
    if (fs.existsSync(pkg)) {
      config.plugins.push(new CopyWebpackPlugin([{
        from: pkg,
        to: 'package.json'
      }]))
    }
  }
}

const start = (config, options, nuxt) => {
  if (instance) {
    return
  }

  instance = spawn(electron, [path.join(config.output.path, options.main)], { env: process.env })

  instance.stdout.on('data', data => {
    log('MAIN STDOUT', data, 'bgYellow')
  })

  instance.stderr.on('data', data => {
    log('MAIN STDERR', data, 'bgRed')
  })

  instance.stderr.on('close', () => {
    if (!restart) { process.exit() }
  })
}

const build = (options, nuxt) => {
  return new Promise(resolve => {
    if (compiler) {
      return resolve()
    }

    let conf = config(options, nuxt)

    plugins(conf, options, nuxt)

    if (typeof (options.build.extend) === 'function') {
      options.build.extend(conf, options, nuxt)
    }

    compiler = webpack(conf)

    compiler.hooks.watchRun.tap('nuxtjs-electron', () => {
      console.log(`${chalk.black.bgBlue(' WAIT ')} ${chalk.blue(`Compiling main...`)}`)
    })

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(chalk.black.bgRed(' ERROR '), err)
        return resolve()
      }

      const messages = format(stats)

      if (!messages.errors.length && !messages.warnings.length) {
        console.log(`${chalk.black.bgGreen(' DONE ')} ${chalk.green(`Compiled main successfully in ${stats.startTime - stats.endTime}ms.`)}`)
      }

      if (messages.errors.length) {
        console.log(chalk.black.bgRed(' ERROR '), chalk.red('Failed to compile main.'))
        messages.errors.forEach(e => console.log(e))
        return resolve()
      }

      if (messages.warnings.length) {
        console.log(`${chalk.black.bgYellow(' DONE ')} ${chalk.green(`Compiled main with ${messages.warnings.length} warnings in ${stats.startTime - stats.endTime}ms.`)}`)
        if (options.build.warnings !== false) {
          messages.warnings.forEach(w => console.log(w))
        }
      }

      if (instance && instance.kill) {
        restart = true
        process.kill(instance.pid)
        instance = null
        start(conf, options, nuxt)
        setTimeout(() => {
          restart = false
        }, 5000)
      } else {
        start(conf, options, nuxt)
      }

      resolve()
    })
  })
}

const generate = (options, nuxt) => {
  return new Promise((resolve, reject) => {
    let conf = config(options, nuxt, true)

    plugins(conf, options, nuxt, true)

    if (typeof (options.build.extend) === 'function') {
      options.build.extend(conf, options, nuxt)
    }

    console.log(`${chalk.blue('  nuxt:electron')} ${chalk.red('Building main.')}`)

    webpack(conf, (err, stats) => {
      if (err) { reject(err) }

      const messages = format(stats)

      if (!messages.errors.length && !messages.warnings.length) {
        console.log(`${chalk.blue('  nuxt:electron ')} ${chalk.green(`Compiled main successfully in ${stats.startTime - stats.endTime}ms.`)}`)
      }

      if (messages.errors.length) {
        console.log(chalk.blue('  nuxt:electron '), chalk.red('Failed to compile main.'))
        messages.errors.forEach(e => console.log(e))
        return reject(new Error('Failed to compile main.'))
      }

      if (messages.warnings.length) {
        console.log(`${chalk.blue('  nuxt:electron ')} ${chalk.green(`Compiled main with ${messages.warnings.length} warnings in ${stats.startTime - stats.endTime}ms.`)}`)
        if (options.build.warnings !== false) {
          messages.warnings.forEach(w => console.log(w))
        }
      }
      resolve()
    })
  })
}

module.exports = async function nuxtElectron (options = {}) {
  options.main = options.main || 'main.js'
  options.build = Object.assign({ warnings: true }, options.build || {})

  if (this.options.mode !== 'spa') {
    throw new Error('Must run in SPA mode for Electron to work properly!') // Not sure if this is *really* needed? Too lazy to find out...
  }

  if (this.options.router.mode !== 'hash') {
    throw new Error('Router mode must be in hash mode for Electron to work properly!') // https://github.com/nuxt/nuxt.js/issues/3125
  }

  this.nuxt.hook('build:before', builder => {
    const isStatic = builder.isStatic
    this.nuxt.hook('build:done', async generator => {
      if (isStatic) {
        this.nuxt.hook('generate:done', async generator => {
          await generate(options, this.options)
        })
      } else {
        if (!compiler) {
          await build(options, this.options)
        }
      }
    })
  })

  this.nuxt.hook('close', () => {
    if (instance) {
      process.kill(instance.pid)
    }
  })

  this.extendBuild((config, { isClient, isDev }) => {
    if (isClient) { config.target = 'electron-renderer' }
    if (!isDev) { config.output.publicPath = './_nuxt/' } // https://github.com/nuxt/nuxt.js/issues/2892
  })
}

module.exports.meta = require('../package.json')
