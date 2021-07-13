const path = require('path');
const fs = require('fs');


function buildIndex(id, report, callback) {

	fs.readFile("./data/index.json", 'utf8', (err, data) => {
		var index = (!err) ? JSON.parse(data) : { renderers: {} };

		var renderer, agent;
		if (!index.renderers[report.unMaskedRenderer]) {
			renderer = index.renderers[report.unMaskedRenderer] = { agents: {} };
		} else {
			renderer = index.renderers[report.unMaskedRenderer];
		}
		if (!renderer.agents[report.userAgent]) {
			agent = renderer.agents[report.userAgent] = { webgl: {} };
		} else {
			agent = renderer.agents[report.userAgent];
		}
		agent.webgl[report.webglVersion] = id;

		fs.writeFile("./data/index.json",JSON.stringify(index, null, '\t'), err => {
			callback(err,index);
		})

	});
}

if(require.main === module) {
	var report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
	var id = path.basename(process.argv[2],'.json');
	buildIndex(id,report,(err,index) => {
		if(err) {
			console.error(err);
		}
		console.log(JSON.stringify(index, null, '\t'));
	})
} else {
	module.exports = buildIndex;
}

