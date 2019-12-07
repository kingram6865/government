const fs = require ('fs');
const DomParser = require('dom-parser');
const mysql = require('mysql');
var parser = new DomParser();
var dataSource = require('./connection.js');
//console.log(dataSource);
var connection = mysql.createConnection({
	/*debug: ['ComQueryPacket'],*/
	host 		: dataSource.ip,
	user 		: dataSource.login,
	password: dataSource.pass,
	database: dataSource.db
});
//connection.connect();

var full_document, test, doc, congress, x, final, final1, final2;
var links = [];
var prefix = "https://en.wikipedia.org";
x = process.argv[2];

function extractLinks(input){
	var key, record, data;
	var results = [];
	data = [];
	var id = "congress" + input;
	var html = fs.readFileSync('../html/congress.html').toString();
	var dom = parser.parseFromString(html);
	var rows, items, url, link;
	//var prefix = "https://en.wikipedia.org";
	//var removedistrict = (data) => {data.match(/district/i)}


	rows = dom.getElementById(id);
	items = rows.getElementsByTagName('li');


	console.log("==============================] Retrieving data for Congress " + input + " [" + id + "], " +
		items.length + " <li> items.");

	console.log();
	
	for (var i=0; i < items.length; i++){
		var result, arraysize;
		var regex=/district|at-large/i;
		arraysize = items[i].getElementsByTagName('a').length;

		if ((arraysize === 1) && (!regex.test(items[i].getElementsByTagName('a')[0].getAttribute('title'))) ){
			//console.log("Cleanse: ", items[i].getElementsByTagName('a')[0].getAttribute('title'));
			key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
			result = prefix + items[i].getElementsByTagName('a')[0].getAttribute('href');
			//console.log(arraysize + " choice: " + items[i].getElementsByTagName('a')[0].getAttribute('title'));
			//console.log("{Condition 1} ArraySize[" + arraysize + "] ** {key, result}: " + key, result);
			record = {key, result};
			data.push(record);
		} if (arraysize === 2){
				for (var k=0; k < arraysize; k++){
					if ( (!regex.test(items[i].getElementsByTagName('a')[k].getAttribute('title'))) && (items[i].getElementsByTagName('a')[k].getAttribute('title')) ){
						//console.log(" " + arraysize + "] choices: " + k + " " + items[i].getElementsByTagName('a')[k].getAttribute('title'));
						//console.log("Cleanse: ", items[i].getElementsByTagName('a')[k].getAttribute('title'));
						key = cleanseString(items[i].getElementsByTagName('a')[k].getAttribute('title'));
						result = prefix + items[i].getElementsByTagName('a')[k].getAttribute('href');
						//console.log("{Condition 2} ArraySize[" + arraysize + "] ** {key, result}: " + key, result);
						record = {key, result};
						data.push(record);
					}
				}
		} if (arraysize > 2){
			/*
				This option is for the cases when there are href's underneath the main one
			*/
			
			/*console.log(items[i].getElementsByTagName('a')[0].textContent);
			console.log(items[i].getElementsByTagName('a')[1].textContent);
			console.log(items[i].getElementsByTagName('a')[2].textContent);*/
			//console.log(items[i].getElementsByTagName('a')[3].textContent);

/*			if (!/district/i.test(items[i].getElementsByTagName('a')[0].getAttribute('title'))){
				console.log("ArraySize: " + arraysize, items[i].getElementsByTagName('a')[0].getAttribute('title'));
				key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
				result = items[i].getElementsByTagName('a')[0].getAttribute('href');
			}*/
			for (var k=0; k < arraysize; k++){
				if ((!regex.test(items[i].getElementsByTagName('a')[k].getAttribute('title'))) && (items[i].getElementsByTagName('a')[k].getAttribute('title')) ){
					//console.log(" " + arraysize + "] choices: " + k + " " + items[i].getElementsByTagName('a')[k].getAttribute('title'));
					//console.log("Start ===== " + k + " =====");
					// console.log(items[i].getElementsByTagName('a')[k].getAttribute('title') + " " +
					//  	items[i].getElementsByTagName('a')[k].getAttribute('href'));
					//console.log("Cleanse: ", items[i].getElementsByTagName('a')[k].getAttribute('title'));
					key = cleanseString(items[i].getElementsByTagName('a')[k].getAttribute('title'));
					result = prefix + items[i].getElementsByTagName('a')[k].getAttribute('href');
					/*if (k === 4){
						console.log();
						console.log("======>", items[i].getElementsByTagName('a')[k].getAttribute('title'));
						console.log();
					}*/

					//console.log("===== " + k + " ===== End");
					if (key.length > 1){
						//console.log(key.length, "{Condition 3} ArraySize[" + arraysize + "] ** {key, result}: " + key, result);
						record = {key, result};
						data.push(record);
					}
				}
			}
		}

		//console.log("extractLinks: " + key + ", " + result);
		results[i] = prefix+result;
/*		record = {key, result};

		data.push(record);*/
	}

	/*data.sort((a,b) => (a.key[3] > b.key[3]) ? 1 : -1);
	for(var k=0; k < data.length; k++ ){
		console.log(data[k].key);
	}*/

	//console.log(JSON.stringify(data));
	//data.sort((a, b) => {console.log(JSON.stringify(a.result)); return (b.key > a.key) ? -1 : 1});
	data.sort((a, b) => {return (b.key > a.key) ? -1 : 1});
	/*for (var j=0; j < data.length; j++){
		console.log(JSON.stringify(data[j]));
	}*/

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
	regex = [/\ \(.*\)$/, /&quot;.*&quot;/, /\ of\ .*$/];

	if (input){
		output = input.replace(regex[0], '');
		output = output.replace(regex[1], '');
		output = output.replace(regex[2], '');

		pos = output.indexOf(",");

		if (pos > -1){
			// If the string has a "," we need to divide on the comma first
			// then on the white space.
			output = output.split(",");
			output = output[0].split(" ");
			//console.log("[Branch 1.1] Input: ", input, "Changed to ", output);
		} else {
			// No comma found in the string so split on the whitespace
			output = output.split(" ");
			//console.log("Result of Split: " + output);

			if ((output.length === 3) && ( (/\bI\b/i.test(output[2])) || (/\bII\b/i.test(output[2])) ||
				(/III/i.test(output[2])) || (/Jr\./i.test(output[2])) || (/Sr\./i.test(output[2])) )){
				// If the resulting array has 3 elements, and the 3rd element is a suffix,
				// add a blank entry for middlename

				//console.log("Alignment Check! " + output);
				output.splice(1,0," ");
				//console.log("[Branch 2.1] Input: ", input, "Changed to ", output);
				//console.log("Name has suffix. Name matrix adjusted! " + output);
			/*} else if (output.length === 2){
				console.log("Alignment Check! " + output);*/
			} else if (output.length === 2){
				// If the resulting array has 2 elements, add a blank entry for the middlename
				//console.log("[Branch 2.2] Input ", output, "<=======");
				output.splice(1,0," ");
				//console.log("[Branch 2.2] Output after splice ", output, "<=======")
				//console.log("[Branch 2.2] Input: ", input, "Changed to ", output);
				//console.log("Name matrix adjusted " + output);
			/*} else if ((output.length === 4) && ( (!/\bI\b/i.test(output[2])) || (!/\bII\b/i.test(output[2])) ||
				(!/III/i.test(output[2])) || (!/Jr\./i.test(output[2])) || (!/Sr\./i.test(output[2]))) &&
				(!/\bSt\.\b/.test(output[1])) ){

				newname = output[1] + " " + output[2];
				output.splice(1,2,newname);
				process.stdout.write(JSON.stringify(output));*/
			}
		}
	} else {
		output = input;
		//console.log("Branch 2", input);
	}

/*	if (output.length > '3'){
		console.log("Before surnameCheck(): " + output + " " + output.length);
	}*/

	//process.stdout.write(`${output}`);
	
	index = surnameCheck(output);
	//console.log(". Index of data fitting Van or St.: [" + index + "]");
	if (index){
		console.log(" ************** ");
		/*for (var k=0; k < index.length; k++){
			if (index[k]){
				console.log("Results of surnameCheck: " + output + ", " + output[index[k]]);
			}	
		}*/
		console.log("Results of surnameCheck: " + output + ", " + output[index]);
	}
	

	if (index === 1) {
		//console.log("surnameCheck-> output.length: " + index);
		if ( (output.length === 3) && (/\bjr\.\b|\bsr\.\b|\bI\b|\bII\b|\bIII\b/i.test(output[2])) ){
			//console.log("              Branch 1, surnameCheck-> " + output.length);
			output.splice(1,0," ");
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			//console.log();
		} else if (output.length === 3){
			//console.log("              Branch 2, surnameCheck-> " + output.length);
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			output.splice(1,0, " ");
			//console.log();
		} else if (output.length > 3){
			//console.log("              Branch '3', surnameCheck-> " + output.length);
			newname = output[index] + " " + output[2];
			output.splice(index, 2, newname);
			output.splice(1,0, " ");
			//console.log();
		} else {
			//console.log("              Branch 4, surnameCheck-> " + output.length + " " + output);
		}
		
		//console.log("Index of Van or St.: " + index + ". New output: " + output);
		//console.log("Output: " + output);
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
	//console.log("findRecord(" + JSON.stringify(input) + ")");
	var record;
	var keysize = input.key.length;
	var data = [];
	var key_test = ( (/^I$/i.test(input.key[3])) || (/^II$/i.test(input.key[3])) || (/^III$/i.test(input.key[3])) || (/^Jr\.$/i.test(input.key[3])) ||
		(/^Sr\.$/i.test(input.key[3])) );
	//console.log("key test:" + key_test + ", key:" + input.key);

	//var info = "key length: " + keysize;
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
				//console.log(JSON.stringify(row));
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
	/*
		See if the input ["last_name", "first_name"] exists in the database
	*/

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
					//console.log(JSON.stringify(results));
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
		//console.log("**** Begin Process Record ****");
		//console.log("Searched DB for ", JSON.stringify(info), ", DB check returned " + JSON.stringify(input));
		//process.stdout.write("Searched DB for " + JSON.stringify(`${info}`) + " => ");
		//process.stdout.write("Searched DB for " + JSON.stringify(info) + " => ");
		if ((middlename === null) && (suffix === null) && (link === null)){
			//console.log("{000} [" + objid + "] \t" + firstname, lastname, " => No wikipedia entry.");
			database_data = {firstname, lastname};
			//console.log("{000} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
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
			database_data = {objid, firstname, lastname, suffix};
			//console.log("{010} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
		} else if ((middlename !== null) && (suffix === null) && (link === null)){
			//console.log("{100} [" + objid + "] \t" + firstname, middlename, lastname, " => No wikipedia entry.");
			database_data = {objid, firstname, middlename, lastname};
			//console.log("{100} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
		} else if ((middlename !== null) && (suffix !== null) && (link === null)){
			//console.log("{110} [" + objid + "] \t" + firstname, middlename, lastname, suffix, " => No wikipedia entry.");
			database_data = {objid, firstname, middlename, lastname, suffix};
			//console.log("{110} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
		}	 else if (link !== null){
			//console.log("Database record has wikipedia. No action taken.", JSON.stringify(info));
			//console.log("Wikipedia link? [TRUE]");
			//console.log();
		}
	} else {
		/*
			If the searched name does not exist, create the record and add the wikipedia link
		*/

		// console.log("No Database entry found for ", info, ". Adding data: [" + original.key[0] + " " + original.key[1] + " " + 
		// 	original.key[2] + " " + ((original.key[3]) ? original.key[3] : "")  + ", " + prefix + original.result + "]");
	}
	//console.log("**** End Process Record ****");
	//updateRecord(database_data, html_data);
}

