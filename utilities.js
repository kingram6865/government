const fs = require ('fs');
const DomParser = require('dom-parser');
const mysql = require('mysql');
var parser = new DomParser();
var dataSource = require('./connection.js');
//console.log(dataSource);
var pool = mysql.createPool(dataSource);
/*var connection = mysql.createConnection({
	//debug: ['ComQueryPacket'],
	host 		: dataSource.host,
	user 		: dataSource.user,
	password: dataSource.password,
	database: dataSource.database
});*/

//connection.connect();



var full_document, test, doc, congress, x, final, final1, final2, database_changes;
database_changes = [];
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

	rows = dom.getElementById(id);
	items = rows.getElementsByTagName('li');


	console.log("==============================] Retrieving data for Congress " + input + " [" + id + "], " +
		items.length + " <li> items.");

	console.log();
	
	for (var i=0; i < items.length; i++){
		var result, arraysize;
		var regex=/district|at-large|Party|delegation|independent/i;
		arraysize = items[i].getElementsByTagName('a').length;

		if ((arraysize === 1) && (!regex.test(items[i].getElementsByTagName('a')[0].getAttribute('title'))) ){
			//console.log("Cleanse: ", items[i].getElementsByTagName('a')[0].getAttribute('title'));
			key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
			result = items[i].getElementsByTagName('a')[0].getAttribute('href');
			//console.log(arraysize + " choice: " + items[i].getElementsByTagName('a')[0].getAttribute('title'));
			//console.log("{Condition 1} ArraySize[" + arraysize + "] ** {key, result}: " + key, result);
			record = {key, result};
			data.push(record);
		} else if (arraysize === 2){
				for (var k=0; k < arraysize; k++){
					if ( (!regex.test(items[i].getElementsByTagName('a')[k].getAttribute('title'))) && (items[i].getElementsByTagName('a')[k].getAttribute('title')) ){
						//console.log(" " + arraysize + "] choices: " + k + " " + items[i].getElementsByTagName('a')[k].getAttribute('title'));
						//console.log("Cleanse: ", items[i].getElementsByTagName('a')[k].getAttribute('title'));
						key = cleanseString(items[i].getElementsByTagName('a')[k].getAttribute('title'));
						result = items[i].getElementsByTagName('a')[k].getAttribute('href');
						//console.log("{Condition 2} ArraySize[" + arraysize + "] ** {key, result}: " + key, result);
						record = {key, result};
						data.push(record);
					}
				}
		} else if (arraysize > 2){
			/*
				This option is for the cases when there are href's underneath the main one
			*/
			
			for (var k=0; k < arraysize; k++){
				if ((!regex.test(items[i].getElementsByTagName('a')[k].getAttribute('title'))) && (items[i].getElementsByTagName('a')[k].getAttribute('title')) ){
					key = cleanseString(items[i].getElementsByTagName('a')[k].getAttribute('title'));
					result = items[i].getElementsByTagName('a')[k].getAttribute('href');
					if (key.length > 1){
						record = {key, result};
						data.push(record);
					}
				}
			}
		}

		results[i] = prefix+result;
/*		record = {key, result};

		data.push(record);*/
	}

	data.sort((a, b) => {return (b.key > a.key) ? -1 : 1});
	//console.log();
	/*for (var j=0; j < data.length; j++){
		if ( ( (data[j].key.length > 3) && (data[j].key[1] !== " "))  || (/\bVan\b|\bSt\.|\bde\b|\bla\b|\ble\b|\bJr\.|\bSr\.|\bI\b|\bII\b|\bIII\b|\bIV\b/i.test(data[j].key)) ){
				console.log("[extractLinks] array element [" + j + "] final form = " + JSON.stringify(data[j]));
		}
	}*/

	return data;
}

