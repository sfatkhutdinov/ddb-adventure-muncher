#!/usr/bin/env node --max-old-space-size=4096

const { Adventure } = require("./adventure/Adventure.js");
const { Config } = require("./adventure/Config.js");
// const { FileHelper } = require("./adventure/FileHelper.js");
const scene = require("./scene-load.js");
const ddb = require("./data/ddb.js");
const enhance = require("./data/enhance.js");
const fse = require("fs-extra");

const { exit } = require("process");
const path = require("path");

const logger = require("./logger.js");


// immediately clear the log file
logger.clear();

const configurator = new Config();

if (process.env.CONFIG_DIR) {
  console.log(`Setting config directory to: ${process.env.CONFIG_DIR}`);
  configurator.setConfigDirs(path.resolve(__dirname, process.env.CONFIG_DIR));
}

// For SCENE_DIR and NOTE_DIR set and they are loaded in config.js

async function downloadBooks() {
  const availableBooks = await ddb.listBooks(configurator.cobalt);
  // console.log(availableBooks)
  for (let i = 0; i < availableBooks.length; i++) {
    console.log(`Downloading ${availableBooks[i].book.description}`);
    await configurator.loadBook(availableBooks[i].bookCode);
    console.log(`Download for ${availableBooks[i].book.description} complete`);
  }
}

async function main() {
  try {
    if (process.argv[2] === "config") {
      const options = {
        externalConfigFile: process.argv[3],
      };
      new Config(options);
      console.log(`Loaded ${process.argv[3]}`);
      exit();
    } else if (process.argv[2] === "list") {
      const availableBooks = await ddb.listBooks(configurator.data.cobalt);
      availableBooks.forEach((book) => {
        console.log(`${book.bookCode} : ${book.book.description}`);
      });
      exit();
    } else if (process.argv[2] === "list-all") {
      const availableBooks = await ddb.listBooks(configurator.data.cobalt, true, true);
      availableBooks.forEach((book) => {
        console.log(`${book.bookCode} : ${book.book.description}`);
      });
      exit();
    } else if (process.argv[2] === "download") {
      await downloadBooks();
      console.log("Downloads finished");
      exit();
    } else if (process.argv[2] === "load") {
      await scene.importScene(configurator, process.argv[3]);
      console.log("Imported scene updates");
      exit();
    } else if (process.argv[2] === "scene-check") {
      scene.sceneCheck(process.argv[3]);
      exit();
    } else if (process.argv[2] === "scene-ids") {
      scene.listSceneIds(process.argv[3]);
      exit();
    } else if (process.argv[2] == "enhance") {
      console.log(process.argv[3]);
      await configurator.loadBook(process.argv[3]);
      const enhanced = await enhance.getEnhancedData(configurator);
      console.log(enhanced);
      exit();
    } else if (process.argv[2] == "meta") {
      const metaData = await enhance.getMetaData(configurator);
      console.log(`Latest meta data is ${metaData}`);
      console.log(`Current meta data is ${configurator.metaDataVersion}`);
      exit();
    } else if (process.argv[2] === "monsters") {
      await configurator.loadBook(process.argv[3]);
      console.log(configurator);
      const adventure = new Adventure(configurator);
      await adventure.processMonsters();
      console.warn("Done");
      exit();
    } else if (!process.argv[2] || process.argv[2] == "") {
      console.log("Please enter a book code or use 'list' to discover codes");
      exit();
    } else {
      await configurator.loadBook(process.argv[2]);
      console.log(configurator);
      const adventure = new Adventure(configurator);
      await adventure.processAdventure();
      console.warn("Done");
      exit();
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    exit(1);
  }
}

main();
