import { execParse } from "./src/parser";


async function main() {
  const result = await execParse();
  if (result)  {
    console.log("Success!!!!")
  } else {
    console.log("Error......")
  }
};

main();