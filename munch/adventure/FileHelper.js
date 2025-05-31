const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const extract = require("extract-zip");
const fse = require("fs-extra");
const fetch = require("node-fetch");
const logger = require("../logger.js");

class FileHelper {
  static async checkDirectories(directories) {
    for (const dir of directories) {
      const dirPath = path.resolve(__dirname, dir);
      try {
        if (!await fse.pathExists(dirPath)) {
          await fse.mkdirp(dirPath);
        }
      } catch (err) {
        logger.error(`Failed to create/check directory: ${dir}`);
        logger.error(err);
        throw new Error(`Failed to create/check directory: ${dir}`);
      }
    }
  }

  static async getFilePathsRecursively(dir) {
    const dirPath = path.resolve(__dirname, dir);
    let results = [];
    try {
      if (await fse.pathExists(dirPath)) {
        const files = await fse.readdir(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stat = await fse.stat(filePath);
          if (stat.isDirectory()) {
            results = results.concat(await FileHelper.getFilePathsRecursively(filePath));
          } else {
            results.push(filePath);
          }
        }
      }
    } catch (err) {
      logger.error(`Failed to read directory recursively: ${dir}`);
      logger.error(err);
      throw new Error(`Failed to read directory recursively: ${dir}`);
    }
    return results;
  }

  static async getZipOfFolder(dir) {
    const allPaths = await FileHelper.getFilePathsRecursively(path.resolve(dir));
    logger.debug(`Compressing ${allPaths.length} items into the adventure file...`);
    let zip = new JSZip();
    for (const filePath of allPaths) {
      const addPath = path.relative(dir, filePath);
      const data = await fse.readFile(filePath);
      const stat = await fse.stat(filePath);
      const binary = filePath.endsWith(".json") ? false : true;
      const name = addPath.split(path.sep).join(path.posix.sep);
      const options = {
        dir: stat.isDirectory(),
        binary,
        createFolders: true,
      };
      logger.debug(`Adding ${name} (Binary? ${options.binary}) (Dir? ${options.dir})`);
      zip.file(name, data, options);
    }
    return zip;
  }

  static async writeZipFile(zip, targetFile) {
    try {
      const filePath = path.resolve(__dirname, targetFile);
      const content = await zip.generateAsync({ type: "nodebuffer" });
      await fse.writeFile(filePath, content);
    } catch (err) {
      logger.error(`Failed to write zip file: ${targetFile}`);
      logger.error(err);
      throw new Error(`Failed to write zip file: ${targetFile}`);
    }
  }

  static async unzipFile(filePath, destination) {
    try {
      const src = path.resolve(__dirname, filePath);
      const dest = path.resolve(__dirname, destination);
      await extract(src, { dir: dest });
    } catch (err) {
      logger.error(`Failed to unzip file: ${filePath} to ${destination}`);
      logger.error(err);
      throw new Error(`Failed to unzip file: ${filePath}`);
    }
  }

