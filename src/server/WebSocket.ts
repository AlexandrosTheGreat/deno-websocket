import { v4 } from 'https://deno.land/std@0.76.0/uuid/mod.ts';
import { isWebSocketCloseEvent, WebSocket } from '../common/Dependency.ts';

import {
	GetConnections,
	AddConn,
	RemoveConnById,
	CheckConnById,
	ConnInfo,
	FindConnByName,
} from './Connections.ts';

import { UPPERCASE_USERNAMES } from './Configuration.ts';

type FileInfo = { data: string; name: string };
const UserFiles: Map<string, FileInfo> = new Map();
const enum MsgStatus {
	OK = 'OK',
	NOK = 'NOK',
	INVALID = 'INVALID',
	USERNAME_INVALID = 'USERNAME_INVALID',
	USERNAME_IN_USE = 'USERNAME_IN_USE',
	NOT_IN_CHAT = 'NOT_IN_CHAT',
	ALREADY_IN_CHAT = 'ALREADY_IN_CHAT',
}

/**
 * h: Handler
 * s: Sender
 * d: Data
 * r: Message status
 */
type WSMsgJoin = { h: 'join'; d: string };
type WSMsgLeave = { h: 'leave'; d: string };
type WSMsgChat = { h: 'chat'; s: string; d: string };
type WSMsgGetUsers = { h: 'getUsers' };
type WSMsgSendFiles = {
	h: 'sendFiles';
	s?: string;
	d: { id?: string; file: FileInfo };
};
type WSMessageClient =
	| WSMsgJoin
	| WSMsgLeave
	| WSMsgChat
	| WSMsgGetUsers
	| WSMsgSendFiles;

type WSMsgConnectResp = { h: 'connectResp'; d: string; r: MsgStatus };
type WSMsgJoinResp = { h: 'joinResp'; s: string; r: MsgStatus };
type WSMsgLeaveResp = { h: 'leaveResp'; r: MsgStatus };
type WSMsgChatResp = { h: 'chatResp'; d: string; r: MsgStatus };
type WSMsgGetUsersResp = {
	h: 'getUsersResp';
	userList: Array<string>;
	r: MsgStatus;
};
type WSMsgSendFilesResp = {
	h: 'sendFilesResp';
	d: { id: string; file: FileInfo };
};
type WSMessageServer =
	| WSMsgConnectResp
	| WSMsgJoinResp
	| WSMsgLeaveResp
	| WSMsgChatResp
	| WSMsgGetUsersResp
	| WSMsgSendFilesResp;

type WSMessage = WSMessageClient | WSMessageServer;

