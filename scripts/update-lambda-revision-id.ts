// Workaround when you change Environment Vars on Lambda functions and need to use ASK - CLI to Deploy an Skill.
// That code updates the variables through the AWS console and manually fetch the function's info using the AWS CLI and
// update the local revision id to match the revision id that's live on AWS.
// https://stackoverflow.com/questions/53508109/setting-lambda-environmental-variable-using-ask-cli
// Gist link: https://gist.github.com/isaacpalomero/84de0412d3de5b3f5c0e2e4a141a0fae
// How to use it:
// npm install -g "fs"
// npm install -g "execa"
// [root-project-path]$ ts-node tools/UpdateRevisionID.ts

// TODO: update this values with yours
const awsCli_ProfileName = "YOUR-AWS-CLI-PROFILE"; // Download Lambda purpose
const askCli_ProfileName = "YOUR-ASK-CLI-PROFILE"; // Update .ask/config file purpose
// END-TODO

import * as path from "path";
import * as fs from "fs";
const execa = require("execa");
const skillRoot = path.join(__dirname, "../");
const askConfigPath = path.join(skillRoot, ".ask", "config");
const askConfig = JSON.parse(fs.readFileSync(askConfigPath, "utf8"));
const { functionName } = askConfig.deploy_settings[askCli_ProfileName].resources.lambda[0];

async function main() {
    console.log("Downloading function info from AWS");
    try {
        const result = await execa("aws", ["lambda", "--profile", awsCli_ProfileName, "get-function", "--function-name", functionName]);
        const functionInfo = JSON.parse(result.stdout);

        const revisionId = functionInfo.Configuration.RevisionId;

        // console.log("Downloading function contents from AWS");
        // await execa("ask", ["lambda", "--profile", askCli_ProfileName, "download", "--function", functionName], { cwd: functionRoot, stdio: "inherit" });

        console.log("Updating skill's revisionId");
        askConfig.deploy_settings[askCli_ProfileName].resources.lambda[0].revisionId = revisionId;
        fs.writeFileSync(askConfigPath, JSON.stringify(askConfig, null, 2));

        console.log("Done");
    } catch (error) {
        console.log(`Error: ${error.message}`);
    }
}

main();