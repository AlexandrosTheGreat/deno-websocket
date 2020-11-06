$(function onload() {
	const ws = new WebSocket(`ws://${location.host}`);
	let username = '';

	const objLogin = $('#login');
	const objChat = $('#chat');
	const txtUsername = $('#txtUsername');
	const btnJoin = $('#btnJoin');
	const txtChat = $('#txtChat');
	const txtMessage = $('#txtMessage');
	const btnSend = $('#btnSend');
	const btnLeave = $('#btnLeave');

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

	objChat.hide();
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
					txtUsername.val('');
					chatEmpty();
					chatWriteLine(`You are connected! (${s})`);
					txtMessage.focus();
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
					username = '';
					objLogin.show();
					objChat.hide();
					txtUsername.val('').focus();
				} else {
					alert(r);
				}
				break;
			}
			case 'join': {
				const username = objData.d;
				chatWriteLine(`User connect (${username})`);
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
		if (message !== '') {
			ws.send(
				JSON.stringify({
					h: 'chat',
					d: message,
				})
			);
		} else {
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
