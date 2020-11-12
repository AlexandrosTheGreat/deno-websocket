import { acceptWebSocket, ServerRequest } from '../common/Dependency.ts';
import { HandleWSConn } from './WebSocket.ts';

export async function HandleServer(pRequest: ServerRequest): Promise<void> {
	const { conn, headers, r: bufReader, w: bufWriter } = pRequest;
	return acceptWebSocket({ conn, bufReader, bufWriter, headers })
		.then(HandleWSConn)
		.catch(async (err: any) => {
			console.error(`failed to accept websocket: ${err}`);
			await pRequest.respond({ status: 400 });
		});
}
