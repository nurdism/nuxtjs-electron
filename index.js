const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const webpack = require('webpack')
const electron = require('electron')
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
        entry: {
            main: path.join(nuxt.srcDir, options.main || 'main.js')
        },

        externals:[],

        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [ ["env", {"targets": { "node": 7 }, "useBuiltIns": true }] ],
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
            filename: options.main || 'main.js',
            libraryTarget: 'commonjs2',
            path: nuxt.dev ? nuxt.buildDir : path.join(nuxt.rootDir, nuxt.generate.dir)
        },

        resolve: {
            extensions: ['.js', '.json', '.node'],
            alias: {
                '~': path.join(nuxt.srcDir),
                '~~': path.join(nuxt.rootDir),
                '@': path.join(nuxt.srcDir),
                '@@': path.join(nuxt.rootDir),
            }
        },

        plugins: [],

        target: 'electron-main',

        node: {
            __dirname: false,
            __filename: false
        },
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

        let pkg = path.join(nuxt.srcDir, options.main || 'package.json')
        if (fs.existsSync(pkg)) {
            config.plugins.push(new CopyWebpackPlugin([{
                from: pkg,
                to: 'package.json',
            }]))
        }
    }
}


const start = (config, options, nuxt) => {
    if (instance) {
        return
    }

    instance = spawn(electron, [path.join(config.output.path, options.main || 'main.js')], { env: process.env })

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
    return new Promise((resolve, reject) => {
        if (compiler) {
            return resolve()
        }

        let conf = config(options, nuxt)

        plugins(conf, options, nuxt)

        if (options.build && options.build.extend && typeof(options.build.extend) === 'function') {
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

            console.log(`${chalk.black.bgGreen(' DONE ')} ${chalk.green(`Compiled main successfully in ${stats.startTime - stats.endTime}ms`)}`)

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

        if (options.build && options.build.extend && typeof(options.build.extend) === 'function') {
            options.build.extend(conf, options, nuxt)
        }

        console.log(`${chalk.blue('  nuxt:electron')} ${chalk.red('Building main')}`)
        webpack(conf, (err, stats) => {
            if (err) { reject(err) }
            console.log(`${chalk.blue('  nuxt:electron')} ${chalk.red(`Compiled successfully in ${stats.startTime - stats.endTime}ms`)}`)
            resolve()
        })
    })
}

module.exports = async function nuxtElectron(options) {
    if (this.options.mode !== 'spa') {
        throw new Error('Must run in SPA mode for Electron to work properly!') // Not sure if this is *really* needed? Too lazy to find out...
    }

    this.nuxt.hook('build:done', async () => {
        if (!compiler) {
            await build(options, this.options)
        }
    })

    this.nuxt.hook('generate:done', async generator => {
        await generate(options, this.options)
    })

    this.nuxt.hook('close', () => {
        if (instance) {
            process.kill(instance.pid)
        }
    })

    this.extendBuild((config, { isClient }) => {
        if (isClient) { config.target = 'electron-renderer' }
    })
}

module.exports.meta = require('./package.json')
