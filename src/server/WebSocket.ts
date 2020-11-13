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

// type FileInfo = { data: string; name: string };
// const UserFiles: Map<string, FileInfo> = new Map();
const enum MsgStatus {
	OK = 'OK',
	NOK = 'NOK',
	INVALID = 'INVALID',
	USERNAME_INVALID = 'USERNAME_INVALID',
	USERNAME_IN_USE = 'USERNAME_IN_USE',
	NOT_IN_CHAT = 'NOT_IN_CHAT',
	ALREADY_IN_CHAT = 'ALREADY_IN_CHAT',
}

/// (Client -> Server) Messages
type WSClientJoin = { type: 'join'; username: string };
type WSClientLeave = { type: 'leave' };
type WSClientChat = { type: 'chat'; msg: string };
type WSClientGetUsers = { type: 'getUsers' };
type WSClientSendFile = {
	type: 'sendFile';
	fileInfo: { data: string; name: string };
};
type WSClientMessage =
	| WSClientJoin
	| WSClientLeave
	| WSClientChat
	| WSClientGetUsers
	| WSClientSendFile;

/// (Server -> Client) Response Messsages
type WSRespondConnect = {
	type: 'respond-connect';
	status: MsgStatus;
	id: string;
};
type WSRespondJoin = {
	type: 'respond-join';
	status: MsgStatus;
	username: string;
};
type WSRespondLeave = { type: 'respond-leave'; status: MsgStatus };
type WSRespondChat = {
	type: 'respond-chat';
	status: MsgStatus;
	msg: string;
};
type WSRespondGetUsers = {
	type: 'respond-getUsers';
	status: MsgStatus;
	userList: Array<string>;
};
type WSRespondSendFile = {
	type: 'respond-sendFile';
	status: MsgStatus;
	id: string;
};
type WSRespondMessage =
	| WSRespondConnect
	| WSRespondJoin
	| WSRespondLeave
	| WSRespondChat
	| WSRespondGetUsers
	| WSRespondSendFile;

/// (Server -> Client) Broadcast Messages
type WSBroadcastJoin = { type: 'broadcast-join'; username: string };
type WSBroadcastLeave = { type: 'broadcast-leave'; username: string };
type WSBroadcastChat = {
	type: 'broadcast-chat';
	username: string;
	msg: string;
};
type WSBroadcastMessage = WSBroadcastJoin | WSBroadcastLeave | WSBroadcastChat;

/// WSMessage type
type WSMessage = WSClientMessage | WSRespondMessage | WSBroadcastMessage;

