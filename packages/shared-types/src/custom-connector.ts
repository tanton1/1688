export type CustomConnectorProtocol = "REST_JSON" | "GRAPHQL" | "WEBHOOK";
export type CustomConnectorAuthType = "NONE" | "BEARER" | "API_KEY_HEADER" | "BASIC";

export interface CustomStoreConnectionSummary {
  id: string;
  name: string;
  baseUrl: string;
  protocol: CustomConnectorProtocol;
  authType: CustomConnectorAuthType;
  authHeaderName?: string;
  publishPath: string;
  updatePath?: string;
  inventoryPath?: string;
  graphqlMutation?: string;
  isActive: boolean;
  secretConfigured: boolean;
  lastTestedAt?: string;
  lastError?: string;
  updatedAt: string;
}

export interface CustomStoreConnectionInput {
  id?: string;
  name: string;
  baseUrl: string;
  protocol?: CustomConnectorProtocol;
  authType?: CustomConnectorAuthType;
  authHeaderName?: string;
  /** For BEARER/API_KEY_HEADER use the token; for BASIC use username:password. */
  secret?: string;
  publishPath: string;
  /** May include {externalProductId}. */
  updatePath?: string;
  /** May include {externalProductId}. */
  inventoryPath?: string;
  /** GraphQL mutation; the normalized product is sent in variables.product. */
  graphqlMutation?: string;
}

export interface CustomStoreSyncResult {
  success: boolean;
  connectionId: string;
  productId: string;
  externalProductId?: string;
  externalUrl?: string;
  statusCode?: number;
  message?: string;
  error?: string;
  syncedAt: string;
}
