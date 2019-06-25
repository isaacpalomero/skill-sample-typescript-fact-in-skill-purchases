import { services } from "ask-sdk-model";

export interface RequestAttributes {
  /**
   * Searches for the translation of the given key, replaces the arguments
   * and returns the result.
   *
   * @param key
   * @param args
   */
  t(key: string, ...args: any[]): any;

  /**
   * Randomly picks a translation for the given key and returns it.
   *
   * Note: The value for the key must be an array.
   *
   * @param key
   */
  tr(key: string): string;

  [key: string]: any;
}

export interface MySessionAttributes {
  entitledProducts: services.monetization.InSkillProduct[];
  // [key: string]: any;
}
