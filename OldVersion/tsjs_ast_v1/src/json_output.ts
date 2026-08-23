import fs from "fs";
import path from "path";
import * as Config from "../config";


export async function writeJsonFile(jsonData: any, fileName: string = "") {
  try {
    const jsonValue = JSON.stringify(jsonData, null, 2);
    let jsonFileName = "";
    if (fileName == "" ) {
      jsonFileName = Config.JSON_FILENAME;
    } else {
      jsonFileName = fileName;
    }
    fs.writeFileSync(path.join(Config.DEFAULT_OUTPUT_DIR, jsonFileName), jsonValue, {encoding: "utf-8"});
    return true;

  } catch (error) {
    return false;

  }
}