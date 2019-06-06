// Alexa Fact Skill - Sample for Beginners
/* eslint no-use-before-define: 0 */
// sets up dependencies
import { Response, services, interfaces } from "ask-sdk-model";
import {
  SkillBuilders,
  RequestInterceptor,
  RequestHandler,
  HandlerInput,
  ErrorHandler as ASKErrorHandler,
  ResponseInterceptor,
} from "ask-sdk-core";
import { MySessionAttributes } from "./interfaces";
import { ALL_FACTS, Fact } from "./lib/facts";
import { getAllEntitledProducts, getFilteredFacts, getRandomFact, getRandomGoodbye, getRandomYesNoQuestion, getSpeakableListOfProducts, getResolvedValue, isProduct, getSpokenValue, isEntitled } from "./lib/helpers";

const skillName = "Premium Facts Sample";
/* eslint-disable no-console */
/* eslint no-use-before-define: ["error", {"functions": false}] */
/* eslint-disable prefer-destructuring */
/* eslint-disable prefer-arrow-callback */

class LaunchRequestHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "LaunchRequest";
  }
  public handle(handlerInput: HandlerInput): Response {
    console.log("IN: LaunchRequestHandler.handle");

    // entitled products are obtained by request interceptor and stored in the session attributes
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() as MySessionAttributes;
    const entitledProducts = sessionAttributes.entitledProducts;

    if (entitledProducts && entitledProducts.length > 0) {
      // Customer owns one or more products
      return handlerInput.responseBuilder
        .speak(`Welcome to ${skillName}. You currently own ${getSpeakableListOfProducts(entitledProducts)}` +
          " products. To hear a random fact, you could say, 'Tell me a fact' or you can ask" +
          " for a specific category you have purchased, for example, say 'Tell me a science fact'. " +
          " To know what else you can buy, say, 'What can i buy?'. So, what can I help you" +
          " with?")
        .reprompt("I didn't catch that. What can I help you with?")
        .getResponse();
    }

    // Not entitled to anything yet.
    console.log("No entitledProducts");
    return handlerInput.responseBuilder
      .speak(`Welcome to ${skillName}. To hear a random fact you can say 'Tell me a fact',` +
        " or to hear about the premium categories for purchase, say 'What can I buy'. " +
        " For help, say , 'Help me'... So, What can I help you with?")
      .reprompt("I didn't catch that. What can I help you with?")
      .getResponse();
  }
} // End LaunchRequestHandler

class HelpHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    const request = handlerInput.requestEnvelope.request;
    return request.type === "IntentRequest"
      && request.intent.name === "AMAZON.HelpIntent";
  }
  public handle(handlerInput: HandlerInput): Response {
    return handlerInput.responseBuilder
      .speak("To hear a random fact, you could say, 'Tell me a fact' or you can ask" +
        " for a specific category you have purchased, for example, say 'Tell me a science fact'. " +
        " To know what else you can buy, say, 'What can i buy?'. So, what can I help you" +
        " with?")
      .reprompt("I didn't catch that. What can I help you with?")
      .getResponse();
  }
}

