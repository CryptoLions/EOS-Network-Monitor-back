/* 
	Cache BPs logos
*/
const rp 		= require("request-promise");
const request 	= require('request')
const path 		= require("path");
const fs 		= require("fs");
const sharp 	= require('sharp');

const { connect: connectToDB } = require('../../db');
const { ProducerModelV2 }  	   = require('../../db');

const defaultImg = '/eosio.png';
const bpsImg = '/images/bps/';
const bpsImgPath = path.join(__dirname, '../../cache/images/bps/');

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
       await callback(array[index], index, array);
  }
}

async function downloadBPImage(url, filename){
	let headers;
	try {
		headers = await rp.head(url);
	} catch(e){
		console.error('Headers', e);
		return false;
	} 
	if (!headers || !headers){
		return false;
	}
	let format = `.${headers['content-type'].split('/')[1]}`;
    if (format === '.html'){
    	return false;
    }
    let pathToFile = filename + format;
    await new Promise(resolve => {
    	request(url).pipe(fs.createWriteStream(pathToFile)).on('finish', resolve);
    });
    await sharp(pathToFile).resize(32, 32).toFile(filename + '_32' + format);
    return format;
};

const cacheImages = async () => {
	try {
		await connectToDB();
	} catch (e){
		return console.error('DB connection', e);
	}

	ProducerModelV2.find().sort({ total_votes: -1, name: 1 }).exec((err, result) => {
		if (err){
			return console.error(err);
		}
		if (!result){
			return console.error('Empty table of Producers');
		}
		asyncForEach(result, async (elem, index) => {
  			 if (elem && elem.bpData && elem.bpData.org && elem.bpData.org.branding && elem.bpData.org.branding.logo_256){
  			 	let format;
  			 	try {
					format = await downloadBPImage(elem.bpData.org.branding.logo_256, `${bpsImgPath}${elem.name}`);
  			 	} catch(e) {
  			 		console.error(e);
  			 	}
  			 	console.log(`============ ${elem.name}${format}`);
  			 	let logoPath = (format) ? `${bpsImg}${elem.name}_32${format}` : defaultImg;
  			 	try{
  			 		await ProducerModelV2.findOneAndUpdate({ name: elem.name }, { logoCached: logoPath });	
  			 	} catch(e) {
  			 		console.error('Save logo', e);
  			 	}
  			 } 
  			 if (result.length === index + 1){
  			 	process.exit();
  			 }
		});
	});
}

cacheImages();


