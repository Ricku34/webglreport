const express = require('express');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid');
const buildIndex = require('./buildIndex.js');
const PORT = process.env.PORT || 8080;



express()
	.use("/", express.static(__dirname, {
		index: "report.html"
	}))
	.use('/report', express.text({ type: "application/json" }))
	.post('/report', (req, res) => {
		var id = uuid.v4();
		fs.writeFile("./data/" + id + '.json', req.body, (err) => {
			if(err) {
				console.error(err);
				res.status(500).send(err);
			} else {
				buildIndex(id,JSON.parse(req.body), (err,index) => {
					if(err) {
						console.error(err);
						res.status(500).send(err);
					} else {
						console.log(index);
						res.send("Done!");
					}
				});
			}
		});
	})
	.listen(PORT, () => { console.log(`Listening on ${PORT}`); });