// IF THE USER SAYS YES, THEY WANT ANOTHER FACT.
class YesHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      (handlerInput.requestEnvelope.request.intent.name === "AMAZON.YesIntent" ||
        handlerInput.requestEnvelope.request.intent.name === "GetRandomFactIntent");
  }
  public handle(handlerInput: HandlerInput): Response {
    console.log("In YesHandler");

    // reduce fact list to those purchased
    const filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);

    const speakOutput = `Here's your random fact: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
    const repromptOutput = getRandomYesNoQuestion();

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  }
}

// IF THE USER SAYS NO, THEY DON'T WANT ANOTHER FACT.  EXIT THE SKILL.
class NoHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.NoIntent";
  }
  public handle(handlerInput: HandlerInput): Response {
    console.log("IN: NoHandler.handle");

    const speakOutput = getRandomGoodbye();

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
}

class GetCategoryFactHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "GetCategoryFactIntent";
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("In GetCategoryFactHandler");

    const factCategory = getResolvedValue(handlerInput.requestEnvelope, "factCategory");
    console.log(`FACT CATEGORY = XX ${factCategory} XX`);
    let categoryFacts = ALL_FACTS;

    // these are all used somewhere in the if-else statement
    let speakOutput: string;
    let repromptOutput: string;

    // IF THERE WAS NOT AN ENTITY RESOLUTION MATCH FOR THIS SLOT VALUE
    if (factCategory === undefined) {
      const slotValue = getSpokenValue(handlerInput.requestEnvelope, "factCategory");
      let speakPrefix = "";
      if (slotValue !== undefined) { speakPrefix = `I heard you say ${slotValue}. `; }
      speakOutput = `${speakPrefix} I don't have facts for that category.  You can ask for science, space, or history facts.  Which one would you like?`;
      repromptOutput = "Which fact category would you like?  I have science, space, or history.";

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    }

    // these are all used somewhere in the switch statement
    let filteredFacts: Fact[];
    let upsellMessage: string;
    let locale: string;
    let ms: services.monetization.MonetizationServiceClient;
    let subscription: services.monetization.InSkillProduct[];
    let categoryProduct: services.monetization.InSkillProduct[];

    switch (factCategory) {
      case "free":
        // don't need to buy 'free' category, so give what was asked
        categoryFacts = ALL_FACTS.filter((record) => record.type === factCategory);
        speakOutput = `Here's your ${factCategory} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
        repromptOutput = getRandomYesNoQuestion();
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      case "random":
      case "all_access":
        // choose from the available facts based on entitlements
        filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
        speakOutput = `Here's your random fact: ${getRandomFact(filteredFacts)} ${getRandomYesNoQuestion()}`;
        repromptOutput = getRandomYesNoQuestion();
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      default:
        // IF THERE WAS AN ENTITY RESOLUTION MATCH FOR THIS SLOT VALUE
        categoryFacts = ALL_FACTS.filter((record) => record.type === factCategory);
        locale = handlerInput.requestEnvelope.request.locale!;
        ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();

        return ms.getInSkillProducts(locale).then(function checkForProductAccess(result) {
          subscription = result.inSkillProducts.filter((record) => record.referenceName === "all_access");
          categoryProduct = result.inSkillProducts.filter((record) => record.referenceName === `${factCategory}_pack`);

          // IF USER HAS ACCESS TO THIS PRODUCT
          if (isEntitled(subscription) || isEntitled(categoryProduct)) {
            speakOutput = `Here's your ${factCategory} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
            repromptOutput = getRandomYesNoQuestion();

            return handlerInput.responseBuilder
              .speak(speakOutput)
              .reprompt(repromptOutput)
              .getResponse();
          }

          if (categoryProduct[0]) {
            // the category requested is an available product
            upsellMessage = `You don't currently own the ${factCategory} pack. ${categoryProduct[0].summary} Want to learn more?`;

            return handlerInput.responseBuilder
              .addDirective({
                type: "Connections.SendRequest",
                name: "Upsell",
                payload: {
                  InSkillProduct: {
                    productId: categoryProduct[0].productId,
                  },
                  upsellMessage,
                },
                token: "correlationToken",
              } as interfaces.connections.SendRequestDirective)
              .getResponse();
          }

          // no category for what was requested
          // either product not created or not available
          console.log(`ALERT!  The category **${factCategory}** seemed to be valid, but no matching product was found. `
            + " This could be due to no ISPs being created and linked to the skill, the ISPs being created "
            + " incorrectly, the locale not supporting ISPs, or the customer's account being from an unsupported marketplace.");

          speakOutput = `I'm having trouble accessing the ${factCategory} facts right now.  Try a different category for now.  ${getRandomYesNoQuestion()}`;
          repromptOutput = getRandomYesNoQuestion();

          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        });
    }
  }
}

// Following handler demonstrates how skills can handle user requests to discover what
// products are available for purchase in-skill.
// Use says: Alexa, ask Premium facts what can i buy
class WhatCanIBuyHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "WhatCanIBuyIntent";
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("In WhatCanIBuy Handler");

    // Inform the user about what products are available for purchase
    let speakOutput: string;
    let repromptOutput: string;
    const locale = handlerInput.requestEnvelope.request.locale!;
    const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function fetchPurchasableProducts(result) {
      const purchasableProducts = result.inSkillProducts.filter((record) => record.entitled === "NOT_ENTITLED" && record.purchasable === "PURCHASABLE");

      if (purchasableProducts.length > 0) {
        speakOutput = `Products available for purchase at this time are ${getSpeakableListOfProducts(purchasableProducts)}` +
          ". To learn more about a product, say 'Tell me more about' followed by the product name. " +
          " If you are ready to buy say 'Buy' followed by the product name. So what can I help you with?";
        repromptOutput = "I didn't catch that. What can I help you with?";

        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // no products!
      console.log("!!! ALERT !!!  The product list came back as empty.  This could be due to no ISPs being created and linked to the skill, the ISPs being created "
        + " incorrectly, the locale not supporting ISPs, or the customer's account being from an unsupported marketplace.");
      speakOutput = "I've checked high and low, however I can't find any products to offer to you right now.  Sorry about that.  "
        + "I can\t guarantee it, but I might be able to find something later.  Would you like a random fact now instead?";
      repromptOutput = "I didn't catch that. What can I help you with?";

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .getResponse();
    });
  }
}

