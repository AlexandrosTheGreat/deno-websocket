import {
	isWebSocketCloseEvent,
	isWebSocketPingEvent,
	WebSocket,
} from 'https://deno.land/std@0.76.0/ws/mod.ts';

import {
	GetConnections,
	AddConn,
	RemoveConnById,
	CheckConnById,
} from './Connections.ts';

export async function HandleWSConn(pWebSocket: WebSocket): Promise<void> {
	const _connId = await AddConn(pWebSocket);
	console.log('socket connected!', _connId);
	try {
		for await (const event of pWebSocket) {
			if (typeof event === 'string') {
				// text message.
				console.log(`ws:Text = ${event}`);
				for (const conn of await GetConnections()) {
					if (_connId !== conn.id && (await CheckConnById(conn.id))) {
						await conn.ws.send(
							`Text: ${_connId} -> ${conn.id}: ${event}`
						);
					}
				}
			} else if (event instanceof Uint8Array) {
				// binary message.
				console.log('ws:Binary', event);
			} else if (isWebSocketPingEvent(event)) {
				// ping.
				const [, body] = event;
				console.log('ws:Ping', _connId, body);
			} else if (isWebSocketCloseEvent(event)) {
				// close.
				const { code, reason } = event;
				console.log('ws:Close', _connId, code, reason);
				await RemoveConnById(_connId);
			} else {
				console.log('Another type: ', typeof event, event);
			}
		}
	} catch (err) {
		console.error(`failed to receive frame: ${err}`);
		if (!pWebSocket.isClosed) {
			await pWebSocket.close(1000).catch(console.error);
		}
	}
}
