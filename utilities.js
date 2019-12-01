const fs = require ('fs');
const DomParser = require('dom-parser');
const mysql = require('mysql');
var parser = new DomParser();
var connection = mysql.createConnection({
	/*debug: ['ComQueryPacket'],*/
	host 		: '192.168.1.19',
	user 		: 'root',
	password: 'gt560bs',
	database: 'government'
});
//connection.connect();

var full_document, test, doc, congress, x, final;
var links = [];
x = process.argv[2];

function extractLinks(input){
	var key, record, data;
	var results = [];
	data = [];
	var id = "congress" + input;
	var html = fs.readFileSync('../html/congress.html').toString();
	var dom = parser.parseFromString(html);
	var rows, items, url, link;
	var prefix = "https://en.wikipedia.org";
	//var removedistrict = (data) => {data.match(/district/i)}


	rows = dom.getElementById(id);
	items = rows.getElementsByTagName('li');


	console.log("==============================] Retrieving data for Congress " + input + " [" + id + "], " +
		items.length + " <li> items.");

	console.log();
	var j=0
	for (var i=0; i < items.length; i++){
		var result, arraysize;
		var regex=/district/;
		arraysize = items[i].getElementsByTagName('a').length;

		if ((arraysize === 1) && (!/district/i.test(items[i].getElementsByTagName('a')[0].getAttribute('title'))) ){
			key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
			result = items[i].getElementsByTagName('a')[0].getAttribute('href');
		} if (arraysize === 2){
			key = cleanseString(items[i].getElementsByTagName('a')[1].getAttribute('title'));
			result = items[i].getElementsByTagName('a')[1].getAttribute('href');
		} if (arraysize > 2){
			/*
				This option is for the cases when there are href's underneath the main one

			*/
			for (var k=0; k < arraysize; k++){
				if (!/district/i.test(items[i].getElementsByTagName('a')[0].getAttribute('title'))){
					//console.log("Start ===== " + k + "" =====");
					/*console.log(items[i].getElementsByTagName('a')[k].getAttribute('title') + " " +
						items[i].getElementsByTagName('a')[k].getAttribute('href'));*/
					key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
					result = items[i].getElementsByTagName('a')[0].getAttribute('href');
					//console.log("===== " + k + "" ===== End");
				}
			}
		}
		
		//console.log(key);

/*		test = items[i].getElementsByTagName('a')[1];
		// Currently if [0] and [1] have data, there is a duplicate entry for certain records.

		if (!test){
			//The regex is needed to clean out any text that is not a peron's name
			//console.log("There is data in [1]");
			if (items[i].getElementsByTagName('a')[0]){
				var search = items[i].getElementsByTagName('a')[0].getAttribute('title').match(regex);
				
				if (!search){
					key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
					result = prefix + items[i].getElementsByTagName('a')[0].getAttribute('href');
				} else {
					continue;
				}
			} else {
				continue;
			}
		} else {
			//console.log("There is data in [0]");
			var search = items[i].getElementsByTagName('a')[1].getAttribute('title').match(regex);

			if (!search){
				key = cleanseString(items[i].getElementsByTagName('a')[1].getAttribute('title'));
				result = prefix + items[i].getElementsByTagName('a')[1].getAttribute('href');
			} else {
				continue;
			}
		}*/

		//console.log("extractLinks: " + key + ", " + result);
		results[i] = prefix+result;
		record = {key, result}

		data.push(record);
		j++;
	}

	/*data.sort((a,b) => (a.key[3] > b.key[3]) ? 1 : -1);
	for(var k=0; k < data.length; k++ ){
		console.log(data[k].key);
	}*/

	//console.log(JSON.stringify(data));
	return data;
}

