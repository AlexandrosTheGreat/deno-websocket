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
 * r: Response status
 */
type WSMsgJoin = { h: 'join'; d: string };
type WSMsgLeave = { h: 'leave'; d: string };
type WSMsgChat = { h: 'chat'; s: string; d: string };
type WSMessageClient = WSMsgJoin | WSMsgLeave | WSMsgChat;

type WSMsgJoinResp = { h: 'joinResp'; s: string; r: string };
type WSMsgLeaveResp = { h: 'leaveResp'; r: string };
type WSMsgChatResp = { h: 'chatResp'; d: string; r: string };
type WSMessageServer = WSMsgJoinResp | WSMsgLeaveResp | WSMsgChatResp;

type WSMessage = WSMessageClient | WSMessageServer;

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
						const _name = objEvent.d;
						if (/^[a-zA-Z0-1]+$/i.test(_name)) {
							_conn.state = true;
							_conn.name = objEvent.d;
							await BroadcastJoin(_connInfo);
							await RespondJoin(_connInfo, 'OK');
							await RespondAddUserToPanel(_connInfo);
						} else {
							await RespondJoin(_connInfo, 'Invalid username');
						}
						break;
					}
					case 'leave': {
						_conn.name = '';
						_conn.state = false;
						await BroadcastLeave(_connInfo);
						await RespondLeave(_connInfo, 'OK');
						break;
					}
					case 'chat': {
						if (_connInfo.conn.state) {
							await BroadcastChat(_connInfo, objEvent.d);
							await RespondChat(_connInfo, 'OK', objEvent.d);
						} else {
							await RespondChat(_connInfo, 'Invalid', objEvent.d);
						}
						break;
					}
					default: {
						console.log('Invalid message', objEvent);
						break;
					}
				}
			} else if (isWebSocketCloseEvent(event)) {
				console.log(`Socket disconnected! :: ${_connId}`);
				if (_connInfo.conn.state) {
					await BroadcastLeave(_connInfo);
				}
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

async function RespondJoin(pConnInfo: ConnInfo, pStatus: string) {
	const { id: _Id, conn: _Conn } = pConnInfo;
	const { name: _Name } = _Conn;
	return Respond(pConnInfo, {
		h: 'joinResp',
		s: _Name,
		r: pStatus,
	});
}

async function RespondLeave(pConnInfo: ConnInfo, pStatus: string) {
	return Respond(pConnInfo, {
		h: 'leaveResp',
		r: pStatus,
	});
}

async function RespondChat(
	pConnInfo: ConnInfo,
	pStatus: string,
	pChatMsg: string
) {
	return Respond(pConnInfo, {
		h: 'chatResp',
		d: pChatMsg,
		r: pStatus,
	});
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

function BroadcastChat(pSrcInfo: ConnInfo, pChatMsg: string) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		h: 'chat',
		s: _SenderName,
		d: pChatMsg,
	});
}

async function Broadcast(pSrcId: string, pMessage: WSMessage): Promise<void> {
	for (const pTgtInfo of await GetConnections()) {
		const { id: _TargetId, conn: _TargetConn } = pTgtInfo;
		const { ws: _TargetWS } = _TargetConn;
		if (pSrcId !== _TargetId && (await CheckConnById(_TargetId))) {
			await _TargetWS.send(JSON.stringify(pMessage));
		}
	}
}

async function Respond(
	pConnInfo: ConnInfo,
	pMessage: WSMessage
): Promise<void> {
	const { id: _Id, conn: _Conn } = pConnInfo;
	const { name: _Name, ws: _WS } = _Conn;
	if (await CheckConnById(_Id)) {
		await _WS.send(JSON.stringify(pMessage));
	}
}

async function RespondAddUserToPanel(pConnInfo: ConnInfo): Promise<void> {
	const { id: _Id, conn: _Conn } = pConnInfo;
	const { name: _Name, ws: _WS } = _Conn;
	await _WS.send(
		JSON.stringify({
			h: 'addUserToPanel',
			data: { id: _Id, name: _Name },
		})
	);
}
