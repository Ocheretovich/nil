import {
	HttpTransport,
	PublicClient,
} from "@nilfoundation/niljs";

import NIL_RPC_ENDPOINT from "../constants";

export async function createClient() {
	const endpoint = NIL_RPC_ENDPOINT;

	if (!endpoint) {
		throw new Error("RPC_ENDPOINT is not set in environment variables");
	}

	const publicClient = new PublicClient({
		transport: new HttpTransport({
			endpoint: endpoint,
		}),
		shardId: 1,
	});

	return {  publicClient };
}