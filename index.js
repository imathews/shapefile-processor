const fs = require('fs');

const stringify = require('csv-stringify');
const topojson = require('topojson-server');
const { simplify, presimplify } = require('topojson-simplify');
const { feature } = require('topojson-client');
const shapefile = require('shapefile');
const geobuf = require('geobuf');
const Pbf = require('pbf');
const geojsonExtent = require('geojson-extent');


const shpPath = process.argv[2];
const dbfPath = process.argv[3];
const outfilePath = process.argv[4] || 'converted_shapefile.csv';

const simplificationLevels = [1, 5, 10, 20, 50];

shapefile
	.read(shpPath, dbfPath)
	.then((res) => {
		const properties = getAllProperties(res.features);
		let topology = topojson.topology([res], 1e5);

		topology = presimplify(topology);
		const arcWeightPercentiles = getArcWeightPercentiles(topology.arcs);
		const simplifiedGeoJson = simplificationLevels.map((level, i) =>
			feature(simplify(topology, arcWeightPercentiles[i]), topology.objects[Object.keys(topology.objects)[0]]),
		);

		const csvData = [];
		for (let i = 0; i < res.features.length; i++) {
			const feature = res.features[i];
			const row = {};
			for (const property of properties) {
				row[property] = feature.properties[property];
			}
			row.bbox = geojsonExtent(feature).join(',');
			row.geojson = JSON.stringify(feature);
			feature.properties = undefined;
			row.geobuf = Buffer.from(geobuf.encode(feature, new Pbf())).toString('base64');
			for (let n = 0; n < simplificationLevels.length; n++) {
				const feature = simplifiedGeoJson[n].features[i];
				feature.properties = undefined;
				row[`geobuf_simplified_${simplificationLevels[n]}`] = Buffer.from(
					geobuf.encode(feature, new Pbf()),
				).toString('base64');
			}
			csvData.push(row);
		}
		stringify(csvData, { header: true }).pipe(fs.createWriteStream(outfilePath));
	})
	.catch(console.log);

// Returns an array of all properties observed across the features
function getAllProperties(features) {
	const propertiesSet = new Set();
	for (const feature of features) {
		for (const property in feature.properties) {
			propertiesSet.add(property);
		}
	}
	return [...propertiesSet];
}

function getArcWeightPercentiles(arcs) {
	const arcAreas = [];

	for (const arc of arcs) {
		for (const coord of arc) {
			if (coord[2] !== Infinity) {
				arcAreas.push(coord[2]);
			}
		}
	}

	arcAreas.sort((a, b) => a - b);

	return simplificationLevels.map((level) => {
		return arcAreas[arcAreas.length - 1 - Math.floor(arcAreas.length / (100 / level))];
	});
}
