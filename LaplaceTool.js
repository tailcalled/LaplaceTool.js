let successes = 0;
let failures = 0;
let confidence = 95;
let graphType = "pdf";

function laplace(s, f) {
	return (s + 1) / (s + f + 2);
}
function density(r, type) {
	type = type || graphType;
	let s = 0;
	let f = 0;
	let d = 1.0;
	let c = 1 - r;
	while (s < successes || f < failures) {
		let S = laplace(s, f) < r;
		S = S && (s < successes);
		S = S || (f >= failures);
		if (S) {
			let lap = laplace(s, f);
			s = s + 1;
			let ev = r;
			c = c + r * (1 - r) * d / s;
			d = d * ev / lap;
		}
		else {
			let lap = 1 - laplace(s, f);
			f = f + 1;
			let ev = 1 - r;
			c = c - r * (1 - r) * d / f;
			d = d * ev / lap;
		}
	}
	return type == "pdf"? d : (1 - c);
}
function best() {
	if (successes + failures > 0) return successes / (successes + failures);
	else return 0.5;
}
function binarySearch(target, low, high) {
	low = low || 0.0;
	high = high || 1.0;
	let mid = (low + high) / 2;
	let y = density(mid, "cdf");
	if (Math.abs(y - target) < 1E-6) return mid;
	else if (y < target) return binarySearch(target, mid, high);
	else return binarySearch(target, low, mid);
}

function updateGraph() {
	let successesField = document.getElementById("successes");
	let failuresField = document.getElementById("failures");
	let confidenceField = document.getElementById("confidence");
	let pdfField = document.getElementById("pdf");
	successes = successesField.value | 0;
	failures = failuresField.value | 0;
	confidence = +confidenceField.value || confidence;
	if (confidence < 0.0) confidence = 0.0;
	if (confidence > 100.0) confidence = 100.0;
	if (pdfField.checked) {
		graphType = "pdf";
	}
	else {
		graphType = "cdf";
	}
	redrawGraph();
	let lowerFrac = (1 - confidence/100) / 2;
	let upperFrac = 1 - lowerFrac;
	let lowerPercent = (binarySearch(lowerFrac) * 100).toFixed(1) + "%";
	let upperPercent = (binarySearch(upperFrac) * 100).toFixed(1) + "%";
	document.getElementById("lower").textContent = lowerPercent;
	document.getElementById("upper").textContent = upperPercent;
	let expectedPercent = (laplace(successes, failures) * 100).toFixed(1) + "%"
	document.getElementById("expected").textContent = expectedPercent;
}
function redrawGraph() {
	let graph = document.getElementById("graph");
	let gfx = graph.getContext("2d");
	let width = graph.clientWidth;
	let height = graph.clientHeight;
	graph.width = graph.width; // for some reason the next line doesn't work??? so I need this hack
	gfx.clearRect(0, 0, width, height);
	let margin = 32;
	let left = margin;
	let top = margin;
	let right = width - margin;
	let bot = height - margin;
	let iw = right - left;
	let ih = bot - top;
	let xParts = Math.floor(iw / 50);
	gfx.font = "10 Arial";
	gfx.textAlign = "center";
	for (let i = 0; i <= xParts; i++) {
		let frac = i / xParts;
		let x = (frac * iw);
		gfx.strokeStyle = "#000000";
		gfx.beginPath();
		gfx.moveTo(left + x, bot); gfx.lineTo(left + x, bot + 3);
		gfx.stroke();
		gfx.strokeStyle = "#E0E0E0";
		gfx.beginPath();
		gfx.moveTo(left + x, bot); gfx.lineTo(left + x, top);
		gfx.stroke();
		let percent = (frac * 100).toFixed(1) + "%";
		gfx.fillStyle = "#000000";
		gfx.fillText(percent, left + x, bot + 14);
	}
	if (graphType == "cdf") {
		let yParts = Math.floor(ih / 40);
		gfx.textAlign = "right";
		for (let i = 0; i <= yParts; i++) {
			let frac = i / yParts;
			let y = (frac * ih);
			gfx.strokeStyle = "#000000";
			gfx.beginPath();
			gfx.moveTo(left, bot - y); gfx.lineTo(left - 3, bot - y);
			gfx.stroke();
			gfx.strokeStyle = "#E0E0E0";
			gfx.beginPath();
			gfx.moveTo(left, bot - y); gfx.lineTo(right, bot - y);
			gfx.stroke();
			let percent = (frac * 100).toFixed(0) + "%";
			gfx.fillStyle = "#000000";
			gfx.fillText(percent, left - 4, bot - y + 4);
		}
	}
	let scale = graphType == "pdf"? density(best()) : 1.0;
	gfx.strokeStyle = "#FF0000";
	gfx.beginPath();
	gfx.moveTo(left, bot);
	for (let r = 0; r < 1.0; r += 1.0 / iw) {
		let x = r * iw;
		let p = density(r);
		let y = p * ih / scale;
		gfx.lineTo(left + x, bot - y);
	}
	let arrowhead = 10;
	gfx.stroke();
	gfx.strokeStyle = "#000000";
	gfx.beginPath();
	gfx.moveTo(left, top); gfx.lineTo(left, bot);
	if (graphType == "pdf") {
		gfx.moveTo(left, top); gfx.lineTo(left - arrowhead/2, top + arrowhead);
		gfx.moveTo(left, top); gfx.lineTo(left + arrowhead/2, top + arrowhead);
	}
	else {
		gfx.moveTo(left - arrowhead/2, top); gfx.lineTo(left + arrowhead/2, top);
	}
	gfx.stroke();
	gfx.beginPath();
	gfx.moveTo(right, bot); gfx.lineTo(left, bot);
	gfx.moveTo(right, bot - arrowhead/2); gfx.lineTo(right, bot + arrowhead/2);
	gfx.stroke();
	if (graphType == "pdf") {
		let magn = scale.toExponential(1);
		gfx.fillStyle = "#000000";
		gfx.textAlign = "center";
		gfx.fillText(magn, left, top - 6);
	}
}

function fillFields() {
	let search = window.location.search;
	if (search) {
		search = search.substring(1);
		let map = {};
		for (let kv of search.split("&")) {
			let parts = kv.split("=");
			if (parts.length == 2) {
				map[parts[0]] = parts[1];
			}
		}
		if (map["s"]) {
			document.getElementById("successes").value = map["s"];
		}
		if (map["f"]) {
			document.getElementById("failures").value = map["f"];
		}
		if (map["c"]) {
			document.getElementById("confidence").value = map["c"];
		}
		if (map["g"] == "pdf") {
			document.getElementById("pdf").checked = true;
		}
		if (map["g"] == "cdf") {
			document.getElementById("cdf").checked = true;
		}
	}
}