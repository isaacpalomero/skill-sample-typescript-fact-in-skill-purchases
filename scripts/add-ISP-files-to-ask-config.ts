// How to use it:
// [any-path]$ npm install -g "fs"
// [any-path]$ npm install -g "execa"
// [root-project-path]$ ts-node tools/AddMissingISPsToConfig.ts

// TODO: update this values with yours
const askCli_ProfileName = "YOUR-PROFILE"; // Read and Update .ask/config file purpose
const ispFilesDirName = "isps"; // Read ISPs files from project
const productStage: ProductStage = "development"; // Current SKill environment from Getting ISPs List
// End-TODO

// IPS's folder structure
// ---------------------
// isps
//   ⌞ entitlement
//              ⌞ pack1.json
//              ⌞ pack2.json
//   ⌞ subscription
//              ⌞ all_access_pack.json
//   ⌞ consumable
//              ⌞ five_hint_pack.json

type ProductStage = "development" | "live";

interface InSkillProductConfig {
    deploy_status: "Add" | "Associate" | "Update" | "Remove" | "Update";
    filePath: string;
    productId?: string;
    eTag?: string;
}
interface InSkillProductJSON {
    productId: string;
    referenceName: string;
    stage: ProductStage;
    type: "ENTITLEMENT" | "SUBSCRIPTION" | "CONSUMABLE";
    [key: string]: any;
}
const ISPS_FOLDERS = [
    "entitlement",
    "subscription",
    "consumable",
];

// END-TODO
import * as path from "path";
import * as fs from "fs";
// tslint:disable-next-line: no-implicit-dependencies no-var-requires
const execa = require("execa");
import * as util from "util";

const skillRoot = path.join(__dirname, "./");
const askConfigPath = path.join(skillRoot, ".ask/config");
const ispsRoot = path.join(skillRoot, ispFilesDirName);
let askConfig: any;
try {
    askConfig = JSON.parse(fs.readFileSync(askConfigPath, "utf8"));
} catch (e) {
    console.log(`Failed to load skill schema: ${askConfigPath}`);
    throw e;
}

function printPrettyObject(object: any, header?: string) {
    if (header) {
        console.log("\n");
        console.log(header);
    }
    console.log(util.inspect(object, { showHidden: false, compact: false, depth: null, colors: true }));
}

const skillId: string = askConfig.deploy_settings[askCli_ProfileName].skill_id;
const in_skill_products: InSkillProductConfig[] = askConfig.deploy_settings[askCli_ProfileName].in_skill_products || [];

printPrettyObject(in_skill_products, `Current InSkillProducts in Ask Config file [Profile "${askCli_ProfileName}"]:`);

async function main() {
    try {
        /*console.log("Downloading ISPs from remote Skill");*/
        const listIspForSkillResult = await execa("ask", ["api", "list-isp-for-skill", "--profile", askCli_ProfileName, "--skill-id", skillId, "-g", productStage]);
        const ispsOnRemoteSkill: InSkillProductJSON[] = JSON.parse(listIspForSkillResult.stdout);

        printPrettyObject(listIspForSkillResult.stdout, `Current InSkillProducts on Remote Skill [Profile "${askCli_ProfileName}"]:`);

        ISPS_FOLDERS.forEach((isps_type) => {
            const ispTypeFolderName = fs.readdirSync(`${ispsRoot}`).find((filename) => filename === isps_type);
            if (ispTypeFolderName) {
                console.log("\n");
                console.log(`ISP Project Folder: ${ispFilesDirName}/${ispTypeFolderName}`);
                fs.readdirSync(`${ispsRoot}/${ispTypeFolderName}`)
                    .filter((filename) => filename.endsWith(".json"))
                    .forEach((fullfilename) => {
                        const ispFilePath = `${ispFilesDirName}/${ispTypeFolderName}/${fullfilename}`;
                        console.log(`- ISP File: ${ispFilePath}`);
                        const ispLocalJSON: InSkillProductJSON = JSON.parse(fs.readFileSync(ispFilePath, "utf8"));

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
                        const remoteISP = ispsOnRemoteSkill.find((ispRemoteJSON, _index, _list) => ispRemoteJSON.referenceName === ispLocalJSON.referenceName);
                        if (remoteISP) {
                            printPrettyObject(remoteISP, `**** Remote ISP:`);
                            console.log(util.inspect(remoteISP, { showHidden: false, compact: false, depth: null, colors: true }));
                        } else {
                            console.log(`**** Remote ISP: none`);
                        }
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
