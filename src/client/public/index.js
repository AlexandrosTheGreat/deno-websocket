$(function onload() {
	const titleBase = document.title;
	const ws = new WebSocket(`ws://${location.host}`);

	let wsId = '';
	let username = '';
	let lUsers = [];

	const loginWrapper = $('#loginWrapper');
	const chatWrapper = $('#chatWrapper');
	const txtUsername = $('#txtUsername');
	const btnJoin = $('#btnJoin');
	const txtChat = $('#txtChat');
	const txtMessage = $('#txtMessage');
	const btnSend = $('#btnSend');
	const btnLeave = $('#btnLeave');
	const listUsers = $('#listUsers');
	const objUpload = $('#objUpload');
	const btnSendFile = $('#btnSendFile');

	const chatScroll = () => {
		txtChat.prop('scrollTop', txtChat.prop('scrollHeight'));
	};
	const chatEmpty = () => {
		txtChat.val('');
		chatScroll();
	};
	const chatWrite = (pText) => {
		txtChat.val(`${txtChat.val()}${pText}`);
		chatScroll();
	};
	const chatWriteLine = (pText) => {
		txtChat.val(`${txtChat.val()}${pText}\n`);
		chatScroll();
	};

	const addUser = (pUserName) => {
		lUsers.push(pUserName);
		showUsers();
	};

	const removeUser = (pUserName) => {
		lUsers.splice(lUsers.indexOf(pUserName), 1);
		showUsers();
	};

	const showUsers = () => {
		listUsers.val(
			lUsers
				.sort()
				.map((x) => `- ${x}`)
				.join('\n')
		);
	};

	// const generateLinkFromFileData = (pData) => {
	// 	const tId = pData.id;
	// 	const tFile = pData.file;
	// 	const tFileData = tFile.data;
	// 	const tFileName = tFile.name;
	// 	const tURL = URL.createObjectURL(new Blob([tFileData]));
	// 	return `<a data-fileId="${tId}" href="${tURL}" download="${tFileName}"></a>`;
	// };

	chatWrapper.hide();
	txtUsername.focus();

	const checkRespondStatus = (objData) => {
		const status = objData.status;
		if (status === 'OK') {
			return true;
		}
		alert(status);
		return false;
	};

	ws.addEventListener('message', (evt) => {
		const objData = JSON.parse(evt.data);
		const _msgType = objData.type;
		switch (_msgType) {
			case 'respond-connect': {
				if (checkRespondStatus(objData)) {
					wsId = objData.id;
					document.title = `${titleBase} - ${wsId}`;
				}
				break;
			}
			case 'respond-join': {
				if (checkRespondStatus(objData)) {
					username = objData.username;
					lUsers = [];
					loginWrapper.hide();
					chatWrapper.show();
					txtUsername.val('');
					chatEmpty();
					txtMessage.focus();
					chatWriteLine(`You are connected! (${username})`);
					showUsers();
					getUsers();
				} else {
					txtUsername.focus();
				}
				break;
			}
			case 'respond-chat': {
				if (checkRespondStatus(objData)) {
					const message = objData.msg;
					chatWriteLine(`${username}: ${message}`);
					txtMessage.val('').focus();
				} else {
					txtMessage.focus();
				}
				break;
			}
			case 'respond-leave': {
				if (checkRespondStatus(objData)) {
					username = '';
					lUsers = [];
					chatEmpty();
					showUsers();
					loginWrapper.show();
					chatWrapper.hide();
					txtUsername.val('').focus();
				}
				break;
			}
			case 'respond-getUsers': {
				if (checkRespondStatus(objData)) {
					lUsers = objData.userList;
					showUsers();
				}
				break;
			}
			case 'broadcast-join': {
				const username = objData.username;
				chatWriteLine(`User connect (${username})`);
				addUser(username);
				break;
			}
			case 'broadcast-chat': {
				const username = objData.username;
				const message = objData.msg;
				chatWriteLine(`${username}: ${message}`);
				break;
			}
			case 'broadcast-leave': {
				const username = objData.username;
				chatWriteLine(`User disconnect (${username})`);
				removeUser(username);
				break;
			}
			case 'respond-sendFile': {
				if (checkRespondStatus(objData)) {
					const id = objData.id;
					const filename = objData.filename;
					chatWriteLine(
						`${username}: Uploaded a file [${filename} :: ${id}]`
					);
					txtMessage.val('').focus();
				}
				break;
			}
			case 'broadcast-sendFile': {
				const username = objData.username;
				const id = objData.id;
				const filename = objData.filename;
				chatWriteLine(
					`${username}: Uploaded a file [${filename} :: ${id}]`
				);
				break;
			}
			default: {
				console.log({
					received: _msgType,
					objData: objData,
				});
				break;
			}
		}
	});

	const getUsers = () => {
		ws.send(
			JSON.stringify({
				type: 'getUsers',
			})
		);
	};

	btnJoin.click(() => {
		const username = txtUsername.val();
		ws.send(
			JSON.stringify({
				type: 'join',
				username: username,
			})
		);
	});

	btnSend.click(() => {
		const message = $.trim(txtMessage.val());
		if (message !== '') {
			ws.send(
				JSON.stringify({
					type: 'chat',
					msg: message,
				})
			);
		} else {
			txtMessage.val('');
			txtMessage.focus();
		}
	});

	objUpload.change(async (pEvent) => {
		const target = pEvent.target;
		const file = target.files[0];
		if (file) {
			const fileData = await file.text();
			const fileName = file.name;
			const fileObj = {
				file: {
					data: fileData,
					name: fileName,
				},
			};
			ws.send(
				JSON.stringify({
					type: 'sendFile',
					fileInfo: { name: fileName, data: fileData },
				})
			);
		}
	});

	btnSendFile.click(async () => {
		objUpload.click();
		return;
	});

	btnLeave.click(() => {
		ws.send(
			JSON.stringify({
				type: 'leave',
			})
		);
	});

	txtUsername.on('keypress', (e) => {
		if (e.which === 13) {
			btnJoin.click();
		}
	});

	txtMessage.on('keypress', (e) => {
		if (e.which === 13) {
			btnSend.click();
		}
	});
});
