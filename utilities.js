const fs = require ('fs');
const DomParser = require('dom-parser');
const mysql = require('mysql');
var parser = new DomParser();
var dataSource = require('./connection.js');
//console.log(dataSource);
var pool = mysql.createPool(dataSource);

var full_document, test, doc, congress, x, final, final1, final2, database_changes, resultValue;
database_changes = [];
var promises = [];
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
			key = cleanseString(items[i].getElementsByTagName('a')[0].getAttribute('title'));
			result = items[i].getElementsByTagName('a')[0].getAttribute('href');
			record = {key, result};
			data.push(record);
		} else if (arraysize === 2){
				for (var k=0; k < arraysize; k++){
					if ( (!regex.test(items[i].getElementsByTagName('a')[k].getAttribute('title'))) && (items[i].getElementsByTagName('a')[k].getAttribute('title')) ){
						key = cleanseString(items[i].getElementsByTagName('a')[k].getAttribute('title'));
						result = items[i].getElementsByTagName('a')[k].getAttribute('href');
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
	}

	data.sort((a, b) => {return (b.key > a.key) ? -1 : 1});
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
		output = input.replace(regex[0], '');
		output = output.replace(regex[1], '');
		output = output.replace(regex[2], '');
		output = output.replace(regex[3], '');
		output = output.split(" ");
		if ((output.length === 3) && ( (suffixRE.test(output[2])) )){
			// If the resulting array has 3 elements, and the 3rd element is a suffix,
			// add a blank entry for middlename
			output.splice(1,0," ");
		} else if (output.length === 2){
			output.splice(1,0," ");
		}
	} else {
		output = input;
		if (output) {
			console.log("This key length is " + output.length + " and was not altered " + JSON.stringify(output));
		} else {
			console.log(JSON.stringify(input));
		}
	}

 	if (output){
 		index = surnameCheck(output);
 	}

	if (index === 1) {
		if ( (output.length === 3) && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[2])) ){
			output.splice(1,0,"");
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
		} else if (output.length === 3){
			newname = output[index] + " " + output[2];
			output.splice(1, 2, newname);
			output.splice(1,0, "");
		} else if ( (output.length === 4) && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3])) ){
			newname = output[index] + " " + output[index+1];
			output.splice(index, 2, newname);
			output.splice(1, 0, "");
		} else if ( (output.length === 4) && (!/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3])) ){
			newname = output[index] + " " + output[index+1];
			output.splice(index, 2, newname);
		} else if ( (output.length > 4) && (/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output)) ){
			newname = output[index] + " " + output[index+1];
			output.splice(index, 2, newname);
		}
	} else if (index === 2) {
		newname = output[index] + " " + output[index+1];
		output.splice(index,2, newname);
	} else {
		if ( output && ((output.length === 4) && (output[1] !== " ") && (!/\bjr\.|\bsr\.|\bI\b|\bII\b|\bIII\b/i.test(output[3]))) ){
			if (index >= 0){
				newname = output[index] + " " + output[index+1];
				output.splice(index, 2, newname);
			} else {
				newname = output[1] + " " + output[2];
				output.splice(1, 2, newname);
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

	var record, index;
	var keysize = input.key.length;
	var data = [];
	index = keysize - 1;
	var key_test = ( (/^I$/i.test(input.key[index])) || (/^II$/i.test(input.key[index])) || 
		(/^III$/i.test(input.key[index])) || (/^Jr\.$/i.test(input.key[index])) ||
		(/^Sr\.$/i.test(input.key[index])) );

	if (keysize === 2){
		data = [ input.key[1], input.key[0]];
	} else if (keysize === 3){
		data = [input.key[2], input.key[0]];
	} else if ((keysize === 4) && (key_test)){
		data = [input.key[2], input.key[0]];
	} else if ((keysize === 5) && (key_test)){
		data = [input.key[3], input.key[0]];
	} else if ((keysize > 4) && (!key_test)){
		data = null;
	}

	if (data){
		return checkRecord(data)
			.then((row) =>{
				return processRecord(row[0], row[1], input);
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

	if (i){
		while (--i){
			var cur = input[i];
			if (!cur.key){
				input.splice(i,1);
			}
		}
	}

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
	 
		if ((middlename === null) && (suffix === null) && (link === null)){
			database_data = {branch: '000', objid, original};
		} else if ((middlename === null) && (suffix !== null) && (link === null)){
			database_data = {branch: '010', objid, original};
		} else if ((middlename !== null) && (suffix === null) && (link === null)){
			database_data = {branch: '100', objid, original};
		} else if ((middlename !== null) && (suffix !== null) && (link === null)){
			database_data = {branch: '110', objid, original};
		}

		if (database_data){
			database_changes.push(database_data);
			resultValue = updateRecord(database_data);
		}
	} else {
		/* If the searched name does not exist, create the record and add the wikipedia link */
		console.log("     --> No database record for " + JSON.stringify(info) + ". Inserting data " + JSON.stringify(original));
		database_changes.push(original);
		resultValue = insertRecord(original);
	}

	return resultValue;
}

function updateRecord(data){
	/* Update the database record defined by 'database' with information in 'htmldata' */
	var sql, objid, link;
	objid = parseInt(data.objid);
	link = prefix + data.original.result;
	sql = "UPDATE people SET wikipedia_link = ? WHERE objid = ?";
	
	console.log(mysql.format(sql, [link, objid]));
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
							console.log("[executeQuery] Results: " + ((results.insertId) ? "Inserted " + results.insertId : "No insert completed."));
						} else if (qtype === "update"){
							//console.log(results.affectedRows);
							console.log("[executeQuery] Results. Updated " + params + ", " + ((results) ? results.affectedRows + " row." : "Update failed"));
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
	for (var j=0; j < expressions.length; j++){
		regexTest = expressions[j].test(input);
		var data = (element) => element.match(expressions[j]);
		if (regexTest){
			result = input.findIndex(data);
		}
	}

	return result;
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
	console.log("Executing findRecord(" + JSON.stringify(final[j]) + ")");
	promises.push(findRecord(final[j]));
}

console.log(JSON.stringify(promises));

Promise.all(promises)
	.then((results) => {

	})
	.catch((err) => {
		if (err) throw err;
	})
	.finally(()=>{
		pool.end();
	});

//console.log(JSON.stringify(database_changes), database_changes.join("','"));
console.log("Processing Completed ++++++++++++++++++++++++++++++++++>");
//executeQuery("SELECT now() from dual", []).then((data) => {console.log(JSON.stringify(data[0]));});