function cleanseString(input){
	var output, pos, index, newname, regex, suffixRE;
	/*
		Use regex to clear any string from starting with "(" and ending with ")"
		Split the resulting data on the whitespace and return an array
		Effectively This should return first name, middle name, last name, suffix
		This is in order to sort the data by last_name, first_name and optional suffix

		Account for I, II, III, Jr. Sr.

	*/
	index;
	regex = [/\ \(.*\)$/, /&quot;.*&quot;/, /\ of\ .*$/, /\,/];
	suffixRE = /\bI\b|\bII\b|\bIII\b|\bJr\.|\bSr\./i;

	if (input){
		//console.log(JSON.stringify("[cleanseString] " + input));
		output = input.replace(regex[0], '');
		output = output.replace(regex[1], '');
		output = output.replace(regex[2], '');
		output = output.replace(regex[3], '');


		/*pos = output.indexOf(",");

		if (pos > -1){
			// If the string has a "," we need to divide on the comma first
			// then on the white space.
			output = output.split(",");
			console.log(JSON.stringify("[cleanseString Branch 1] " + output));
			output = output[0].split(" ");

			//console.log("[Branch 1.1] Input: ", input, "Changed to ", output);
		} else {*/
			// No comma found in the string so split on the whitespace
			output = output.split(" ");
			//console.log("Result of Split: " + output);

			/*if ((output.length === 3) && ( (/\bI\b/i.test(output[2])) || (/\bII\b/i.test(output[2])) ||
				(/III/i.test(output[2])) || (/Jr\./i.test(output[2])) || (/Sr\./i.test(output[2])) )){*/
			//if ((output.length === 3) && ( (/\bI\b|\bII\b|\bIII\b|\bJr\.|\bSr\./i.test(output[2])) )){
			if ((output.length === 3) && ( (suffixRE.test(output[2])) )){
				// If the resulting array has 3 elements, and the 3rd element is a suffix,
				// add a blank entry for middlename
				output.splice(1,0," ");
				//console.log("This key length is " + output.length + ", ", JSON.stringify(output));
			/*} else if ((output.length === 3) && (!(suffixRE.test(output[2]))) ){
				console.log("This key length is " + output.length + ", ", JSON.stringify(output));
			} else if ( (output.length === 4) && ( (suffixRE.test(output[3]))) ){
				console.log("This key length is " + output.length + ", ", JSON.stringify(output));
			} else if ( (output.length === 5) && ( (suffixRE.test(output[4]))) ){
				console.log("This key length is " + output.length + ", ", JSON.stringify(output));
			} else if ( (output.length === 4) && ( !(suffixRE.test(output[3]))) ){
				console.log("This key length is " + output.length + ", ", JSON.stringify(output));
			} else if ( (output.length > 5) && (!(suffixRE.test(output[4]))) ){
				console.log("This key length is " + output.length + ", ", JSON.stringify(output));*/
			} else if (output.length === 2){
				output.splice(1,0," ");
			}
			//console.log("This key length is " + output.length + ", ", JSON.stringify(output));
		/*}*/
	} else {
		output = input;
		if (output) {
			console.log("This key length is " + output.length + " and was not altered " + JSON.stringify(output));
		} else {
			console.log(JSON.stringify(input));
		}
	}

	//process.stdout.write(`${output}`);
 	if (output){
 		index = surnameCheck(output);
 	}

	if (index === 1) {
		if ( (output.length === 3) && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[2])) ){
			//console.log("              Branch 1.1, surnameCheck-> " + output.length + " " + output);
			output.splice(1,0,"");
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			//console.log();
		} else if (output.length === 3){
			//console.log("              Branch 1.2, surnameCheck-> " + output.length + " " + output);
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			output.splice(1,0, "");
			//console.log("              " + JSON.stringify(output));
			//console.log();
		} else if ( (output.length === 4) && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3])) ){
			//console.log("              Branch 1.3, surnameCheck-> " + output.length + " " + output);
			newname = output[index] + " " + output[index+1];
			output.splice(index, 2, newname);
			output.splice(1, 0, "");
			//console.log("              Found /van/st./de/la with suffix :" + newname);
		} else if ( (output.length === 4) && (!/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3])) ){
			//console.log("              Branch 1.4, surnameCheck-> " + output.length + " " + output);
			newname = output[index] + " " + output[index+1];
			output.splice(index, 2, newname);
			//console.log("              Found /van/st./de/la without suffix :" + newname);
		} else if ( (output.length > 4) && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output)) ){
			console.log("              Branch 1.5, surnameCheck-> " + output.length + " " + output);
			newname = output[index] + " " + output[index+1];
			output.splice(index, 2, newname);
			//console.log("              Found /van/st./de/la with suffix :" + newname);
		}


		console.log("(Branch 1) " + index + ", Outlier Adjusted. New name: " + JSON.stringify(output));
	} else if (index === 2) {
		//console.log("              Branch 2.1, surnameCheck-> " + output.length + " " + output);
		newname = output[index] + " " + output[index+1];
		output.splice(index,2, newname);
		console.log("(Branch 2) " + index + ", Outlier Adjusted. New name: " + JSON.stringify(output));
	} else {
		/*if (output.length > 3) {
			// Error in this part ocurred because \b is nnot needed in regex after \.
				// console.log("Test Loop 1 for " + JSON.stringify(output) + ": " + (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3])) );
				// console.log("Test Loop 2 for " + JSON.stringify(output) + ": " + (!(/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3]))) );
		}*/

		/*if ( (output.length === 4) && (output[1] !== " ") && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3])) ){
			//console.log("              Branch '2.1', surnameCheck-> " + output.length);
			console.log("New name: " + JSON.stringify(output));
			//console.log();		
		} else*/ 
		if ( output && ((output.length === 4) && (output[1] !== " ") && (!/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3]))) ){
			//console.log("              Branch '2.2', surnameCheck-> " + output.length);
			//process.stdout.write("Adjusting " + JSON.stringify(output), " to ");
			if (index >= 0){
				newname = output[index] + " " + output[index+1];
				output.splice(index, 2, newname);
				console.log("Index >= 0 (Branch 3.1) " + index + ", Outlier Adjusted. New name: " + JSON.stringify(output));
			} else {
				newname = output[1] + " " + output[2];
				output.splice(1, 2, newname);
				console.log("(Branch 3.1) no REGEX match, Outlier Adjusted. New name: " + JSON.stringify(output));
			}

			
		}
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

		When keysize is > 3, that means there is likely a suffix in the name.
		Need to do a regex test and make sure that if the suffix is I, II, III, Jr. or Sr. that it is not
		excluded.

	*/
	//console.log("findRecord(" + JSON.stringify(input) + ")");
	var record, index;
	var keysize = input.key.length;
	var data = [];
	index = keysize - 1;
	var key_test = ( (/^I$/i.test(input.key[index])) || (/^II$/i.test(input.key[index])) || 
		(/^III$/i.test(input.key[index])) || (/^Jr\.$/i.test(input.key[index])) ||
		(/^Sr\.$/i.test(input.key[index])) );
	
	//var key_test = /^I$|^II$|^III$|^Jr\.$|^Sr\.$/i.test(input[index]);
	
	/*if (key_test){
		console.log(key_test, JSON.stringify(input));
	}*/


	if (keysize === 2){
		data = [ input.key[1], input.key[0]];
		//console.log("(findrecord branch 1) key: " + input.key);
	} else if (keysize === 3){
		data = [input.key[2], input.key[0]];
		//console.log("(findrecord branch 2) key: " + input.key);
	} else if ((keysize === 4) && (key_test)){
		data = [input.key[2], input.key[0]];
		//console.log("findRecord condition 3: " + JSON.stringify(data) + " from source: ", JSON.stringify(input));
	} else if ((keysize === 5) && (key_test)){
		data = [input.key[3], input.key[0]];
		//console.log("findRecord condition 4: " + JSON.stringify(data) + " from source: ", JSON.stringify(input));
	} else if ((keysize > 4) && (!key_test)){
		console.log("Extra work here ==> " + input.key + ". Key length: " + keysize , input.result);
		data = null;
	}

	//console.log("[findRecord]:" + data);
	if (data){
		return checkRecord(data)
			.then((row) =>{
				//console.log(JSON.stringify(row));
				processRecord(row[0], row[1], input);
				// for (var i=0; i < database_changes.length; i++){
				// 	console.log(database_changes.join("','"));	
				// }
			});
			//.then(()=>{console.log("Changes = +++>" + JSON.stringify(database_changes))});
			// .then(()=>{
			// 	pool.end((err)=>{
			// 		if (err) throw err;
			// 		//console.log("pool released.");
			// 	});
			// });
			// .then(()=>{
			// 	pool.on('release' ,function(connection){ console.log('Connection %d released', connection.threadId); });
			// });
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
	var filter = [input[0], input[1]];
	var sql = "SELECT objid, first_name, middle_name, last_name, suffix, wikipedia_link " + 
	"FROM people where last_name = ? AND first_name = ?";

	return executeQuery(sql, [input[0], input[1]]);
/*	return new Promise(function(resolve, reject){
		// pool.getConnection((err, connection) =>{
		// 	if (err){
		// 		console.log("[checkRecord] Connection Error => ", err);
		// 	} else {
				connection.query(sql, filter, (error, results, fields) =>{
				//pool.query(sql, filter, (error, results, fields) =>{
					if (error){
						console.log("Database connection error: " + error);
						//logger.info("Database connection error: " + error);
						reject("Database connection error: " + error);
					} else {
						resolve([results, filter]);						
					}
				});
		// 	}
		// });
	});*/

}

