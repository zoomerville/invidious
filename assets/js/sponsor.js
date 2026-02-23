

(async function(){

	if(!video_data.preferences.sponsorblock) {
		return ;
	}

	const logined = !!document.querySelector("input[value='Log out']");
	function setCookie(name, value, days) {
		let expires = "";
		if (typeof days === "number") {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toUTCString();
		}
		// encode name and value
		var cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value || "") + expires + "; path=/";
		document.cookie = cookie;
	}

	function getCookie(name) {
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i].trim();
			var separatorIndex = c.indexOf('=');
			if (separatorIndex === -1) continue;
			// decode cookie name and value
			var cookieName = decodeURIComponent(c.substring(0, separatorIndex));
			var cookieValue = decodeURIComponent(c.substring(separatorIndex + 1));
			if (cookieName === name) {
				return cookieValue;
			}
		}
		return null;
	}

	function sha256First6(input) {
		return sha256(input).slice(0, 6);
	}

	const categories = {
		sponsor: {
			name: "Sponsor",
			color: "#00D400",
			action: 'manual',
			index: 0
		},
		selfpromo: {
			name: "Unpaid/Self Promotion",
			color: "#FFFF00",
			action: 'disabled',
			index: 1
		},
		exclusive_access: {
			name: "Exclusive Access",
			color: "#008A5C",
			action: 'show',
			index: 2
		},
		interaction: {
			name: "Interaction Reminder (Subscribe)",
			color: "#CC00FF",
			action: 'disabled',
			index: 3
		},
		poi_highlight: {
			name: "Highlight",
			color: "#FF1684",
			action: 'ask',
			index: 4
		},
		intro: {
			name: "Intermission/Intro Animation",
			color: "#00FFFF",
			action: 'disabled',
			index: 5
		},
		outro: {
			name: "Endcards/Credits",
			color: "#0202ED",
			action: 'disabled',
			index: 6
		},
		preview: {
			name: "Preview/Recap",
			color: "#008FD6",
			action: 'disabled',
			index: 7
		},
		hook: {
			name: "Hook/Greetings",
			color: "#395699" ,
			action: 'disabled',
			index: 8
		},
		filler: {
			name: "Tangents/Jokes",
			color: "#7300FF",
			action: 'disabled',
			index: 9
		},
		music_offtopic: {
			name: "Non-Music Section",
			color: "#FF9900",
			action: 'show',
			index: 10
		}
	};

	const selectOptions = {
		disabled: "Disabled",
		show: "Show on Seek",
		manual: "Manual Skip",
		skip: "Auto Skip",
	};

	const highlightOptions = {
		disabled: "Disabled",
		show: "Show on Seek",
		ask: "Ask when Video Loads",
		auto: "Auto Skip to the Start"
	};

	const optsEncodes = {
		disabled: "a",
		show: "b",
		manual: "c",
		skip: "d",
		ask: "e",
		auto: "f"
	};

	const optDecodes = {};

	for(let [key,val] of Object.entries(optsEncodes)){
		optDecodes[val] = key;
	}

	let options = {};

	for(let [tag, opt] of Object.entries(categories)){
		options[tag] = opt.action;
	}

	function decodeSave(str){
		const opts = {};
		if(str.length !== Object.keys(categories).length){
			return options;
		}
		for(let [key,val] of Object.entries(categories)){
			opts[key] = optDecodes[str[val.index]] ?? 'disabled'
		}

		return opts;
	}

	function encodeSave(opts){
		const chars = new Array(Object.keys(categories));
		for(let [key,val] of Object.entries(opts)){
			const category = categories[key];
			chars[category.index] = optsEncodes[val];
		}
		return chars.join('');
	}

	options = decodeSave(video_data.preferences.sponsorblock_options);

	const hash = sha256First6(video_data.id);
	const actionTypes = ["skip","mute","chapter","full","poi"];
	const params = new URLSearchParams({
		actionTypes: JSON.stringify(actionTypes),
		categories: JSON.stringify(Object.keys(categories))
	}).toString();

	const res = await fetch(`/api/skipsegments/${hash}?${params}`).then(r => r.json());
	const segs = (((res.filter(v => v.videoID === video_data.id)[0] ?? []).segments) ?? [])
		.filter(seg => seg.category in categories);

	const highlight = segs.filter(seg => seg.category === "poi_highlight")[0];
	const highlightStart = highlight === undefined ? 0 : highlight.segment[0];

	let first = true;
	let seeking = false;

	let skipTo = 0;
	let interacts = [];

	function loop(){
		if(seeking){
			return setTimeout(loop, 20);
		}
		
		let ss = false;
		const time = player.currentTime();
		for(let interact of interacts){
			if(interact.segment[0] < time && time < interact.segment[1]){
				if(options[interact.category] === 'manual'){
					skipTo = interact.segment[1];
					ss = true;
					break;
				}
				
				player.currentTime(interact.segment[1]);
				break;
			}
		}
		skipSegment.style.display = ss ? 'block' : 'none';
		highlightSegment.style.display = (
			time < highlightStart && 
			options.poi_highlight === 'ask' &&
			highlight
		)  ? 'block' : 'none';
		setTimeout(loop, 20);
	}

	function addMarkers(){
		interacts = segs.filter(seg => ["skip", "manual"].includes(options[seg.category]));
		const show = segs.filter(({ category }) => options[category] !== 'disabled');

		player.markers.add(
			show.map(({segment, category}) => ({
			time: segment[0],
			breakOverlay:categories[category].name,
			text: categories[category].name,
			duration: (segment[1] - segment[0]) || 3,
		})));

		const markers = document.querySelectorAll('.vjs-marker');

		for(let [i, seg] of Object.entries(show)){
			markers[i].style.backgroundColor = categories[seg.category].color;
			markers[i].style.borderRadius = 0;
		}
	}

	const playing = !player.paused() && !player.ended() && player.currentTime() > 0;

	function init() {
		if(!first) return;
		first = false;
		player.markers();
		addMarkers();

		if(options.poi_highlight === 'auto' && highlight) {
			player.currentTime(highlightStart);
		}

		loop();
	}

	if(playing){
		init();
	}
	
	player.on('playing',  init);

	player.on('seeking', () => {
		seeking = true;
	});

	player.on('seeked', () => {
		seeking = false;
		seeked = true;
	});
	
	async function optionsUpDate(){
		
		try{
			player.markers.reset([]);
			addMarkers();
		}catch{}
	
		const code = encodeSave(options);

		if(logined){
			const prefs = await fetch("/api/v1/auth/preferences").then(r => r.json());
			await fetch("/api/v1/auth/preferences", {
				method: 'POST',
				headers: {
					'Content-Type': "application/json",
				},
				body: JSON.stringify({
					...prefs,
					sponsorblock_options: code
				}) 
			})
			return ;
		}
		let prefs = {};
		try{
			prefs = JSON.parse(getCookie("PREFS"));
		} catch {}

		setCookie("PREFS",JSON.stringify({
			...prefs,
			sponsorblock_options: code
		}), 30);
	}

	function createElement(tag, parent, prepend) {
		const child = document.createElement(tag);
		if (prepend) {
			parent.prepend(child);
		} else {
			parent.appendChild(child);
		}

		child.setAttr = (attr, value) => {
			child[attr] = value;
			return child;
		};

		child.setText = v => child.setAttr("textContent", v);
		child.setClass = v => child.setAttr("className", v);
		child.setValue = v => child.setAttr("value", v);
		child.setClick = v => child.setAttr("onclick", v);
		child.setName = v => child.setAttr("name", v);

		return child;
	}

	function closeSettings(){
		visible = false;
		wall.style.display = "none";
		settings.style.display = "none";
	}

	const skipSegment = createElement("div", document.querySelector('#player'))
		.setClass("sponsorblock-skip-segment")
		.setText('Skip Segment')
		.setClick(() => player.currentTime(skipTo));
	
	const highlightSegment = createElement("div", document.querySelector('#player'))
		.setClass("sponsorblock-jump-segment")
		.setText('Jump to Highlight')
		.setClick(() => player.currentTime(highlightStart));


	let visible = false;
	const wall = createElement("div", document.body)
		.setClass("sponsorblock-options-wall")
		.setClick(closeSettings);

	const settings = createElement("div", document.body)
		.setClass("sponsorblock-settings");

	createElement("div", settings)
		.setClass("close")
		.setText("✖")
		.setClick(closeSettings);


	const form = createElement("form", settings);
	createElement("h1", form)
		.setText("SponserBlock Settings");

	for (let [key, val] of Object.entries(categories)) {
		const field = createElement("fieldset", form);
		createElement("label", field)
			.setText(val.name)
			.setName(key);

		const select = createElement("select", field)
			.setName(key);

		const choices = key === "poi_highlight" ? highlightOptions : selectOptions;

		for (let [tag, name] of Object.entries(choices)) {
			const option = createElement("option", select)
				.setText(name)
				.setValue(tag);
			option.value = tag;
		}

		select.value = options[key];
		((select, key) => {
			select.onchange = () => {
				options[key] = select.value;
				optionsUpDate();
			}
		})(select, key);
	}

	const hbox = document.querySelectorAll('.pure-u-1.pure-u-lg-1-5 .h-box')[0];
	const span = createElement("p", hbox, true)
	createElement("a", span)
		.setText("SponserBlock Settings")
		.setAttr("href", "#")
		.setClick(e => {
			e.preventDefault()
			settings.style.display = visible ? "none" : "block";
			wall.style.display = visible ? "none" : "block";
			visible = !visible;
		});
})();