export async function HandleWSConn(pWebSocket: WebSocket): Promise<void> {
	const _connInfo = await AddConn(pWebSocket);
	const { id: _connId, conn: _conn } = _connInfo;
	console.log(`Socket connected! :: ${_connId}`);
	try {
		await RespondConnect(_connInfo, MsgStatus.OK);
		for await (const event of pWebSocket) {
			if (typeof event === 'string') {
				const objEvent: WSClientMessage = JSON.parse(event);
				switch (objEvent.type) {
					case 'join': {
						if (!_conn.state) {
							const _name = UPPERCASE_USERNAMES
								? objEvent.username.toUpperCase()
								: objEvent.username;
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
							await BroadcastChat(_connInfo, objEvent.msg);
							await RespondChat(
								_connInfo,
								MsgStatus.OK,
								objEvent.msg
							);
						} else {
							await RespondChat(
								_connInfo,
								MsgStatus.NOT_IN_CHAT,
								''
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
								MsgStatus.OK,
								lUser
							);
						} else {
							await RespondGetUsers(
								_connInfo,
								MsgStatus.NOT_IN_CHAT,
								[]
							);
						}
						break;
					}
					case 'sendFile': {
						// const idAndfileInfo = await AddUserFiles(objEvent);
						// await BroadcastSendFiles(_connInfo, idAndfileInfo);
						// await RespondSendFiles(_connInfo, idAndfileInfo);
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

async function RespondConnect(pConnInfo: ConnInfo, pStatus: MsgStatus) {
	const { id: _Id } = pConnInfo;
	return Respond(pConnInfo, {
		type: 'respond-connect',
		status: pStatus,
		id: _Id,
	});
}

async function RespondJoin(pConnInfo: ConnInfo, pStatus: MsgStatus) {
	const { id: _Id, conn: _Conn } = pConnInfo;
	const { name: _Name } = _Conn;
	return Respond(pConnInfo, {
		type: 'respond-join',
		status: pStatus,
		username: _Name,
	});
}

async function RespondLeave(pConnInfo: ConnInfo, pStatus: MsgStatus) {
	return Respond(pConnInfo, {
		type: 'respond-leave',
		status: pStatus,
	});
}

async function RespondChat(
	pConnInfo: ConnInfo,
	pStatus: MsgStatus,
	pChatMsg: string
) {
	return Respond(pConnInfo, {
		type: 'respond-chat',
		status: pStatus,
		msg: pChatMsg,
	});
}

async function RespondGetUsers(
	pConnInfo: ConnInfo,
	pStatus: MsgStatus,
	pListUser: Array<string>
) {
	return Respond(pConnInfo, {
		type: 'respond-getUsers',
		status: pStatus,
		userList: pListUser,
	});
}

// async function RespondSendFiles(
// 	pConnInfo: ConnInfo,
// 	pData: { id: string; file: FileInfo }
// ) {
// 	return Respond(pConnInfo, {
// 		h: 'sendFilesResp',
// 		d: pData,
// 	});
// }

// async function BroadcastSendFiles(
// 	pConnInfo: ConnInfo,
// 	pData: { id: string; file: FileInfo }
// ) {
// 	const { id: _SenderId, conn: _SenderConn } = pConnInfo;
// 	const { name: _SenderName } = _SenderConn;
// 	return Broadcast(_SenderId, {
// 		h: 'sendFiles',
// 		s: _SenderName,
// 		d: pData,
// 	});
// }

function BroadcastJoin(pSrcInfo: ConnInfo) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		type: 'broadcast-join',
		username: _SenderName,
	});
}

function BroadcastLeave(pSrcInfo: ConnInfo) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		type: 'broadcast-leave',
		username: _SenderName,
	});
}

function BroadcastChat(pSrcInfo: ConnInfo, pChatMsg: string) {
	const { id: _SenderId, conn: _SenderConn } = pSrcInfo;
	const { name: _SenderName } = _SenderConn;
	return Broadcast(_SenderId, {
		type: 'broadcast-chat',
		username: _SenderName,
		msg: pChatMsg,
	});
}

// async function AddUserFiles(pData: {
// 	id?: string;
// 	file: FileInfo;
// }): Promise<{ id: string; file: FileInfo }> {
// 	return new Promise((resolve) => {
// 		const _id = v4.generate();
// 		UserFiles.set(_id, pData.file);
// 		return resolve({ id: _id, file: pData.file });
// 	});
// }

// async function FindUserFilesById(pId: string): Promise<FileInfo | null> {
// 	return new Promise((resolve) => {
// 		const fileData = UserFiles.get(pId);
// 		return resolve(fileData ? fileData : null);
// 	});
// }

// async function RemoveUserFilesId(pId: string): Promise<Boolean> {
// 	return new Promise((resolve) => {
// 		resolve(UserFiles.delete(pId));
// 	});
// }

// async function CheckUserFilesById(pId: string): Promise<Boolean> {
// 	return new Promise((resolve) => {
// 		resolve(!!UserFiles.get(pId));
// 	});
// }

// async function CountUserFiles(): Promise<number> {
// 	return new Promise((resolve) => {
// 		return resolve(UserFiles.size);
// 	});
// }

async function Broadcast(
	pSrcId: string,
	pMessage: WSBroadcastMessage
): Promise<void> {
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
	pMessage: WSRespondMessage
): Promise<void> {
	const { id: _Id, conn: _Conn } = pConnInfo;
	const { name: _Name, ws: _WS } = _Conn;
	if (await CheckConnById(_Id)) {
		await _WS.send(JSON.stringify(pMessage));
	}
}
