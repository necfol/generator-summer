const Generator = require('yeoman-generator')
const Chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const exec = require('child_process').exec
const yaml = require('write-yaml')
const conf = require('./config.js')
module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts)
    this.argument('appname', { type: String })
  }
  initializing() {
    this.log(Chalk.bold.green('Generator for projects'))
    this.log(' ')
  }
  prompting() {
    return this.prompt([{
        type    : 'input',
        name    : 'name',
        message : 'Your project name',
        default : this.options.appname
      },{
        type    : 'input',
        name    : 'domain',
        message : 'Project Domain',
        default : `www.${this.options.appname}.com`
  }   , {
        type: "list",
        name: "tmpl",
        message: "Choose Your Template",
        choices: conf.VIEW,
        default: conf.VIEW[0]
      }, {
        type: "confirm",
        name: "compile",
        message: "Need to compile?",
        default: true
      }, {
        type: 'list',
        name: 'registry',
        message: 'Use NPM/UED registry?',
        choices: Object.keys(conf.NPM.registry),
        default: Object.keys(conf.NPM.registry)[0],
        when (props) {
          return props.compile
        }
      }]).then((props) => {
        this.programmerOptions = props
      })
  }
  writing() {
    const options = this.programmerOptions
    const tmpl = options.tmpl.split('*.')[1]
    let defaultSettings = this.fs.readJSON(this.templatePath('src/package.json'))
    let packageSettings = {
      name: options.name,
      private: true,
      version: '0.0.1',
      description: `${options.name}`,
      main: 'index.js',
      scripts: defaultSettings.scripts,
      repository: defaultSettings.repository,
      keywords: [],
      author: 'UED',
      devDependencies: defaultSettings.devDependencies,
      dependencies: defaultSettings.dependencies
    }
    this.fs.copyTpl(
      this.templatePath(`tmpl/index.${tmpl}`),
      this.destinationPath(`${options.name}/view/index.${tmpl}`),
      { name: options.name }
    )
    this.fs.copy(
      this.templatePath(`api`),
      this.destinationPath(`${options.name}/api`)
    )
    this.fs.copy(
      this.templatePath(`swagger`),
      this.destinationPath(`${options.name}/api/swagger`)
    )
    if(options.compile) {
      this.fs.copy(
        this.templatePath(`src`),
        this.destinationPath(`${options.name}/src`)
      )
      this.fs.writeJSON(this.destinationPath(`${options.name}/src/package.json`), packageSettings)
      this.fs.copy(
        this.templatePath(`dist`),
        this.destinationPath(`${options.name}/dist`)
      )
      exec(conf.NPM.registry[options.registry])
    }

  }
  install () {
    const options = this.programmerOptions
    exec('npm install', {cwd: `${this.destinationRoot()}/${options.name}/src/`})
  }
}