// TODO: update this values with yours
const askCli_ProfileName = "Personal-Alexa";
interface InSkillProductConfig {
    deploy_status: "Add" | "Update" | "Delete";
    filePath: string;
    productId?: string;
    eTag?: string;
}
/*interface InSkillProductJSON {
    productId: string;
    referenceName: string;
    stage: "development" | "live";
    type: "ENTITLEMENT" | "SUBSCRIPTION" | "CONSUMABLE";
    [key: string]: any;
}*/

const ISPS_FOLDERS = [
    "entitlement",
    "subscription",
    "consumable",
];

// END-TODO
import * as path from "path";
import * as fs from "fs";
// const execa = require("execa");

const skillRoot = path.join(__dirname, "..");
const askConfigPath = path.join(skillRoot, "/.ask/config");
const ispsRootFolderName = "isps";
const ispsRoot = path.join(skillRoot, ispsRootFolderName);
let askConfig: any;
try {
    askConfig = JSON.parse(fs.readFileSync(askConfigPath, "utf8"));
} catch (e) {
    console.log(`Failed to load skill schema: ${askConfigPath}`);
    throw e;
}

// const skillId: string = askConfig.deploy_settings[askCli_ProfileName].skill_id;
const in_skill_products: InSkillProductConfig[] = askConfig.deploy_settings[askCli_ProfileName].in_skill_products;

async function main() {
    try {
        /*console.log("Downloading ISPs from remote Skill");*/
        // const listIspForSkillResult = await execa("ask", ["api", "list-isp-for-skill", "--profile", askCli_ProfileName, "--skill-id", skillId, "-g", "development"]);
        // const ispsOnRemoteSkill: InSkillProductJSON[] = JSON.parse(listIspForSkillResult.stdout);
        // console.log(listIspForSkillResult.stdout);


        ISPS_FOLDERS.forEach((isps_type) => {
            const ispTypeFolderName = fs.readdirSync(`${ispsRoot}`).find((filename) => filename === isps_type);
            if (ispTypeFolderName) {
                fs.readdirSync(`${ispsRoot}/${ispTypeFolderName}`)
                    .filter((filename) => filename.endsWith(".json"))
                    .forEach((fullfilename) => {
                        const ispFilePath = `${ispsRootFolderName}/${ispTypeFolderName}/${fullfilename}`;
                        // const ispLocalJSON: InSkillProductJSON = JSON.parse(fs.readFileSync(ispFilePath, "utf8"));

                        const isp = in_skill_products.find((ispConfig, _index, _list) => ispConfig.filePath === ispFilePath);
                        if (isp === undefined) {
                            if (askConfig.deploy_settings[askCli_ProfileName].in_skill_products === undefined) {
                                askConfig.deploy_settings[askCli_ProfileName].in_skill_products = [];
                            }
                            const ispToBeAdded: InSkillProductConfig = {
                                filePath: ispFilePath,
                                deploy_status: "Add",
                            };
                            (askConfig.deploy_settings[askCli_ProfileName].in_skill_products as [InSkillProductConfig]).push(ispToBeAdded);
                        }
                        /*const remoteISP = ispsOnRemoteSkill.find((ispRemoteJSON, _index, _list) => ispRemoteJSON.referenceName === ispLocalJSON.referenceName);
                        if (remoteISP) {

                        }*/
                    });
            }
        });

    } catch (error) {
        console.log(`Error: ${error.message}`);
    }

    try {
        fs.writeFileSync(askConfigPath, JSON.stringify(askConfig, null, 2));
        console.log(`Success saving skill schema`);
    } catch (e) {
        console.log(`Failed to save skill schema: ${askConfigPath}`);
        throw e;
    }
}

main();
