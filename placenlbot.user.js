// ==UserScript==
// @name         Furbot
// @namespace    https://github.com/PlaceNL/Bot
// @version      5
// @description  De bot voor PlaceNL!
// @author       NoahvdAa
// @match        https://www.reddit.com/r/place/*
// @match        https://new.reddit.com/r/place/*
// @match        https://hot-potato.reddit.com/embed*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @require	     https://cdn.jsdelivr.net/npm/toastify-js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @updateURL    https://github.com/DMonitor/Bot/raw/master/placenlbot.user.js
// @downloadURL  https://github.com/DMonitor/Bot/raw/master/placenlbot.user.js
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

// Sorry voor de rommelige code, haast en clean gaatn iet altijd samen ;)

var placeOrders = [];
var accessToken;
var canvas = document.createElement('canvas');

if (window.top !== window.self) {
    window.addEventListener('load', () => {
            document.getElementsByTagName("mona-lisa-embed")[0].shadowRoot.children[0].getElementsByTagName("mona-lisa-canvas")[0].shadowRoot.children[0].appendChild(
        (function () {
            const i = document.createElement("img");
            i.src = "https://imgur.com/g2aG2Nj.png";
            i.style = "position: absolute;left: 0;top: 0;image-rendering: pixelated;width: 1000px;height: 1000px;";
            //console.log(i);
            //console.log("tes2t")
            return i;
        })())

    }, false);

}
//Updated color palette, made place for more in the future.
const COLOR_MAPPINGS = {
	'#6D001A': 0,//Newer Color: Burgundi
	'#BE0089': 1,//New Color: Dark Red 
	'#FF4500': 2,
	'#FFA800': 3,
	'#FFD635': 4,
	'#FFF8B8': 5, //Newer Color:Pale Yellow
	'#00A368': 6,
	'#00CC78': 7,//New Color: Green
	'#7EED56': 8,
	'#01746f': 9, //New Color: Dark Teal 
	'#009EAA': 10, //New Color: Teal 
	'#00CCC0': 11, //Newer Color: Light Teal
	'#2450A4': 12,
	'#3690EA': 13,
	'#51E9F4': 14,
	'#493AC1':15, //New Color: Indigo 
	'#6A5CFF':16, //New Color: Periwinkle
	'#94B3FF':17, //Newer Color: Lavender
	'#811E9F': 18,
	'#B44AC0': 19,
	'#E4ABFF':20, //Newer Color: Pale Purple
	'#DE107F':21, //Newer Color: Magenta
	'#FF3881':22, //New Color: Pink
	'#FF99AA': 23,
	'#6D482F':24, //New Color: Dark Brown
	'#9C6926': 25,
	'#FFB470':26, //Newer Color: Beige
	'#000000': 27,
	'#515252':28,//Newer Color: Dark Gray
	'#898D90': 29,
	'#D4D7D9': 30,
	'#FFFFFF': 31
};

(async function () {
	GM_addStyle(GM_getResourceText('TOASTIFY_CSS'));
	canvas.width = 1000;
	canvas.height = 1000;
	canvas = document.body.appendChild(canvas);

	Toastify({
		text: 'Get Access Token...',
		duration: 10000
	}).showToast();
	accessToken = await getAccessToken();
	Toastify({
		text: 'Accesstoken Obtained!',
		duration: 10000
	}).showToast();
    updateOrders();
	setInterval(updateOrders, 5 * 60 * 1000); // Update orders elke vijf minuten.
	await updateOrders();
	attemptPlace();
})();

async function attemptPlace() {
	var ctx;
	try {
		const canvasUrl = await getCurrentImageUrl();
		ctx = await getCanvasFromUrl(canvasUrl);
	} catch (e) {
		console.warn('Error retrieving folder: ', e);
		Toastify({
			text: 'Error retrieving folder. Try again in 15 sec...',
			duration: 10000
		}).showToast();
		setTimeout(attemptPlace, 15000); // probeer opnieuw in 15sec.
		return;
	}

	for (const order of placeOrders) {
		const x = order[0];
		const y = order[1];
		const colorId = order[2];
		const rgbaAtLocation = ctx.getImageData(x, y, 1, 1).data;
		const hex = rgbToHex(rgbaAtLocation[0], rgbaAtLocation[1], rgbaAtLocation[2]);
		const currentColorId = COLOR_MAPPINGS[hex];
		// Deze pixel klopt al.
		if (currentColorId == colorId) continue;

		Toastify({
			text: `Trying to place pixel on ${x}, ${y}...`,
			duration: 10000
		}).showToast();
		await place(x, y, colorId);

		Toastify({
			text: `Waiting for cooldown...`,
			duration: 315000
		}).showToast();
		setTimeout(attemptPlace, 315000); // 5min en 15sec, just to be safe.
		return;
	}

	Toastify({
		text: 'All pixels are already in the right place!!',
		duration: 10000
	}).showToast();
	setTimeout(attemptPlace, 30000); // probeer opnieuw in 30sec.
}

