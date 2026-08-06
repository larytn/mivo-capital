import MetaApi from "metaapi.cloud-sdk/esm-node";

const token = process.env.META_API_TOKEN;

if (!token) {
  throw new Error(
    "META_API_TOKEN is missing from environment variables."
  );
}

export const metaApi = new MetaApi(token);