// Following handler demonstrates how skills can handle user requests to discover what
// products are available for purchase in-skill.
// Use says: Alexa, ask Premium facts to tell me about the history pack
class ProductDetailHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "ProductDetailIntent";
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("IN PRODUCT DETAIL HANDLER");

    // Describe the requested product to the user using localized information
    // from the entitlements API

    const locale = handlerInput.requestEnvelope.request.locale!;
    const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function fetchProductDetails(result) {
      let productCategory = getResolvedValue(handlerInput.requestEnvelope, "productCategory");
      const spokenCategory = getSpokenValue(handlerInput.requestEnvelope, "productCategory");

      // nothing spoken for the slot value
      if (spokenCategory === undefined) {
        return handlerInput.responseBuilder
          .addDelegateDirective()
          .getResponse();
      }

      // NO ENTITY RESOLUTION MATCH
      if (productCategory === undefined) {
        return handlerInput.responseBuilder
          .speak("I don't think we have a product by that name.  Can you try again?")
          .reprompt("I didn't catch that. Can you try again?")
          .getResponse();
      }

      if (productCategory !== "all_access") { productCategory += "_pack"; }

      const product = result.inSkillProducts.filter((record) => record.referenceName === productCategory);

      if (isProduct(product)) {
        const speakOutput = `${product[0].summary}. To buy it, say Buy ${product[0].name}. `;
        const repromptOutput = `I didn't catch that. To buy ${product[0].name}, say Buy ${product[0].name}. `;
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }

      console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
        + " incorrectly, the locale not supporting ISPs, or the customer's account being from an unsupported marketplace.");

      return handlerInput.responseBuilder
        .speak("I can't find a product by that name.  Can you try again?")
        .reprompt("I didn't catch that. Can you try again?")
        .getResponse();
    });
  }
}

// Following handler demonstrates how Skills would receive Buy requests from customers
// and then trigger a Purchase flow request to Alexa
class BuyHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "BuyIntent";
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("IN: BuyHandler.handle");

    // Inform the user about what products are available for purchase

    const locale = handlerInput.requestEnvelope.request.locale!;
    const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function initiatePurchase(result) {
      let productCategory = getResolvedValue(handlerInput.requestEnvelope, "productCategory");

      // NO ENTITY RESOLUTION MATCH
      if (productCategory === undefined) {
        productCategory = "all_access";
      } else if (productCategory !== "all_access") {
        productCategory += "_pack";
      }

      const product = result.inSkillProducts
        .filter((record) => record.referenceName === productCategory!);

      if (product.length > 0) {
        return handlerInput.responseBuilder
          .addDirective({
            type: "Connections.SendRequest",
            name: "Buy",
            payload: {
              InSkillProduct: {
                productId: product[0].productId,
              },
            },
            token: "correlationToken",
          } as interfaces.connections.SendRequestDirective)
          .getResponse();
      }

      // requested product didn't match something from the catalog
      console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
        + " incorrectly, the locale not supporting ISPs, or the customer's account being from an unsupported marketplace.");

      return handlerInput.responseBuilder
        .speak("I don't think we have a product by that name.  Can you try again?")
        .reprompt("I didn't catch that. Can you try again?")
        .getResponse();
    });
  }
}