function processRecord(input, info, original){
	/*
		This function should take the input and check that value against the database.
		If the name is in the database, check to see if the wikipedia link is null or not.
		If the wikipedia link is null, update it, otherwise no changes need to be made.

		If the name is not in the database, then add the name and wikipedia link as a new record
	*/
	var result;
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
	 
		//console.log(JSON.stringify(html_data));
		if ((middlename === null) && (suffix === null) && (link === null)){
			//console.log("{000} [" + objid + "] \t" + firstname, lastname, " => No wikipedia entry.");
			//database_data = {firstname, lastname};
			database_data = {branch: '000', objid, original};
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
			//database_data = {objid, firstname, lastname, suffix};
			database_data = {branch: '010', objid, original};
			//console.log("{010} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
		} else if ((middlename !== null) && (suffix === null) && (link === null)){
			//console.log("{100} [" + objid + "] \t" + firstname, middlename, lastname, " => No wikipedia entry.");
			//database_data = {objid, firstname, middlename, lastname};
			database_data = {branch: '100', objid, original};
			//console.log("{100} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
		} else if ((middlename !== null) && (suffix !== null) && (link === null)){
			//console.log("{110} [" + objid + "] \t" + firstname, middlename, lastname, suffix, " => No wikipedia entry.");
			//database_data = {objid, firstname, middlename, lastname, suffix};
			database_data = {branch: '110', objid, original};
			//console.log("{110} Update Record. Add missing wikipedia entry for record.objid = " + objid, JSON.stringify(html_data));
		}	 else if (link !== null){
			//database_data = {branch: "none", objid: 0, original: "No changes needed"};
			//database_data = {objid, firstname, middlename, lastname, suffix, link};
			//console.log("Database record has wikipedia link. No action taken.", JSON.stringify(info));
			//console.log("Wikipedia link? [TRUE]");
			//console.log();
		}

		if (database_data){
			database_changes.push(database_data);
			result = updateRecord(database_data);
		 	// .then((data) => {
				// database_changes.push(data);
				// console.log("Update completed on " + JSON.stringify(database_data) + ", results: " + JSON.stringify(data));
		 	// });
		}
		//(database_data) ? updateRecord(database_data) : console.log("***");
	} else {
		/* If the searched name does not exist, create the record and add the wikipedia link */
		/*console.log("    --> No Database entry found for ", info, ". Insert new data: [" + original.key[0] + ", " + 
			original.key[1] + ", " + original.key[2] + ", " + ((original.key[3]) ? original.key[3] : "")  + ", " + 
			original.result + "]");*/
		console.log("     --> No database record for " + JSON.stringify(info) + ". Inserting data " + JSON.stringify(original));
		database_changes.push(original);
		result = insertRecord(original);
			// .then((data) => {
			// 	console.log(data.insertId)
			// 	database_changes.push(data.insertId);
			// });
	}
	//console.log(", Database data: " + (database_data) ? JSON.stringify(database_data) : "");
	//console.log("**** End Process Record ****");
	return result;
}

