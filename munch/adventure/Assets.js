const logger = require("../logger.js");
const { FileHelper } = require("./FileHelper.js");

const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

// const tf = require("@tensorflow/tfjs-node");
// const x2 = require("@upscalerjs/esrgan-thick/2x");
// const Upscaler = require("upscaler/node");

class Assets {

  constructor(adventure) {
    this.adventure = adventure;
    // this.upscaler = new Upscaler({
    //   // model: x2,
    // });
  }

  // async upscaleImage(imagePath) {
  //   if (!(/\.png|\.jpg|\.jpeg/i).test(imagePath)) return;
  //   const image = tf.node.decodeImage(fs.readFileSync(imagePath), 3);
  //   const tensor = await this.upscaler.upscale(image);
  //   const upscaledTensor = imagePath.endsWith(".png")
  //     ? await tf.node.encodePng(tensor, 9)
  //     : await tf.node.encodeJpeg(tensor, "", 95, false, true);
  //   fs.writeFileSync(`${imagePath}-upscaled.png`, upscaledTensor);

  //   // dispose the tensors!
  //   image.dispose();
  //   tensor.dispose();
  //   // upscaledTensor.dispose();
  // }

  // async upscaleImages(list) {
  //   logger.info("Checking for scene upscaling...");
  //   if (this.adventure.return) this.adventure.returns.statusMessage("Checking for scene upscaling...");
  //   const upscaleScenes = this.adventure.config.upscaleScenes ?? false;
  //   if (!upscaleScenes) return;

  //   let dlFile = FileHelper.loadFile(path.join(this.adventure.config.sourceDir, "upscale.json"));
  //   let processed = dlFile && !this.adventure.config.data.forceNew
  //     ? JSON.parse(dlFile)
  //     : [];
  //   if (!Array.isArray(processed)) processed = [];
  //   for (let i = 0; i < list.length; i++) {
  //     const listPath = list[i].path.replace(/^assets\//, "");
  //     // we can only upscale certain images right now
  //     if (!(/\.png|\.jpg|\.jpeg/i).test(listPath)) continue;
  //     if (!processed.includes(listPath)) {
  //       const dlPath = path.join(this.adventure.config.sourceDir, listPath);
  //       logger.info(`Upscaling ${list[i].name} (${dlPath})`);
  //       await this.upscaleImage(dlPath);
  //       processed.push(listPath);
  //     }
  //   }
  //   FileHelper.saveJSONFile(processed, path.join(this.adventure.config.sourceDir, "upscale.json"));

  // }

  async downloadEnhancements(list) {
    logger.info("Checking for download enhancements...");
    if (this.adventure.return) this.adventure.returns.statusMessage("Checking for download enhancements...");
    const disableLargeDownloads = this.adventure.config.disableLargeDownloads 
      ? this.adventure.config.disableLargeDownloads
      : false;
    if (disableLargeDownloads) return;

    let dlFile = await FileHelper.loadFile(path.join(this.adventure.config.sourceDir, "hiRes.json"));
    let downloaded = dlFile && !this.adventure.config.data.forceNew
      ? JSON.parse(dlFile)
      : [];
    if (!Array.isArray(downloaded)) downloaded = [];
    for (let i = 0; i < list.length; i++) {
      const listPath = list[i].path.replace(/^assets\//, "");
      if (!downloaded.includes(listPath)) {
        const dlPath = path.join(this.adventure.config.sourceDir, listPath);
        logger.info(`Downloading Hi Res ${list[i].name} (${dlPath})`);
        try {
          await FileHelper.downloadFile(list[i].url, dlPath, this.adventure.config.downloadTimeout);
          downloaded.push(listPath);
        } catch (err) {
          logger.error(`Failed to download ${list[i].name}: ${err.message}`);
        }
      }
    }
    await FileHelper.saveJSONFile(downloaded, path.join(this.adventure.config.sourceDir, "hiRes.json"));
  }

  async downloadDDBMobile() {
    logger.info("Checking for missing ddb images...");
    const targetFilesFile = await FileHelper.loadFile(path.join(this.adventure.config.sourceDir, "files.txt"));
    const targetFiles = targetFilesFile ? JSON.parse(targetFilesFile) : {};
  
    if (!targetFiles.files) return;

    const list = targetFiles.files;
    for (let i = 0; i < list.length; i++) {
      const localUrl = list[i].LocalUrl[0].replace(/^\//,"");
      const dlPath = path.join(this.adventure.config.sourceDir, localUrl);
      const isLocalFile = await fse.pathExists(dlPath);
      if (!isLocalFile) {
        logger.info(`Downloading DDB Image ${localUrl} (${dlPath})`);
        if (this.adventure.return) this.adventure.returns.statusMessage(`Downloading DDB Image ${localUrl}`);
        try {
          await FileHelper.downloadFile(list[i].RemoteUrl, dlPath, this.adventure.config.downloadTimeout);
        } catch (err) {
          logger.error(`Failed to download image ${localUrl}: ${err.message}`);
        }
        if (list[i].LocalUrl.length > 1) {
          for (let ui = 0; ui < list[i].LocalUrl.length; ui++) {
            const targetUrl = list[i].LocalUrl[ui].replace(/^\//,"");
            if (localUrl !== targetUrl) {
              logger.info(`Copying ${localUrl} to ${targetUrl}`);
              try {
                await fse.copy(dlPath, path.join(this.adventure.config.sourceDir,targetUrl));
              } catch (err) {
                logger.error(`Failed to copy image to ${targetUrl}: ${err.message}`);
              }
            }
          }
        }
      }
    }
  }

  async finalAssetCopy() {
    try {
      await fse.copy(this.adventure.config.sourceDir, path.join(this.adventure.config.outputDir,"assets"));
    } catch (err) {
      logger.error(`Failed to copy sourceDir assets: ${err.message}`);
    }
    // copy assets files
    const assetFilePath = path.join(this.adventure.config.assetsInfoDir, this.adventure.config.bookCode);
    if (await fse.pathExists(assetFilePath)) {
      try {
        await fse.copy(assetFilePath, path.join(this.adventure.config.outputDir,"assets"));
      } catch (err) {
        logger.error(`Failed to copy assetFilePath: ${err.message}`);
      }
    }
    const copiedDbPath = path.join(this.adventure.config.outputDir,"assets",`${this.adventure.bookCode}.db3`);
    logger.info(copiedDbPath);
    if (await fse.pathExists(copiedDbPath)) {
      try {
        await fse.unlink(copiedDbPath);
        //file removed
      } catch(err) {
        logger.error(`Failed to remove copiedDbPath: ${err.message}`);
      }
    }
  }

  async generateZipFile() {
    const filePath = path.join(this.adventure.config.outputDirEnv,`${this.adventure.bookCode}.fvttadv`);
    logger.info(`Generating adventure zip to ${filePath}`);
    if (this.adventure.return) this.adventure.returns.statusMessage(`Generating adventure zip to ${filePath}`);
    try {
      const zip = await FileHelper.getZipOfFolder(this.adventure.config.outputDir);
      logger.debug(`Zip contains ${Object.keys(zip.files).length} files`);
      await FileHelper.writeZipFile(zip, filePath);
    } catch (err) {
      logger.error(`Failed to generate adventure zip: ${err.message}`);
      throw err;
    }
  }

}

exports.Assets = Assets;