// Following handler demonstrates how Skills would receive Cancel requests from customers
// and then trigger a cancel request to Alexa
// User says: Alexa, ask <skill name> to cancel <product name>
class CancelSubscriptionHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "CancelSubscriptionIntent";
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("IN: CancelSubscriptionHandler.handle");

    const locale = handlerInput.requestEnvelope.request.locale!;
    const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();

    return ms.getInSkillProducts(locale).then(function initiateCancel(result) {
      let productCategory = getResolvedValue(handlerInput.requestEnvelope, "productCategory");

      if (productCategory === undefined) {
        productCategory = "all_access";
      } else if (productCategory !== "all_access") {
        productCategory += "_pack";
      }

      const product = result.inSkillProducts
        .filter((record) => record.referenceName === productCategory);

      if (product.length > 0) {
        return handlerInput.responseBuilder
          .addDirective({
            type: "Connections.SendRequest",
            name: "Cancel",
            payload: {
              InSkillProduct: {
                productId: product[0].productId,
              },
            },
            token: "correlationToken",
          } as interfaces.connections.SendRequestDirective)
          .getResponse();
      }

      // requested product didn't match something from the catalog
      console.log(`!!! ALERT !!!  The requested product **${productCategory}** could not be found.  This could be due to no ISPs being created and linked to the skill, the ISPs being created `
        + " incorrectly, the locale not supporting ISPs, or the customer's account being from an unsupported marketplace.");

      return handlerInput.responseBuilder
        .speak("I don't think we have a product by that name.  Can you try again?")
        .reprompt("I didn't catch that. Can you try again?")
        .getResponse();
    });
  }
}

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A BUY or UPSELL OCCURS.
class BuyResponseHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "Connections.Response" &&
      (handlerInput.requestEnvelope.request.name === "Buy" ||
        handlerInput.requestEnvelope.request.name === "Upsell");
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("IN: BuyResponseHandler.handle");
    const request = handlerInput.requestEnvelope.request as interfaces.connections.ConnectionsResponse;
    const locale = handlerInput.requestEnvelope.request.locale!;
    const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();
    const payload = request.payload!;
    const productId = payload.productId;

    return ms.getInSkillProducts(locale).then(function handlePurchaseResponse(result) {
      const product = result.inSkillProducts.filter((record) => record.productId === productId);

      console.log(`PRODUCT = ${JSON.stringify(product)}`);
      if (request.status && request.status.code === "200") {
        let speakOutput: string;
        let repromptOutput: string;
        let filteredFacts: Fact[];
        let categoryFacts = ALL_FACTS;

        switch (payload.purchaseResult) {
          case "ACCEPTED":
            if (product[0].referenceName !== "all_access") { categoryFacts = ALL_FACTS.filter((record) => record.type === product[0].referenceName.replace("_pack", "")); }

            speakOutput = `You have unlocked the ${product[0].name}.  Here is your ${product[0].referenceName.replace("_pack", "").replace("all_access", "")} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
            repromptOutput = getRandomYesNoQuestion();
            break;
          case "DECLINED":
            if (request.name === "Buy") {
              // response when declined buy request
              speakOutput = `Thanks for your interest in the ${product[0].name}.  Would you like another random fact?`;
              repromptOutput = "Would you like another random fact?";
              break;
            }
            // response when declined upsell request
            filteredFacts = getFilteredFacts(ALL_FACTS, handlerInput);
            speakOutput = `OK.  Here's a random fact: ${getRandomFact(filteredFacts)} Would you like another random fact?`;
            repromptOutput = "Would you like another random fact?";
            break;
          case "ALREADY_PURCHASED":
            // may have access to more than what was asked for, but give them a random
            // fact from the product they asked to buy
            if (product[0].referenceName !== "all_access") { categoryFacts = ALL_FACTS.filter((record) => record.type === product[0].referenceName.replace("_pack", "")); }

            speakOutput = `Here is your ${product[0].referenceName.replace("_pack", "").replace("all_access", "")} fact: ${getRandomFact(categoryFacts)} ${getRandomYesNoQuestion()}`;
            repromptOutput = getRandomYesNoQuestion();
            break;
          default:
            console.log(`unhandled purchaseResult: ${payload.purchaseResult}`);
            speakOutput = `Something unexpected happened, but thanks for your interest in the ${product[0].name}.  Would you like another random fact?`;
            repromptOutput = "Would you like another random fact?";
            break;
        }
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(repromptOutput)
          .getResponse();
      }
      // Something failed.
      console.log(`Connections.Response indicated failure. error: ${(request.status ? request.status.message : "no_status_message")}`);

      return handlerInput.responseBuilder
        .speak("There was an error handling your purchase request. Please try again or contact us for help.")
        .getResponse();
    });
  }
}