function updateRecord(data){
	/* Update the database record defined by 'database' with information in 'htmldata' */
	var sql, objid, link;
	objid = parseInt(data.objid);
	link = prefix + data.original.result;
	sql = "UPDATE people SET wikipedia_link = ? WHERE objid = ?";
	//connection.query(sql, [link, objid]);
	//sql  = "UPDATE people SET wikipedia_link = '" + link + "' WHERE objid = " + objid;
	//console.log("    Add wikipedia link to: " + JSON.stringify(data));
	
	console.log(mysql.format(sql, [link, objid]));
	//writeResults("Congress_" + x + ".sql", mysql.format(sql, [link, objid]) + ";\n");
	return executeQuery(sql, [link, objid], "update");
}

function insertRecord(htmldata){
	/* Insert new record composed of the data in 'htmldata' */
	var sql, firstname, middlename, lastname, suffix, link;
	firstname = htmldata.key[0];
	middlename = (htmldata.key[1]) ? htmldata.key[1] : null;
	lastname = htmldata.key[2];
	suffix = (htmldata.key[3]) ? htmldata.key[3] : null;
	link = prefix + htmldata.result

	var sql = "INSERT INTO people (first_name, middle_name, last_name, suffix, wikipedia_link) VALUES (?,?,?,?,?)";
	console.log("     " + mysql.format(sql, [firstname, middlename, lastname, suffix, link]));
	//writeResults("Congress_" + x + ".sql", mysql.format(sql, [firstname, middlename, lastname, suffix, link]) + ";\n");
	return executeQuery(sql, [firstname, middlename, lastname, suffix, link], "insert");
}