function cleanseString(input){
	var output, pos, index, newname, regex;
	/*
		Use regex to clear any string from starting with "(" and ending with ")"
		Split the resulting data on the whitespace and return an array
		Effectively This should return first name, middle name, last name, suffix
		This is in order to sort the data by last_name, first_name and optional suffix

		Account for I, II, III, Jr. Sr.

	*/
	index;
	regex = [/\ \(.*\)$/, /&quot;.*&quot;/];

	if (input){
		output = input.replace(regex[0], '');
		output = output.replace(regex[1], '');

		pos = output.indexOf(",");
		if (pos > -1){
			output = output.split(",");
			output = output[0].split(" ");
		} else {
			output = output.split(" ");
			//console.log("Result of Split: " + output);
			if ((output.length === 3) && ( (/\bI\b/i.test(output[2])) || (/\bII\b/i.test(output[2])) ||
				(/III/i.test(output[2])) || (/Jr\./i.test(output[2])) || (/Sr\./i.test(output[2])) )){
				//console.log("Alignment Check! " + output);
				output.splice(1,0," ");
				//console.log("Name has suffix. Name matrix adjusted! " + output);
			/*} else if (output.length === 2){
				console.log("Alignment Check! " + output);*/
			} else if (output.length === 2){
				output.splice(1,0," ");
				//console.log("Name matrix adjusted " + output);
			}
		}
	} else {
		output = input;
	}

/*	if (output.length > '3'){
		console.log("Before surnameCheck(): " + output + " " + output.length);
	}*/

	index = surnameCheck(output);

	if (index === 1) {
		//console.log("surnameCheck-> output.length: " + index);
		if ( (output.length === 3) && (/\bjr\.\b|\bsr\.\b|\bI\b|\bII\b|\bIII\b/i.test(output[2])) ){
			console.log("              Branch 1, surnameCheck-> " + output.length);
			output.splice(1,0," ");
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			console.log();
		} else if (output.length === 3){
			console.log("              Branch 2, surnameCheck-> " + output.length);
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			output.splice(1,0, " ");
			console.log();
		} else if (output.length > 3){
			console.log("              Branch '3', surnameCheck-> " + output.length);
			newname = output[index] + " " + output[2];
			output.splice(index, 2, newname);
			output.splice(1,0, " ");
			console.log();
		} else {
			console.log("              Branch 4, surnameCheck-> " + output.length + " " + output);
		}
		
		//console.log("Index of Van or St.: " + index + ". New output: " + output);
		console.log("Output: " + output);
		//console.log("<=========================================>");	
		
	} else if (index === 2) {
		//console.log("[Loop 2] Index of Van or St.: " + index + ". New output: " + output);
		newname = output[index] + " " + output[index+1];
		output.splice(2,2, newname);
		//console.log("New key configuration: " + output);
		console.log("Output: " + output);
		//console.log("<=========================================>");	
	}


	return output;
}

function findRecord(input){
	/*
		Once the record has been created linking the name to the wikipedia link, check the database
		to see if the name is recorded, and make sure the name for the link matches the name in the database.
		If the name is not recorded, create a record for the name and wiki_url.

		If the record is found, we want to know if it exactly matches the name being checked, and if 
		it has the wikipedia link stored.

		When keysize is > 3, that means there is a suffix in the name.
		Need to do a regex test and make sure that if the suffix is II, III, Jr. or Sr. that it is not
		excluded.

	*/
	console.log("findRecord(" + JSON.stringify(input) + ")");
	var record;
	var keysize = input.key.length;
	var data = [];
	var key_test = ( (/^I$/i.test(input.key[3])) || (/^II$/i.test(input.key[3])) || (/^III$/i.test(input.key[3])) || (/^Jr\.$/i.test(input.key[3])) ||
		(/^Sr\.$/i.test(input.key[3])) );
	//console.log("key test:" + key_test + ", key:" + input.key);

	var info = "key length: " + keysize;
	if (keysize === 2){
		data = [ input.key[1], input.key[0]];
		//console.log("(findrecord branch 1) key: " + input.key);
	} else if (keysize === 3){
		data = [input.key[2], input.key[0]];
		//console.log("(findrecord branch 2) key: " + input.key);
	} else if ((keysize > 3) && (key_test)){
		data = [input.key[2], input.key[0]];
		//console.log("(findrecord branch 3) key: " + input.key);
	} else {
		console.log("Extra work here ==> " + input.key + ". Key length inconsistent.", input.result);
		data = null;
	}

	if (data){
		checkRecord(data)
			.then((row) =>{
				//console.log(row);
				processRecord(row[0], row[1], input);
			});
		}
}

/**
 * @param  {[array]}
 * Does not return a value. Alter's array in place
 */
function cleanArray(input){
	/*
	Remove any any object items that have a key of null.
	This is also where duplicates should be removed.
	Or perhaps create a new function removeDuplicates()
	*/
	var i = input.length;
	var k = input.length;
	var previous;
	input.sort();
/*	for (var j=0; j < i; j ++){
		console.log(JSON.stringify(input[j]));
	}*/

	if (i){
		while (--i){
			var cur = input[i];
			if (!cur.key){
				// Remove empty records
				input.splice(i,1);
			}
		}
	}

/*	for (var j=0; j < input.length; j ++){
			console.log(JSON.stringify(input[j].key));
		}
*/
return input;

}

function checkRecord(input){
	return new Promise(function(resolve, reject){
			var filter = [input[0], input[1]];
			var sql = "SELECT objid, first_name, middle_name, last_name, suffix, wikipedia_link " + 
			"FROM people where last_name = ? AND first_name = ?";
		
			connection.query(sql, filter, (error, results, fields) =>{
				/*if (error) throw error;*/
				if (error){
					console.log("Database connection error: " + error);
					logger.info("Database connection error: " + error);
					reject("Database connection error: " + error);
				} else {
					//console.log(filter);
					resolve([results, filter]);						
				}
			});
		});
}

