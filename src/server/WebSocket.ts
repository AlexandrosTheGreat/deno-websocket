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
	ConnInfo,
} from './Connections.ts';

/**
 * h: Handler
 * s: Sender
 * d: Data
 */
type WSMsgJoin = { h: 'join'; d: String };
type WSMsgLeave = { h: 'leave'; d: String };
type WSMsgChat = { h: 'chat'; s: String; d: String };
type WSMessage = WSMsgJoin | WSMsgLeave | WSMsgChat;

export async function HandleWSConn(pWebSocket: WebSocket): Promise<void> {
	const _connInfo = await AddConn(pWebSocket);
	const { id: _connId, conn: _conn } = _connInfo;
	console.log(`Socket connected! :: ${_connId}`);
	try {
		for await (const event of pWebSocket) {
			if (typeof event === 'string') {
				const objEvent: WSMessage = JSON.parse(event);
				switch (objEvent.h) {
					case 'join': {
						_conn.state = true;
						_conn.name = objEvent.d;
						await BroadcastJoin(_connInfo);
						break;
					}
					case 'leave': {
						await BroadcastLeave(_connInfo);
						_conn.name = '';
						_conn.state = false;
						break;
					}
					case 'chat': {
						await BroadcastChat(_connInfo, objEvent.d);
						break;
					}
					default: {
						console.log('Invalid message', objEvent);
						break;
					}
				}
			} /*else if (event instanceof Uint8Array) {
				// binary message.
				console.log('ws:Binary', event);
			} else if (isWebSocketPingEvent(event)) {
				// ping.
				const [, body] = event;
				console.log('ws:Ping', _connId, body);
			}*/ else if (
				isWebSocketCloseEvent(event)
			) {
				console.log(`Socket disconnected! :: ${_connId}`);
				await RemoveConnById(_connId);
			} else {
				console.log(`Another type: ${typeof event}`, event);
			}
		}
	} catch (err) {
		console.error(`Error: ${err}`);
		if (!pWebSocket.isClosed) {
			await pWebSocket.close(1000).catch(console.error);
		}
	}
}

function BroadcastJoin(pSrcInfo: ConnInfo) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		h: 'join',
		d: _SenderName,
	});
}

function BroadcastLeave(pSrcInfo: ConnInfo) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		h: 'leave',
		d: _SenderName,
	});
}

function BroadcastChat(pSrcInfo: ConnInfo, pChatMsg: String) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		h: 'chat',
		s: _SenderName,
		d: pChatMsg,
	});
}

async function Broadcast(pSrcId: String, pMessage: WSMessage): Promise<void> {
	for (const pTgtInfo of await GetConnections()) {
		const { id: _TargetId, conn: _TargetConn } = pTgtInfo;
		const { ws: _TargetWS } = _TargetConn;
		if (pSrcId !== _TargetId && (await CheckConnById(_TargetId))) {
			await _TargetWS.send(JSON.stringify(pMessage));
		}
	}
}
