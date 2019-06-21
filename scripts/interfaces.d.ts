export module AskConfig {
    export interface Root {
        deploy_settings: AskConfig.DeploySettings;
    }

    interface DeploySettings {
        [key: string]: Profile;
    }

    interface Profile {
        skill_id: string;
        was_cloned: boolean;
        merge: {} //Deprecated
        resources?: Resources;
        in_skill_products?: InSkillProduct[];
    }

    interface Resources {
        manifest: {
            eTag: string
        };
        interactionModel: {
            [key: string]: { eTag: string }
        };
        lambda?: Lambda;
    }
    interface Lambda {
        alexaUsage: string[],
        arn: string;
        awsRegion: string;
        codeUri: string;
        functionName: string;
        handler: string;
        revisionId: string;
        runtime: string;
    }
    interface InSkillProduct {
        deploy_status: "Add" | "Associate" | "Update" | "Remove" | "Update";
        filePath: string;
        productId?: string;
        eTag?: string;
    }
}
