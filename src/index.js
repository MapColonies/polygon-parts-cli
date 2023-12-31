#! /usr/bin/env node
const yargs = require("yargs");
const { FileToDB } = require("./dataSource");

const argv = require("yargs/yargs")(process.argv.slice(2)).argv;

yargs
  .usage("insert polygon part raw data into db")
  .option("i", {
    alias: "input",
    describe: "input directory",
    type: "string",
    demandOption: false,
  })
  .help(true).argv;

if(argv.i == null && argv.input == null){
  yargs.showHelp();
  return;
}
const input = argv.i || argv.input;

const partsUploader = new FileToDB(input);

(async () =>{
  try {
    console.log(`Start processing file: ${input}`)
    await partsUploader.csvToPg()
    console.log('Complete migration successfully')
  } catch (error) {
      console.log("err", error)
      console.log('Failed complete migration')
  } finally {
    console.log('Migration stop running')
  }
})()