// THIS HANDLES THE CONNECTIONS.RESPONSE EVENT AFTER A CANCEL OCCURS.
class CancelResponseHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "Connections.Response" &&
      handlerInput.requestEnvelope.request.name === "Cancel";
  }
  public async handle(handlerInput: HandlerInput): Promise<Response> {
    console.log("IN: CancelResponseHandler.handle");

    const request = handlerInput.requestEnvelope.request as interfaces.connections.ConnectionsResponse;

    const locale = request.locale!;
    const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();
    const productId = request.payload!.productId;

    return ms.getInSkillProducts(locale).then(function handleCancelResponse(result) {
      const product = result.inSkillProducts.filter((record) => record.productId === productId);
      console.log(`PRODUCT = ${JSON.stringify(product)}`);
      if (request.status && request.status.code === "200") {
        if (request.payload!.purchaseResult === "ACCEPTED") {
          const speakOutput = `You have successfully cancelled your subscription. ${getRandomYesNoQuestion()}`;
          const repromptOutput = getRandomYesNoQuestion();
          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }
        if (request.payload!.purchaseResult === "NOT_ENTITLED") {
          const speakOutput = `You don't currently have a subscription to cancel. ${getRandomYesNoQuestion()}`;
          const repromptOutput = getRandomYesNoQuestion();
          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(repromptOutput)
            .getResponse();
        }
      }
      // Something failed.
      console.log(`Connections.Response indicated failure. error: ${(request.status ? request.status.message : "no_status_message")}`);

      return handlerInput.responseBuilder
        .speak("There was an error handling your purchase request. Please try again or contact us for help.")
        .getResponse();
    });
  }
}

class SessionEndedHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "SessionEndedRequest" ||
      (handlerInput.requestEnvelope.request.type === "IntentRequest" && handlerInput.requestEnvelope.request.intent.name === "AMAZON.StopIntent") ||
      (handlerInput.requestEnvelope.request.type === "IntentRequest" && handlerInput.requestEnvelope.request.intent.name === "AMAZON.CancelIntent");
  }
  public handle(handlerInput: HandlerInput): Response {
    console.log("IN: SessionEndedHandler.handle");
    return handlerInput.responseBuilder
      .speak(getRandomGoodbye())
      .getResponse();
  }
}

class FallbackHandler implements RequestHandler {
  public canHandle(handlerInput: HandlerInput): boolean {
    return handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.FallbackIntent";
  }
  public handle(handlerInput: HandlerInput): Response {
    console.log("IN FallbackHandler");
    return handlerInput.responseBuilder
      .speak("Sorry, I didn't understand what you meant. Please try again.")
      .reprompt("Sorry, I didn't understand what you meant. Please try again.")
      .getResponse();
  }
}

class ErrorHandler implements ASKErrorHandler {
  public canHandle(_handlerInput: HandlerInput, _error: Error): boolean {
    return true;
  }
  public handle(handlerInput: HandlerInput, error: Error): Response {
    console.log(`Error handled: ${JSON.stringify(error.message)}`);
    console.log(`handlerInput: ${JSON.stringify(handlerInput)}`);
    return handlerInput.responseBuilder
      .speak("Sorry, I didn't understand what you meant. Please try again.")
      .reprompt("Sorry, I didn't understand what you meant. Please try again.")
      .getResponse();
  }
}

export class RequestLog implements RequestInterceptor {
  public process(handlerInput: HandlerInput) {
    console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
  }
}

export class EntitledProductsCheck implements RequestInterceptor {
  public async process(handlerInput: HandlerInput): Promise<void> {
    const session = handlerInput.requestEnvelope.session;
    if (session && session.new === true) {
      // new session, check to see what products are already owned.
      try {
        const locale = handlerInput.requestEnvelope.request.locale;
        const ms = handlerInput.serviceClientFactory!.getMonetizationServiceClient();
        const result = await ms.getInSkillProducts(locale!);
        const entitledProducts = getAllEntitledProducts(result.inSkillProducts);
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes() as MySessionAttributes;
        sessionAttributes.entitledProducts = entitledProducts;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
      } catch (error) {
        console.log(`Error calling InSkillProducts API: ${error}`);
      }
    }
  }
}

export class ResponseLog implements ResponseInterceptor {
  public process(handlerInput: HandlerInput) {
    console.log(`RESPONSE BUILDER = ${JSON.stringify(handlerInput)}`);
    console.log(`RESPONSE = ${JSON.stringify(handlerInput.responseBuilder.getResponse())}`);
  }
}

const skillBuilder = SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    new LaunchRequestHandler(),
    new YesHandler(),
    new NoHandler(),
    new GetCategoryFactHandler(),
    new BuyResponseHandler(),
    new CancelResponseHandler(),
    new WhatCanIBuyHandler(),
    new ProductDetailHandler(),
    new BuyHandler(),
    new CancelSubscriptionHandler(),
    new SessionEndedHandler(),
    new HelpHandler(),
    new FallbackHandler(),
  )
  .addRequestInterceptors(
    new RequestLog(),
    new EntitledProductsCheck(),
  )
  .addResponseInterceptors(new ResponseLog())
  .addErrorHandlers(new ErrorHandler())
  .withCustomUserAgent("sample/premium-fact/v1")
  .lambda();
