$(function onload() {
	const ws = new WebSocket(`ws://${location.host}`);
	let username = '';

	const objLogin = $('#login');
	const objChat = $('#chat');
	const objPanel = $('#panel');
	const txtUsername = $('#txtUsername');
	const btnJoin = $('#btnJoin');
	const txtChat = $('#txtChat');
	const txtMessage = $('#txtMessage');
	const btnSend = $('#btnSend');
	const btnLeave = $('#btnLeave');
	const panelUsers = $('#panelUsers');

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

	const panelEmpty = () => {
		panelUsers.val('');
	};

	const addUserToPanel = (pData) => {
		panelUsers.val(`${panelUsers.val()}${pData.id}. ${pData.name}\n`);
	};

	objChat.hide();
	objPanel.hide();
	txtUsername.focus();

	ws.addEventListener('message', (evt) => {
		const objData = JSON.parse(evt.data);
		switch (objData.h) {
			case 'joinResp': {
				const r = objData.r;
				if (r === 'OK') {
					const s = objData.s;
					username = s;
					objLogin.hide();
					objChat.show();
					objPanel.show();
					txtUsername.val('');
					chatEmpty();
					panelEmpty();
					chatWriteLine(`You are connected! (${s})`);
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
					panelEmpty();
					username = '';
					objLogin.show();
					objChat.hide();
					objPanel.hide();
					txtUsername.val('').focus();
				} else {
					alert(r);
				}
				break;
			}
			case 'join': {
				const username = objData.d;
				chatWriteLine(`User connect (${username}).`);
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
				chatWriteLine(`User disconnect (${username}).`);
				break;
			}
			case 'addUserToPanel': {
				addUserToPanel(objData.data);
				break;
			}
			default: {
				break;
			}
		}
	});

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
		const message = txtMessage.val();
		if ($.trim(message) !== '') {
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

	txtMessage.on('keypress', (e) => {
		if (e.which === 13) {
			btnSend.click();
		}
	});
});
