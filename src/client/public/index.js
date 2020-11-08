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

	chatWrapper.hide();
	txtUsername.focus();

	ws.addEventListener('message', (evt) => {
		const objData = JSON.parse(evt.data);
		switch (objData.h) {
			case 'connectResp': {
				const r = objData.r;
				if (r === 'OK') {
					wsId = objData.d;
					document.title = `${titleBase} - ${wsId}`;
				} else {
					alert(r);
				}
				break;
			}
			case 'joinResp': {
				const r = objData.r;
				if (r === 'OK') {
					const s = objData.s;
					username = s;
					lUsers = [];
					loginWrapper.hide();
					chatWrapper.show();
					txtUsername.val('');
					chatEmpty();
					txtMessage.focus();
					chatWriteLine(`You are connected! (${s})`);
					showUsers();
					getUsers();
				} else {
					alert(r);
					txtUsername.focus();
				}
				break;
			}
			case 'chatResp': {
				const r = objData.r;
				if (r === 'OK') {
					const message = objData.d;
					chatWriteLine(`${username}: ${message}`);
					txtMessage.val('').focus();
				} else {
					alert(r);
					txtMessage.focus();
				}
				break;
			}
			case 'leaveResp': {
				const r = objData.r;
				if (r === 'OK') {
					chatEmpty();
					lUsers = [];
					showUsers();
					username = '';
					loginWrapper.show();
					chatWrapper.hide();
					txtUsername.val('').focus();
				} else {
					alert(r);
				}
				break;
			}
			case 'getUsersResp': {
				lUsers = objData.userList;
				showUsers();
				break;
			}
			case 'join': {
				const username = objData.d;
				chatWriteLine(`User connect (${username})`);
				addUser(username);
				break;
			}
			case 'chat': {
				const username = objData.s;
				const message = objData.d;
				chatWriteLine(`${username}: ${message}`);
				break;
			}
			case 'leave': {
				const username = objData.d;
				chatWriteLine(`User disconnect (${username})`);
				removeUser(username);
				break;
			}
			default: {
				break;
			}
		}
	});

	const getUsers = () => {
		ws.send(
			JSON.stringify({
				h: 'getUsers',
			})
		);
	};

	btnJoin.click(() => {
		const username = txtUsername.val();
		ws.send(
			JSON.stringify({
				h: 'join',
				d: username,
			})
		);
	});

	btnSend.click(() => {
		const message = $.trim(txtMessage.val());
		if (message !== '') {
			ws.send(
				JSON.stringify({
					h: 'chat',
					d: message,
				})
			);
		} else {
			txtMessage.val('');
			txtMessage.focus();
		}
	});

	btnLeave.click(() => {
		ws.send(
			JSON.stringify({
				h: 'leave',
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
