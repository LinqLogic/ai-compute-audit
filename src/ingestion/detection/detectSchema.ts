import { SchemaType } from '../types';
import { scoreSchema } from '../utils/columnMatching';

export function detectSchema(headers: string[]): SchemaType {
  return scoreSchema(headers).schema;
}