  static fetchWithTimeout(url, options, timeout = 15000) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeout)
      ),
    ]);
  }

  static fetchFile(url, destination, timeout = 15000) {
    logger.info(`Downloading ${url} to ${destination} (timeout: ${timeout})`);
    const options = {
      url: url,
      encoding: null,
      headers: {
        "x-requested-with": "foundry",
      },
    };

    return new Promise((resolve, reject) => {
      FileHelper.fetchWithTimeout(url, options, timeout)
        .then((res) => {
          const dest = fs.createWriteStream(destination);
          res.body.pipe(dest);
          dest.on("finish", function () {
            dest.close();
            resolve(destination);
          });
          dest.on("error", reject);
        })
        .catch((error) => {
          logger.error("error", error);
          reject(error);
        });
    });
  }

  static downloadFile(
    url,
    destination,
    timeout = 1500,
    count = 0,
    maxcount = 5,
    error = null
  ) {
    return new Promise((resolve, reject) => {
      if (count === maxcount) {
        logger.error("Max attempts reached. Download error:", error);
        fs.rmSync(destination);
        reject(error);
      } else {
        try {
          FileHelper.fetchFile(url, destination, timeout).then((destination) => {
            resolve(destination);
          });
        } catch (err) {
          logger.error(
            `Failed to download ${url} to ${destination} (Attempt ${
              count + 1
            } of ${maxcount})`
          );
          fs.rmSync(destination);
          resolve(
            FileHelper.downloadFile(url, destination, timeout, count + 1, maxcount, err)
          );
        }
      }
    });
  }

  static async loadFile(file) {
    const filePath = path.resolve(__dirname, file);
    if (await fse.pathExists(filePath)) {
      try {
        const content = await fse.readFile(filePath);
        return content.toString();
      } catch (err) {
        logger.error(`Failed to read file: ${file}`);
        logger.error(err);
        throw new Error(`Failed to read file: ${file}`);
      }
    } else {
      throw new Error(`File not found: ${file}`);
    }
  }

  static async loadJSONFile(file) {
    const configPath = path.resolve(__dirname, file);
    if (await fse.pathExists(configPath)) {
      try {
        const config = JSON.parse(await FileHelper.loadFile(configPath));
        return config;
      } catch (err) {
        logger.error(`Failed to parse JSON file: ${file}`);
        logger.error(err);
        throw new Error(`Invalid JSON in file: ${file}`);
      }
    } else {
      throw new Error(`Config file not found: ${file}`);
    }
  }

  static loadConfig(file) {
    logger.info(`Loading config file ${file}`);
    let config;
    try {
      config = FileHelper.loadJSONFile(file);
    } catch (err) {
      logger.error(err.message);
      throw err;
    }
    if (process.env.output) {
      config.output = process.env.output;
    }
    return config;
  }

  /**
   * Save object to JSON in a file
   * @param {*} content
   * @param {*} file
   */
  static async saveJSONFile(obj, file) {
    try {
      const filePath = path.resolve(__dirname, file);
      await fse.writeFile(filePath, JSON.stringify(obj, null, 2));
    } catch (err) {
      logger.error(`Failed to save JSON file: ${file}`);
      logger.error(err);
      throw new Error(`Failed to save JSON file: ${file}`);
    }
  }

  /**
   * Save text in a file
   * @param {*} content
   * @param {*} file
   */
  static async saveFile(content, filePath) {
    try {
      await fse.writeFile(filePath, content);
      logger.info(`File saved to ${filePath}`);
    } catch (error) {
      logger.error(error);
    }
  }

  static async directoryReset(config) {
    logger.info(`Resetting output dir ${config.outputDir}`);
    // delete directory recursively
    for (const d of config.data.subDirs) {
      const dirPath = path.join(config.outputDir, d);
      if (await fse.pathExists(dirPath)) {
        await fse.rm(dirPath, { recursive: true, force: true });
      }
    }
    // delete adventure zip
    const targetAdventureZip = path.join(
      config.outputDirEnv,
      `${config.bookCode}.fvttadv`
    );
    if (await fse.pathExists(targetAdventureZip)) {
      logger.info(`Removing ${targetAdventureZip}`);
      await fse.unlink(targetAdventureZip);
    }

    logger.info(
      `${config.sourceDir} to ${path.join(config.outputDir, "assets")}`
    );

    await FileHelper.checkDirectories([config.outputDir]);

    // To copy a folder or file
    await fse.copy(
      config.sourceDir,
      path.join(config.outputDir, "assets")
    );

    // copy assets files
    const assetFilePath = path.join(
      config.assetsInfoDir,
      config.bookCode
    );
    if (await fse.pathExists(assetFilePath)) {
      await fse.copy(assetFilePath, path.join(config.outputDir, "assets"));
    }

    // remove copied db
    const copiedDbPath = path.join(
      config.outputDir,
      "assets",
      `${config.bookCode}.db3`
    );
    logger.info(copiedDbPath);
    if (await fse.pathExists(copiedDbPath)) {
      try {
        await fse.unlink(copiedDbPath);
        //file removed
      } catch (err) {
        logger.error(err);
      }
    }
    logger.info("Directory reset complete");
  }
}

exports.FileHelper = FileHelper;