function processRecord(input, info, original){
//	console.log(JSON.stringify(input[0]));
	var database_data, html_data;
	html_data = original;

	if (input[0]){
		var objid, firstname, middlename, lastname, suffix, link;
		objid = input[0].objid;
		firstname = input[0].first_name;
		middlename = input[0].middle_name;
		lastname = input[0].last_name;
		suffix = input[0].suffix;
		link = input[0].wikipedia_link;		

		if ((middlename === null) && (suffix === null) && (link === null)){
			//console.log("{000} [" + objid + "] \t" + firstname, lastname, " => No wikipedia entry.");
			database_data = {firstname, lastname};
		/*} else if ((middlename === null) && (suffix === null) && (link !== null)){
			console.log("{001} [" + objid + "] \t" + firstname, lastname, link);
			database_data = {firstname, lastname, link};
		} else if ((middlename !== null) && (suffix !== null) && (link !== null)) {
			console.log("{111} [" + objid + "] \t" + firstname, middlename, lastname, suffix, link);
			database_data = {firstname, middlename, lastname, suffix, link};
		} else if ((middlename === null) && (suffix !== null) && (link !== null)){
			console.log("{011} [" + objid + "] \t" + firstname, lastname, suffix, link);
			database_data = {firstname, lastname, suffix, link};
		} else if ((middlename !== null) && (suffix === null) && (link !== null)){
			console.log("{101} [" + objid + "] \t" + firstname, middlename, lastname, link);
			database_data = {firstname, middlename, lastname, link};*/
		} else if ((middlename === null) && (suffix !== null) && (link === null)){
			//console.log("{010} [" + objid + "] \t" + firstname, lastname, suffix, " => No wikipedia entry.");
			database_data = {firstname, lastname, suffix};
		} else if ((middlename !== null) && (suffix === null) && (link === null)){
			//console.log("{100} [" + objid + "] \t" + firstname, middlename, lastname, " => No wikipedia entry.");
			database_data = {firstname, middlename, lastname};
		} else if ((middlename !== null) && (suffix !== null) && (link === null)){
			//console.log("{110} [" + objid + "] \t" + firstname, middlename, lastname, suffix, " => No wikipedia entry.");
			database_data = {firstname, middlename, lastname, suffix};
		}		
	} else {
		/*
			If the searched name does not exist, create the record and add the wikipedia link
		*/

		console.log("No Database entry found for ", info, original.key[0] + " " + original.key[1] + " " + 
			original.key[2] + " " + original.key[3] + ", " + original.result);
	}

	//updateRecord(database_data, html_data);
}

function updateRecord(database, htmldata){
	

}

function surnameCheck(input){
	var expressions = [/\bVan\b/i,/\bSt\.\b/i];
	var result;
	//console.log("surnameCheck(" + input + ")");
	for (var j=0; j < expressions.length; j++){
		var data = (element) => element.match(expressions[j]);
		if (expressions[j].test(input) ){
			//console.log(result);
			result = input.findIndex(data);
			//console.log("Test done. Array index of matching string: " + result + ", Input data: " + input);
			//console.log("Input: " + input);
		}
	}
	return result;
}

function locateExtras(input){
				var seek = [/[A-Z]\./i,/^I$/i,/^II$/i,/^III$/i,/Jr\./i,/Sr\./i];
			var locations = [];
}

function removeArrayDupes(input){
	var i = input.length;

	if (i){
		while ((--i) && (i < input.length)){
			console.log(input[i].key, input[i-1].key);
			if (input[i].key === input[i-1].key){
				input.splice(i,1);
			}
		}
	}

	for (var k=0; k < input.length; k++){
		console.log(input[k].key);
	}

}


links = extractLinks(x);
/*for (var k=0; k < links.length; k++){
	console.log(links[k]);
}*/

//cleanArray(data);
links = cleanArray(links);

console.log("Array size before removing dupes " + links.length);
final = removeArrayDupes(links);
console.log("Array size after removing dupes " + links.length);

/*for (var j=0; j < final.length; j++){
	//console.log(links[j].key[0], links[j].key[1], links[j].key[2], links[j].key[3]);
	console.log(JSON.stringify(final[j].key));
}*/

for (var j=0; j < links.length; j++){
	//console.log(JSON.stringify(links[j]));
	//console.log(JSON.stringify(final[j].key));
	//findRecord(links[j]);
/*	if( (links[j].key) && (links[j].key.length < 3)){
		console.log(JSON.stringify(links[j]));
	} else if (!links[j].key){
		console.log(JSON.stringify(links[j]));
	}*/
}

console.log("<++++++++++++++++++++++++++++++++++>");

connection.end();