function updateRecord(database, htmldata){

}

function surnameCheck(input){
	/*
		Returns an integer which indicates the index of the expression
	*/

	//var expressions = [/\bVan\b/i,/\bSt\.\b/i];
	var regexTest;
	var expressions = [/\bSt\b/i,/\bVan\b/i,/\bde\b/i];
	var result;
	//console.log("surnameCheck(" + input + ")");
	for (var j=0; j < expressions.length; j++){
		regexTest = expressions[j].test(input);
		
		var data = (element) => element.match(expressions[j]);
		//process.stdout.write();
		

		//(regexTest) ? console.log("Test Succeeded", regexTest) : console.log("Test Failed", regexTest)
		//if (expressions[j].test(input)){
		//console.log("Test result: ", regexTest, " <<<<<< ");
		if (regexTest){
			console.log("<Loop " + j + ">      >> ", JSON.stringify(input), ", ", expressions[j], ", ", regexTest,
			", ", input.findIndex(data));
			//result[j] = input.findIndex(data);
			result = input.findIndex(data);
		}
	}

	//console.log("Results after checking regex: " + JSON.stringify(result));

	return result;
}

function locateExtras(input){
				var seek = [/[A-Z]\./i,/^I$/i,/^II$/i,/^III$/i,/Jr\./i,/Sr\./i];
			var locations = [];
}