export async function HandleWSConn(pWebSocket: WebSocket): Promise<void> {
	const _connInfo = await AddConn(pWebSocket);
	const { id: _connId, conn: _conn } = _connInfo;
	console.log(`Socket connected! :: ${_connId}`);
	try {
		await RespondeConnect(_connInfo, MsgStatus.OK);
		for await (const event of pWebSocket) {
			if (typeof event === 'string') {
				const objEvent: WSMessage = JSON.parse(event);
				switch (objEvent.h) {
					case 'join': {
						if (!_conn.state) {
							const _name = UPPERCASE_USERNAMES
								? objEvent.d.toUpperCase()
								: objEvent.d;
							if (!/^[a-zA-Z0-9]+$/i.test(_name)) {
								await RespondJoin(
									_connInfo,
									MsgStatus.USERNAME_INVALID
								);
							} else if (await FindConnByName(_name)) {
								await RespondJoin(
									_connInfo,
									MsgStatus.USERNAME_IN_USE
								);
							} else {
								_conn.state = true;
								_conn.name = _name;
								await BroadcastJoin(_connInfo);
								await RespondJoin(_connInfo, MsgStatus.OK);
							}
						} else {
							await RespondJoin(
								_connInfo,
								MsgStatus.ALREADY_IN_CHAT
							);
						}
						break;
					}
					case 'leave': {
						if (_conn.state) {
							await BroadcastLeave(_connInfo);
							_conn.name = '';
							_conn.state = false;
							await RespondLeave(_connInfo, MsgStatus.OK);
						} else {
							await RespondLeave(
								_connInfo,
								MsgStatus.NOT_IN_CHAT
							);
						}
						break;
					}
					case 'chat': {
						if (_conn.state) {
							await BroadcastChat(_connInfo, objEvent.d);
							await RespondChat(
								_connInfo,
								MsgStatus.OK,
								objEvent.d
							);
						} else {
							await RespondChat(
								_connInfo,
								MsgStatus.NOT_IN_CHAT,
								objEvent.d
							);
						}
						break;
					}
					case 'getUsers': {
						if (_conn.state) {
							const lUser = (await GetConnections()).map(
								(pConnection) => pConnection.conn.name
							);
							await RespondGetUsers(
								_connInfo,
								lUser,
								MsgStatus.OK
							);
						} else {
							await RespondGetUsers(
								_connInfo,
								[],
								MsgStatus.NOT_IN_CHAT
							);
						}
						break;
					}
					case 'sendFiles': {
						const idAndfileInfo = await AddUserFiles(objEvent.d);
						await BroadcastSendFiles(_connInfo, idAndfileInfo);
						await RespondSendFiles(_connInfo, idAndfileInfo);
						break;
					}
					default: {
						console.log('Invalid message', objEvent);
						break;
					}
				}
			} else if (isWebSocketCloseEvent(event)) {
				console.log(`Socket disconnected! :: ${_connId}`);
				if (_conn.state) {
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

async function RespondeConnect(pConnInfo: ConnInfo, pStatus: MsgStatus) {
	const { id: _Id } = pConnInfo;
	return Respond(pConnInfo, {
		h: 'connectResp',
		d: _Id,
		r: pStatus,
	});
}

async function RespondJoin(pConnInfo: ConnInfo, pStatus: MsgStatus) {
	const { id: _Id, conn: _Conn } = pConnInfo;
	const { name: _Name } = _Conn;
	return Respond(pConnInfo, {
		h: 'joinResp',
		s: _Name,
		r: pStatus,
	});
}

async function RespondLeave(pConnInfo: ConnInfo, pStatus: MsgStatus) {
	return Respond(pConnInfo, {
		h: 'leaveResp',
		r: pStatus,
	});
}

async function RespondChat(
	pConnInfo: ConnInfo,
	pStatus: MsgStatus,
	pChatMsg: string
) {
	return Respond(pConnInfo, {
		h: 'chatResp',
		d: pChatMsg,
		r: pStatus,
	});
}

async function RespondGetUsers(
	pConnInfo: ConnInfo,
	pListUser: Array<string>,
	pStatus: MsgStatus
) {
	return Respond(pConnInfo, {
		h: 'getUsersResp',
		userList: pListUser,
		r: pStatus,
	});
}

async function RespondSendFiles(
	pConnInfo: ConnInfo,
	pData: { id: string; file: FileInfo }
) {
	return Respond(pConnInfo, {
		h: 'sendFilesResp',
		d: pData,
	});
}

async function BroadcastSendFiles(
	pConnInfo: ConnInfo,
	pData: { id: string; file: FileInfo }
) {
	const { id: _SenderId, conn: _SenderConn } = pConnInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		h: 'sendFiles',
		s: _SenderName,
		d: pData,
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

async function AddUserFiles(pData: {
	id?: string;
	file: FileInfo;
}): Promise<{ id: string; file: FileInfo }> {
	return new Promise((resolve) => {
		const _id = v4.generate();
		UserFiles.set(_id, pData.file);
		return resolve({ id: _id, file: pData.file });
	});
}

async function FindUserFilesById(pId: string): Promise<FileInfo | null> {
	return new Promise((resolve) => {
		const fileData = UserFiles.get(pId);
		return resolve(fileData ? fileData : null);
	});
}

async function RemoveUserFilesId(pId: string): Promise<Boolean> {
	return new Promise((resolve) => {
		resolve(UserFiles.delete(pId));
	});
}

async function CheckUserFilesById(pId: string): Promise<Boolean> {
	return new Promise((resolve) => {
		resolve(!!UserFiles.get(pId));
	});
}

async function CountUserFiles(): Promise<number> {
	return new Promise((resolve) => {
		return resolve(UserFiles.size);
	});
}
