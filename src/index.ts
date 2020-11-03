import { serve } from 'https://deno.land/std@0.76.0/http/server.ts';
import {
	acceptable,
	acceptWebSocket,
} from 'https://deno.land/std@0.76.0/ws/mod.ts';
import { HandleWSConn } from './server/WebSocket.ts';

const PORT = 8080;
const SERVER = serve({ port: PORT });
console.log(`http://localhost:${PORT}/`);

for await (const req of SERVER) {
	if (acceptable(req)) {
		const { conn, headers, r: bufReader, w: bufWriter } = req;
		acceptWebSocket({ conn, bufReader, bufWriter, headers })
			.then(HandleWSConn)
			.catch(async (err: any) => {
				console.error(`failed to accept websocket: ${err}`);
				await req.respond({ status: 400 });
			});
	} else {
		req.respond({ body: 'Hello World\n' });
	}
}
