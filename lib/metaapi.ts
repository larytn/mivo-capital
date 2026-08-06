import MetaApi from "metaapi.cloud-sdk/esm-node";

let metaApiInstance: MetaApi | null = null;

export function getMetaApi() {
  const token = process.env.META_API_TOKEN;

  if (!token) {
    throw new Error(
      "META_API_TOKEN is missing from environment variables."
    );
  }

  if (!metaApiInstance) {
    metaApiInstance = new MetaApi(token);
  }

  return metaApiInstance;
}