function removeArrayDupes(input){
	var i = input.length;
	//console.log("Processing array to remove dupes. Input length = " + i);
	if (i){
		//while ((--i) && (i < input.length)){
		while (--i){
			/*console.log(JSON.stringify(input[i].key), " === " ,JSON.stringify(input[i-1].key) + 
				"?", "Test says", (JSON.stringify(input[i]) === JSON.stringify(input[i-1])));*/
			//console.log("Test ", ((input[i]) === (input[i-1])));
			if (JSON.stringify(input[i]) === JSON.stringify(input[i-1])){
			//if ((input[i]) === (input[i-1])){
				//console.log(JSON.stringify(input[i]), " compared to ", JSON.stringify(input[i-1]));
				//console.log("Before splice input[" + i + "] = " + JSON.stringify(input[i]));
				input.splice(i,1);
				//console.log("After splice input[" + i + "] = " +JSON.stringify(input[i]));
			}
		}
	}

/*	for (var k=0; k < input.length; k++){
		console.log(input[k].key);
	}*/

	return input;
}


links = extractLinks(x);
/*for (var k=0; k < links.length; k++){
	console.log(links[k]);
}*/

links = cleanArray(links);

console.log();
process.stdout.write("Array size before removing dupes " + links.length + ", ");
final1 = removeArrayDupes(links);
final = final1.sort();
/*final2 = removeArrayDupes(final);*/
console.log("Array size after removing dupes " + final1.length);

for (var j=0; j < final.length; j++){
	//console.log(JSON.stringify(links[j]));
	//console.log(JSON.stringify(final2[j].key));
	//console.log("Checking existence of ", JSON.stringify(final[j]), "in the database.");
	findRecord(final[j]);
/*	if( (links[j].key) && (links[j].key.length < 3)){
		console.log(JSON.stringify(links[j]));
	} else if (!links[j].key){
		console.log(JSON.stringify(links[j]));
	}*/
}

console.log("<++++++++++++++++++++++++++++++++++>");
connection.end();