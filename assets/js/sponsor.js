(async function(){
	async function sha256First6(input) {
		const encoder = new TextEncoder();
		const data = encoder.encode(input);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
		return hashHex.slice(0, 6);
	}

	const categories = {
		sponsor: {
			name: "Sponsor",
			color: "#00D400",
			action: 'skip',
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

	const options = {};

	for(let [tag, opt] of Object.entries(categories)){
		options[tag] = opt.action;
	}

	const hash = await sha256First6(video_data.id);
	const actionTypes = ["skip","mute","chapter","full","poi"];
	const params = new URLSearchParams({
		actionTypes: JSON.stringify(actionTypes),
		categories: JSON.stringify(Object.keys(categories))
	}).toString();

	const res = await fetch(`/api/skipsegments/${hash}?${params}`).then(r => r.json());
	const segs = (((res.filter(v => v.videoID === video_data.id)[0] ?? []).segments) ?? [])
		.filter(seg => seg.category in categories);
	let first = true;
	let seeking = false;
	let lastSeg = null;
	let segTime = 0;
	let segTimer = null;
	let allowSeg = null;
	let seeked = false;

	let skipTo = 0;
	//let skips = segs.filter(seg => options[seg.category] === 'skip');
	let interacts = [];

	function loop(){
		if(seeking){
			return requestAnimationFrame(loop);
		}

		if(seeked && lastSeg !== null){
			player.currentTime(segTime);
			allowSeg = lastSeg;
			seeked = false;
			return requestAnimationFrame(loop);
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

				if(allowSeg === interact.UUID){
					break;
				} else {
					allowSeg = null;
				}

				lastSeg = interact.UUID;
				segTime = player.currentTime();
				clearTimeout(segTimer);
				segTimer = setTimeout(() => {
					lastSeg = null;
				}, 2000);
				player.currentTime(interact.segment[1]);


				break;
			}
		}
		skipSegment.style.display = ss ? 'block' : 'none';
		
		/*
		for(let skip of skips){
			if(skip.segment[0] < time && time < skip.segment[1]){
				if(allowSeg === skip.UUID){
					break;
				} else {
					allowSeg = null;
				}

				lastSeg = skip.UUID;
				segTime = player.currentTime();
				clearTimeout(segTimer);
				segTimer = setTimeout(() => {
					lastSeg = null;
				}, 2000);
				player.currentTime(skip.segment[1]);


				break;
			}
		}*/
		requestAnimationFrame(loop);
	}

	function addMarkers(){
		interacts = segs.filter(seg => ["skip", "manual"].includes(options[seg.category]));
		const show = segs.filter(({ category }) => options[category] !== 'disabled');

		player.markers.add(
			show.map(({segment, category}) => ({
			time: segment[0],
			text: categories[category].name,
			duration: (segment[1] - segment[0]) || 3,
		})));

		const markers = document.querySelectorAll('.vjs-marker');

		for(let [i, seg] of Object.entries(show)){
			markers[i].style.backgroundColor = categories[seg.category].color;
			markers[i].style.borderRadius = 0;
		}
	}
	player.on('playing',  () => {
		if(!first) return;
		first = false;
		player.markers();
		addMarkers();

		loop();
	});

	player.on('seeking', () => {
		seeking = true;
	});

	player.on('seeked', () => {
		seeking = false;
		seeked = true;
	});
	
	function optionsUpDate(){
		if(!first) return;
		player.markers.reset([]);
		addMarkers();
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

		select.value = val.action;
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

