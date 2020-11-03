import { serve } from 'https://deno.land/std@0.76.0/http/server.ts';
import { acceptable } from 'https://deno.land/std@0.76.0/ws/mod.ts';
import { HandleServer } from './server/Server.ts';
import { HandleClient } from './client/Client.ts';

const PORT = 8080;
const SERVER = serve({ port: PORT });
console.log(`http://localhost:${PORT}/`);

for await (const req of SERVER) {
	if (acceptable(req)) {
		HandleServer(req);
	} else {
		HandleClient(req);
	}
}
