import { HandlerInput } from "ask-sdk-core";
import { services, RequestEnvelope } from "ask-sdk-model";
import { MySessionAttributes } from "../interfaces";
import { Fact } from "./facts";

/*
    Function to demonstrate how to filter inSkillProduct list to get list of
    all entitled products to render Skill CX accordingly
*/
export function getAllEntitledProducts(inSkillProductList: services.monetization.InSkillProduct[]) {
  const entitledProductList = inSkillProductList.filter((record) => record.entitled === "ENTITLED");
  console.log(`Currently entitled products: ${JSON.stringify(entitledProductList)}`);
  return entitledProductList;
}

export function getRandomFact(facts: Fact[]) {
  const factIndex = Math.floor(Math.random() * facts.length);
  return facts[factIndex].fact;
}

export function getRandomYesNoQuestion() {
  const questions = [
    "Would you like another fact?",
    "Can I tell you another fact?",
    "Do you want to hear another fact?",
  ];
  return questions[Math.floor(Math.random() * questions.length)];
}

export function getRandomGoodbye() {
  const goodbyes = [
    "OK.  Goodbye!",
    "Have a great day!",
    "Come back again soon!",
  ];
  return goodbyes[Math.floor(Math.random() * goodbyes.length)];
}

export function getFilteredFacts(factsToFilter: Fact[], handlerInput: HandlerInput) {
  // lookup entitled products, and filter accordingly
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() as MySessionAttributes;
  const entitledProducts = sessionAttributes.entitledProducts;
  let factTypesToInclude: string[];
  if (entitledProducts) {
    factTypesToInclude = entitledProducts.map((item) => item.name.toLowerCase().replace(" pack", ""));
    factTypesToInclude.push("free");
  } else {
    // no entitled products, so just give free ones
    factTypesToInclude = ["free"];
  }
  console.log(`types to include: ${factTypesToInclude}`);
  if (factTypesToInclude.indexOf("all access") >= 0) {
    return factsToFilter;
  }
  const filteredFacts = factsToFilter
    .filter((record) => factTypesToInclude.indexOf(record.type) >= 0);

  return filteredFacts;
}

/*
    Helper function that returns a speakable list of product names from a list of
    entitled products.
*/
export function getSpeakableListOfProducts(entitleProductsList: services.monetization.InSkillProduct[]) {
  const productNameList = entitleProductsList.map((item) => item.name);
  let productListSpeech = productNameList.join(", "); // Generate a single string with comma separated product names
  productListSpeech = productListSpeech.replace(/_([^_]*)$/, "and $1"); // Replace last comma with an 'and '
  return productListSpeech;
}

export function getResolvedValue(requestEnvelope: RequestEnvelope, slotName: string) {
  if (requestEnvelope &&
    requestEnvelope.request &&
    requestEnvelope.request.type === "IntentRequest" &&
    requestEnvelope.request.intent &&
    requestEnvelope.request.intent.slots &&
    requestEnvelope.request.intent.slots[slotName] &&
    requestEnvelope.request.intent.slots[slotName].resolutions &&
    requestEnvelope.request.intent.slots[slotName].resolutions!.resolutionsPerAuthority &&
    requestEnvelope.request.intent.slots[slotName].resolutions!.resolutionsPerAuthority![0] &&
    requestEnvelope.request.intent.slots[slotName].resolutions!.resolutionsPerAuthority![0].values &&
    requestEnvelope.request.intent.slots[slotName].resolutions!.resolutionsPerAuthority![0]
      .values[0] &&
    requestEnvelope.request.intent.slots[slotName].resolutions!.resolutionsPerAuthority![0].values[0]
      .value &&
    requestEnvelope.request.intent.slots[slotName].resolutions!.resolutionsPerAuthority![0].values[0]
      .value.name) {
    return requestEnvelope.request.intent.slots[slotName].resolutions!
      .resolutionsPerAuthority![0].values[0].value.name;
  }
  return undefined;
}

export function getSpokenValue(requestEnvelope: RequestEnvelope, slotName: string) {
  if (requestEnvelope &&
    requestEnvelope.request &&
    requestEnvelope.request.type === "IntentRequest" &&
    requestEnvelope.request.intent &&
    requestEnvelope.request.intent.slots &&
    requestEnvelope.request.intent.slots[slotName] &&
    requestEnvelope.request.intent.slots[slotName].value) {
    return requestEnvelope.request.intent.slots[slotName].value;
  }
  return undefined;
}

export function isProduct(product: services.monetization.InSkillProduct[]) {
  return product && product.length > 0;
}

export function isEntitled(product: services.monetization.InSkillProduct[]) {
  return isProduct(product) && product[0].entitled === "ENTITLED";
}

/*
function getProductByProductId(productId) {
  var product_record = res.inSkillProducts.filter(record => record.referenceName == productRef);
}
*/
