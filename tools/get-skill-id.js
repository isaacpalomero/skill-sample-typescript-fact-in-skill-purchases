// Create Your Own Automation Script to Optimize Syncing Your Local Alexa Skill Interaction Model Using the ASK CLI
// Find it on: https://developer.amazon.com/blogs/alexa/post/a94d26c7-591b-4382-8721-2929f818be8b/create-your-own-automation-script-to-optimize-syncing-your-local-skill-interaction-model-using-the-ask-cli
// Example Uses:
// [PROJECTPATH]$ ask api get-model --locale en-US --skill-id `node tools/get-skill-id.js`
// or
// ⌞ $ cp $PROJECTPATH/tools/get-skill-id.js $HOME/$WHEREVERYOUWANT/get-skill-id.js
// ⌞ $ pico ~/.bash_profile
// ⌞   alias gskill='node $HOME/$WHEREVERYOUWANT/get-skill-id.js'
// ⌞ $ source ~/.bash_profile
// ⌞ [PROJECTPATH]$ ask api get-model --locale en-US --skill-id `gskill`


const fs = require('fs');
const path = require('path');

const CONFIG_FILE = '.ask/config';

// Break the path into an array of folders and filter out
// the empty entry for the leading '/'
const folders = process.env.PWD.split('/').filter(Boolean);

// findAskConfigFile is a recursive function that searches
// from the Parent Working Directory to one folder below root for
// the .ask/config file.
// For example, if PWD is /Work/amazon/skills/coffee_shop/lambda
// it will look for .ask/config in the following folders:

// /Work/amazon/skills/coffee_shop/lambda
// /Work/amazon/skills/coffee_shop
// /Work/amazon/skills
// /Work/amazon
// /Work

const findAskConfigFile = function (folders) {

    // The ask cli downloads skills into a folder and
    // writes the .ask/config file there. There should
    // never be one at your root.
    if (folders.length <= 0) throw 'No config file found!';

    const directory = folders.join('/');
    const askConfigFile = '/' + path.join(directory, CONFIG_FILE);

    if (fs.existsSync(askConfigFile)) {
        return askConfigFile;
    }

    // if .ask/config doesn't exist in the current directory
    // look in the one above by removing the last item from
    // folders and call findAskConfigFile again.
    folders.pop();
    return findAskConfigFile(folders);
};

const configFile = findAskConfigFile(folders);

if (configFile) {
    fs.readFile(configFile, 'utf8', function (err, data) {
        if (err) throw err;
        // prase the JSON
        obj = JSON.parse(data);
        // print the skill id
        console.log(obj.deploy_settings.default.skill_id);
    });
}