function updateOrders() {
    console.warn("updating orders");
	fetch('https://raw.githubusercontent.com/DMonitor/Bot/master/orders.json').then(async (response) => {
		if (!response.ok) return console.warn('Unable to pick up orders! (non-ok status code)');
		const data = await response.json();

		if (JSON.stringify(data) !== JSON.stringify(placeOrders)) {
			Toastify({
				text: `New orders loaded. Total pixels: ${data.length}.`,
				duration: 10000
			}).showToast();
		}
		
		// Ensure orders are executed in a random order
		const shuffled = data
		  .map(value => ({ value, sort: Math.random() }))
		  .sort((a, b) => a.sort - b.sort)
		  .map(({ value }) => value);

		placeOrders = shuffled;
	}).catch((e) => console.warn('Unable to pick up orders!', e));
}

function place(x, y, color) {
	return fetch('https://gql-realtime-2.reddit.com/query', {
		method: 'POST',
		body: JSON.stringify({
			'operationName': 'setPixel',
			'variables': {
				'input': {
					'actionName': 'r/replace:set_pixel',
					'PixelMessageData': {
						'coordinate': {
							'x': x,
							'y': y
						},
						'colorIndex': color,
						'canvasIndex': 0
					}
				}
			},
			'query': 'mutation setPixel($input: ActInput!) {\n  act(input: $input) {\n    data {\n      ... on BasicMessage {\n        id\n        data {\n          ... on GetUserCooldownResponseMessageData {\n            nextAvailablePixelTimestamp\n            __typename\n          }\n          ... on SetPixelResponseMessageData {\n            timestamp\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
		}),
		headers: {
			'origin': 'https://hot-potato.reddit.com',
			'referer': 'https://hot-potato.reddit.com/',
			'apollographql-client-name': 'mona-lisa',
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		}
	});
}

async function getAccessToken() {
	const usingOldReddit = window.location.href.includes('new.reddit.com');
	const url = usingOldReddit ? 'https://new.reddit.com/r/place/' : 'https://www.reddit.com/r/place/';
	const response = await fetch(url);
	const responseText = await response.text();

	// TODO: ew
	return responseText.split('\"accessToken\":\"')[1].split('"')[0];
}

async function getCurrentImageUrl() {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket('wss://gql-realtime-2.reddit.com/query', 'graphql-ws');

		ws.onopen = () => {
			ws.send(JSON.stringify({
				'type': 'connection_init',
				'payload': {
					'Authorization': `Bearer ${accessToken}`
				}
			}));
			ws.send(JSON.stringify({
				'id': '1',
				'type': 'start',
				'payload': {
					'variables': {
						'input': {
							'channel': {
								'teamOwner': 'AFD2022',
								'category': 'CANVAS',
								'tag': '0'
							}
						}
					},
					'extensions': {},
					'operationName': 'replace',
					'query': 'subscription replace($input: SubscribeInput!) {\n  subscribe(input: $input) {\n    id\n    ... on BasicMessage {\n      data {\n        __typename\n        ... on FullFrameMessageData {\n          __typename\n          name\n          timestamp\n        }\n      }\n      __typename\n    }\n    __typename\n  }\n}'
				}
			}));
		};

		ws.onmessage = (message) => {
			const { data } = message;
			const parsed = JSON.parse(data);

			// TODO: ew
			if (!parsed.payload || !parsed.payload.data || !parsed.payload.data.subscribe || !parsed.payload.data.subscribe.data) return;

			ws.close();
			resolve(parsed.payload.data.subscribe.data.name);
		}


		ws.onerror = reject;
	});
}

function getCanvasFromUrl(url) {
	return new Promise((resolve, reject) => {
		var ctx = canvas.getContext('2d');
		var img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => {
			ctx.drawImage(img, 0, 0);
			resolve(ctx);
		};
		img.onerror = reject;
		img.src = url;
	});
}

function rgbToHex(r, g, b) {
	return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}