function writeResults(filename, data){
	return new Promise((resolve, reject) => {
			fs.appendFile(filename, data, (err) => {
				if (err) throw err;
				resolve("Wrote {" + data + "} to {" + filename + "}");
			});
		});
}

function executeQuery(query, params, qtype){
	return new Promise((resolve, reject) =>{
		pool.getConnection((err, connection) => {
			if (err) {
				console.log(err);
			} else {
				connection.query(query, params, (error, results, fields) => {
					connection.release();
					if (error){
						console.log("Database connection error: " + error);
						reject("Database connection error: " + error);
					} else {
						if (qtype === "insert"){
							console.log("[executeQuery] Results: " + (results.insertId) ? "Inserted " + results.insertId : "No insert completed.");
						} else if (qtype === "update"){
							//console.log(results.affectedRows);
							console.log("[executeQuery] Results. Updated " + params + " " + (results) ? results.affectedRows + " row." : "Update failed");
						}
						resolve([results, params]);
					}
				});
			}
		});
	});
}

function surnameCheck(input){
	/*
		Returns an integer which indicates the index of the expression
	*/
	var regexTest, keylength, result, location, propername;
	var expressions = [/\bSt\./i,/\bVan\b/i,/\bde\b/i,/\ble\b/i,/\bla\b/i,/\bdu\b/i];
	
	propername = [];
	keylength = input.length;
	//console.log("surnameCheck(" + input + ")");
	for (var j=0; j < expressions.length; j++){
		regexTest = expressions[j].test(input);
		var data = (element) => element.match(expressions[j]);
		//process.stdout.write();
		if (regexTest){
			result = input.findIndex(data);
		}
	}

	//console.log("[surnameCheck] " + JSON.stringify(input) + ", result: " + result);
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
			if (JSON.stringify(input[i]) === JSON.stringify(input[i-1])){
				input.splice(i,1);
			}
		}
	}
	return input;
}

function dbChangeLog(data){
	database_change.push(data);
}

links = extractLinks(x);
links = cleanArray(links);

console.log();
process.stdout.write("Array size before removing dupes " + links.length + ", ");
final1 = removeArrayDupes(links);
final = final1.sort();
console.log("Array size after removing dupes " + final.length);
console.log();

for (var j=0; j < final.length; j++){
	//console.log("Executing findRecord(" + JSON.stringify(final[j]) + ")");
	findRecord(final[j]);
}

/*Promise.all(findRecord())
	.then(() =>{
		pool.end((err) => {
			console.log("Script complete.");
		});
	});*/

//console.log(JSON.stringify(database_changes), database_changes.join("','"));
console.log("Processing Completed ++++++++++++++++++++++++++++++++++>");
/*connection.end(function(err){
	console.log("End MySQL connection");
});*/

console.log();
executeQuery("SELECT now() from dual", []).then((data) => {console.log(JSON.stringify(data[0]));});