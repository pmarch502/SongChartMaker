let origData = "";
let songData = {};
let songMetaData = {};
let metaDataKeys = ["key","time","tempo","duration","capo","title","t","sorttitle","subtitle","st","artist","composer","lyricist","copyright","album","year"];
let formattingKeys = ["comment","comment_italic","comment_box"];
let environmentKeys = ["start_of_verse","end_of_verse","verse","start_of_bridge","end_of_bridge","bridge","start_of_chorus","end_of_chorus","chorus","transpose","blank_lines"];
/* Used to convert any legal chord name into a generic pitch */
/* chord name -> generic pitch */
let nameToPitchMap = {
	"Cbb":"10","Cb":"11","C":"0", "C#":"1", "Cx":"2",
	"Dbb":"0", "Db":"1", "D":"2", "D#":"3", "Dx":"4",
	"Ebb":"2", "Eb":"3", "E":"4", "E#":"5", "Ex":"6",
	"Fbb":"3", "Fb":"4", "F":"5", "F#":"6", "Fx":"7",
	"Gbb":"5", "Gb":"6", "G":"7", "G#":"8", "Gx":"9",
	"Abb":"7", "Ab":"8", "A":"9", "A#":"10","Ax":"11",
	"Bbb":"9", "Bb":"10","B":"11","B#":"0", "Bx":"1"};
/* Used to convert from scale degree to chord name for a given key signature */
/* key sig -> [scale degree chord name] */
        /* 1    b2   2    b3   3    4    b5   5    b6   6    b7   7 */
        /* 0    1    2    3    4    5    6    7    8    9    10   11 */
let keyToChordNameMap = {
	"C#":["C#","D", "D#","E", "E#","F#","G", "G#","A", "A#","B", "B#"],
	"F#":["F#","G", "G#","A", "A#","B", "C", "C#","D", "D#","E", "E#"],
	"B": ["B", "C", "C#","D", "D#","E", "F", "F#","G", "G#","A", "A#"],
	"E": ["E", "F", "F#","G", "G#","A", "A#","B", "C", "C#","D", "D#"],
	"A": ["A", "A#","B", "C", "C#","D", "D#","E", "F", "F#","G", "G#"],
	"D": ["D", "D#","E", "F", "F#","G", "G#","A", "A#","B", "C", "C#"],
	"G": ["G", "G#","A", "A#","B", "C", "C#","D", "D#","E", "F", "F#"],
	"C": ["C", "Db","D", "Eb","E", "F", "Gb","G", "Ab","A", "Bb","B" ],
	"F": ["F", "Gb","G", "Ab","A", "Bb","B", "C", "Db","D", "Eb","E" ],
	"Bb":["Bb","B", "C", "Db","D", "Eb","E", "F", "Gb","G", "Ab","A" ],
	"Eb":["Eb","E", "F", "Gb","G", "Ab","A", "Bb","B", "C", "Db","D" ],
	"Ab":["Ab","A", "Bb","B", "C", "Db","D", "Eb","E", "F", "Gb","G" ],
	"Db":["Db","D", "Eb","E", "F", "Gb","G", "Ab","A", "Bb","B", "C" ],
	"Gb":["Gb","G", "Ab","A", "Bb","Cb","C", "Db","D", "Eb","E", "F" ],
	"Cb":["Cb","C", "Db","D", "Eb","Fb","F", "Gb","G", "Ab","A", "Bb"]};
let preferredKeys = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
/* Used to convert from generic pitch to scale degree for a given key */
/* generic pitch + offset % 12 = the scale degree */
/* The scale degree can be used to get the nns name from the nnsNames array */
/* The scale degree can be used to get the chord name from the keyToChordNameMap */
let keyToOffsetMap = {
	"C#":11,
	"F#":6 ,
	"B": 1 ,
	"E": 8 ,
	"A": 3 ,
	"D": 10,
	"G": 5 ,
	"C": 0 ,
	"F": 7 ,
	"Bb":2 ,
	"Eb":9 ,
	"Ab":4 ,
	"Db":11,
	"Gb":6 ,
	"Cb":1};
let keyNormalizeMap = {
	"A#m":"C#",
	"D#m":"F#",
	"G#m":"B",
	"C#m":"E",
	"F#m":"A",
	"Bm":"D",
	"Em":"G",
	"Am":"C",
	"Dm":"F",
	"Gm":"Bb",
	"Cm":"Eb",
	"Fm":"Ab",
	"Bbm":"Db",
	"Ebm":"Gb",
	"Abm":"Cb"};
let nnsNames = ["1","b2","2","b3","3","4","b5","5","b6","6","b7","7"];
let maxPageWidth = 816;//1024;
let maxPageHeight = 1056;//1325;
let pdfY = 0;
let currPDFKey = '';
let currPDFLongestLine = 0;
let lastCreatedDoc = null;
let lastDroppedFileName = "New Song.chordpro";
let droppedFileContent = '';

/* Sets up text editor for UI and 'fixes' print anomaly */
$(function() {
	// Size textarea and draw 80 char guide line
	let textEl = document.querySelector('#chartEditorTextArea');
	textEl.setAttribute('cols', 77);// for some reason, this lines up at 80 chars (strangely, I think it's scrollbar width)
	let sepLeft = textEl.offsetWidth;
	let sepEl = document.querySelector('.editor-separator');
	sepEl.style.left = sepLeft + 'px'
	textEl.setAttribute('cols', 90);

	// This is for printing - if not done, something other than songDiv may show up on print...
	let editDiv = $("#editDiv");
	let docsDiv = $("#docsDiv");
	let pdfContainer = $("#pdfContainer");
	editDiv.hide();
	pdfContainer.hide();
	docsDiv.hide();
	editDiv.show();
	pdfContainer.show();
	_drawSong();// no debounce
})

/* Switches display between song display and editor */
function toggleEditor() {
	let editDiv = $("#editDiv");
	let docsDiv = $("#docsDiv");
	let pdfContainer = $("#pdfContainer");
	var currH = editDiv.css("max-height");
	if(currH === '55px') {
		editDiv.css({"max-height": ""});
		$("#chartEditorTextArea").show();
		$(".editDivClose").html("&#x25B2;");
	} else {
		editDiv.css({"max-height": "55px"});
		$("#chartEditorTextArea").hide();
		$(".editDivClose").html("&#x25BC;");
	}
	docsDiv.hide();
	_drawSong();// no debounce
}

/* Inserts the provided string at the cursor and moves cursor to end of inserted string */
function insertText(str) {
	let el = $('#chartEditorTextArea');
	let caretPos = el[0].selectionStart;
	let textAreaTxt = el.val();
	el.val(textAreaTxt.substring(0, caretPos) + str + '\n' + textAreaTxt.substring(caretPos));
	el[0].selectionStart = caretPos + str.length + 1;
	el[0].selectionEnd = caretPos + str.length + 1;
	el.focus();
	updateSaveButton(true);
	isValid(el.val());
}

/* Wraps the currently selected line with the provided string formatted as a beginning and ending tag */
function wrapText(str) {
	let el = $('#chartEditorTextArea');
	let caretStart = el[0].selectionStart;
	let caretEnd = el[0].selectionEnd;
	let textAreaTxt = el.val();
	if(caretStart === caretEnd) {// no selection - wrap entire line
		// Find the start of the current line
		let start = caretStart;
		while (start > 0 && textAreaTxt[start - 1] !== '\n') {
			start--;
		}
		caretStart = start;
		// Find the end of the current line
		let end = caretEnd;
		while (end < textAreaTxt.length && textAreaTxt[end] !== '\n') {
			end++;
		}
		caretEnd = end;
	}
	el.val(
		textAreaTxt.substring(0, caretStart) + '<' + str + '>' +
		textAreaTxt.substring(caretStart, caretEnd) + '</' + str + '>' +
		textAreaTxt.substring(caretEnd));
	el[0].selectionStart = caretStart;
	el[0].selectionEnd = caretStart;
	el.focus();
	updateSaveButton(true);
	isValid(el.val());
}

/* Checks for matching pairs of directives, matching ids for repeats, and required directives */
function isValid(songData) {
	let ret = true;
	let err = $('#errorOutput');
	err.val('');
	let array = songData.split(/\r?\n/);
	// First, make sure the 'wrapping' directives have both start and end
	let next = null;
	let startLine = -1;
	let startDirective = null;
	for(let i = 0; i < array.length; i++) {
		let line = array[i].trim();
		if(next === null) {
			if(line.startsWith('{start_of_verse')) {
				next = '{end_of_verse}';
				startLine = i;
				startDirective = '{start_of_verse}';
			} else if(line.startsWith('{start_of_bridge')) {
				next = '{end_of_bridge}';
				startLine = i;
				startDirective = '{start_of_bridge}';
			} else if(line.startsWith('{start_of_chorus')) {
				next = '{end_of_chorus}';
				startLine = i;
				startDirective = '{start_of_chorus}';
			}
		} else {
			if(line.startsWith('{') && line !== next) {// not what's expected
				if(line.startsWith('{comment')) {// this is ok - comments can go anywhere
					// do nothing
				} else {// missing
					err.val('At line ' + startLine + ':  "' + startDirective + '" has no ' + next + '.');
					ret = false;
					break;
				}
			} else if(line.startsWith('{') && line === next) {
				next = null;
				startLine = -1;
				startDirective = null;
			}
		}
	}
	// check last one
	if(next !== null) {// we're out of lines, so it is missing
		err.val('At line ' + startLine + ':  "' + startDirective + '" has no ' + next + '.');
		ret = false;
	}

	if(ret) {// no errors so far - check that repeats have a matching section name
		let recallMap = {};
		for(let i = 0; i < array.length; i++) {// store all section names for lookup
			let line = array[i].trim();
			if(line.startsWith('{start_of_verse:') || line.startsWith('{start_of_bridge:') || line.startsWith('{start_of_chorus:')) {
				const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
				recallMap[id] = [];// entry in map = key with no value
			}
		}
		for(let i = 0; i < array.length; i++) {// make sure repeats match a stored name
			let line = array[i].trim();
			if(line.startsWith('{verse:') || line.startsWith('{bridge:') || line.startsWith('{chorus:')) {
				const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
				if(!recallMap.hasOwnProperty(id)) {
					err.val('At line ' + i + ':  No matching section header name found.');
					ret = false;
					break;
				}
			}
		}
	}

	if(ret) {// no errors so far - make sure all section IDs are unique
		let recallMap = {};
		for(let i = 0; i < array.length; i++) {// store all section names for lookup
			let line = array[i].trim();
			if(line.startsWith('{start_of_verse:') || line.startsWith('{start_of_bridge:') || line.startsWith('{start_of_chorus:')) {
				const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
				if(recallMap.hasOwnProperty(id)) {// duplicate
					err.val('At line ' + i + ':  Section header name is not unique in this song.');
					ret = false;
					break;
				} else {
					recallMap[id] = [];// entry in map = key with no value
				}
			}
		}
	}

	if(ret) {// no errors so far - check that we have the required title, key, time, tempo elements
		let hasTitle = false;
		let hasKey = false;
		let hasTime = false;
		let hasTempo = false;
		for(let i = 0; i < array.length; i++) {
			let line = array[i].trim();
			if(line.startsWith('{title:') && line.substring(7, line.length - 1).trim().length > 0) {
				hasTitle = true;
			} else if(line.startsWith('{key:') && line.substring(5, line.length - 1).trim().length > 0) {
				hasKey = true;
			} else if(line.startsWith('{time:') && line.substring(6, line.length - 1).trim().length > 0) {
				hasTime = true;
			} else if(line.startsWith('{tempo:') && line.substring(7, line.length - 1).trim().length > 0) {
				hasTempo = true;
			}
		}
		if(!(hasTitle && hasKey && hasTime && hasTempo)) {
			err.val('At line 0:  Required directives missing: ' + (hasTitle ? '' : ' {title:?}') + (hasKey ? '' : ' {key:?}') + (hasTime ? '' : ' {time:?}') + (hasTempo ? '' : ' {tempo:?}'));
			ret = false
		}
	}
	return ret;
}

/* Sets theme, ensures song data is valid, and draws song per preference (compact or not) */
function _drawSong() {
	let _songData = $('#chartEditorTextArea').val();
	if(_songData.trim().length > 0) {// Don't try to draw nothing (infinite loop)
		if(isValid(_songData)) {
			_prepRawData();// Splits raw data in lines (array) and then populates 'songMetaData' (json object) and 'origData' (string)
			songData = parseChordPro_ChordPro();// From origData, creates an object with the song data segregated into sections and modified for Key Selection
			let linesToDisplay = _prepLinesForDisplay();// Turns songData (object of sections) into an ordered and spaced array of lines
			// Cull the unwanted data (chords) for 'No Chords' display
			let chordKeySelect = $('#chordKeySelect');
			if(chordKeySelect.find(":selected").text() === "No Chords") {
				let newLinesToDisplay = [];
				for(let i = 0; i < linesToDisplay.length; i++) {
					let lineType = getLineType(linesToDisplay[i]);// Returns a lines type based on directive or whether it's chords or lyrics
					if(lineType === "chord" || lineType === "lyric") {// line with chords (probably)
						let newLine = linesToDisplay[i].replace(/ {2,}/g, ' ');// replace all instance of 2 or more spaces
						newLine = newLine.trim();
						newLine = newLine.length === 0 ? "   " : newLine;
						let end = newLine.lastIndexOf(']');
						while(end >= 0) {
							let start = newLine.lastIndexOf('[', end);
							newLine = newLine.slice(0, start) + newLine.slice(end + 1);
							end = newLine.lastIndexOf(']', start);
						}
						newLinesToDisplay.push(newLine.trim());
					} else {// everything else
						newLinesToDisplay.push(linesToDisplay[i]);
					}
				}
				linesToDisplay = newLinesToDisplay;
			}
			let recallMap = _populateRecallMap(linesToDisplay);// Save off the named 'sections' of the song (verse, bridge, chorus) so they can be recalled for repeats
			linesToDisplay = explodeRecalls(linesToDisplay, recallMap);
			if($('#compactView').is(':checked')) {
				let doc = createPDF_ChordPro(linesToDisplay, recallMap, chordKeySelect);
				pdfToDivContainer(doc);
			} else {
				let doc = createPDF_ChordsOverLyrics(linesToDisplay, recallMap, chordKeySelect);
				pdfToDivContainer(doc);
			}
		} else {
			drawSongDataInvalidPage();
			$("#currSizeInPts").text('');
			$("#pdfContainer").height(maxPageHeight * 1.1);
		}
	} else {
		drawWelcomeAndInstructionsPage();
		$("#currSizeInPts").text('');
		$("#pdfContainer").height(maxPageHeight * 1.1);
	}
}

/* Notes the change to the songs edited state and requests redraw */
function textAreaInput() {
	updateSaveButton(true);
	drawSong();
}

/* Allows calling 'function' that gets time delayed due to potential for rapid calls */
let drawSong = debounce(_drawSong, 500);

/* Prevents rapid calls from all executing - only call once after time delay */
function debounce(fn, time) {// custom debounce function
	let timer;
	return function() {
		// if more than one call comes in before 'time' (ms) has expired, drop the prior fn call
		clearTimeout(timer);
		// after 'time' (ms), call the debounced fn with the original arguments, save timeout as "timer" so we can cancel it
		timer = setTimeout(() => {
			fn.apply(this, arguments);
		}, time);
	}
}

function updateSaveButton(which) {
	if(which) {// true means song data has changed and we need to save
		// change the look of the Save button
		$("#chartEditorDialogSaveChordPro").text('* Save');
		// Switch out the elements for the Open button
		$("#openFileContainer").html('<button class="editBtn" id="chartEditorDialogFileInput" data-tooltip="Opens a File Selection Dialog with which to choose a file to open" type="button" onclick="confirmOpenFile();">Open</button>');
	} else {// false means song data remains unchanged and we do not need to save
		// change the look of the Save button
		$("#chartEditorDialogSaveChordPro").text('Save');
		// Switch out the elements for the Open button
		$("#openFileContainer").html('<label for="chartEditorDialogFileInput" class="editBtn" data-tooltip="Opens a File Selection Dialog with which to choose a file to open">Open</label><input type="file" id="chartEditorDialogFileInput" onchange="openFile(); this.value=null; return false;">');
	}
}







function drawWelcomeAndInstructionsPage() {
	let doc = getPDFDoc();
	doc.setFillColor(255, 255, 248); // RGB only, alpha handled by GState
	doc.rect(0, 0, 816, 1056, 'F'); // Draw filled rectangle
	let welcome = "Welcome to SongChartMaker";
	setPDFFont(doc, 'sans', 'normal');
	doc.setFontSize(36);
	doc.setTextColor(192,192,192);
	let x = doc.getTextWidth(welcome);
	doc.text(welcome, ((maxPageWidth - x)/2), 46);// str, x, y
	pdfToDivContainer(doc);
}

function drawSongDataInvalidPage() {
	let doc = getPDFDoc();
	doc.setFillColor(255, 255, 248); // RGB only, alpha handled by GState
	doc.rect(0, 0, 816, 1056, 'F'); // Draw filled rectangle
	let invalid = "Song Data is Invalid!!!";
	setPDFFont(doc, 'sans', 'normal');
	doc.setFontSize(36);
	doc.setTextColor(192,192,192);
	let x = doc.getTextWidth(invalid);
	doc.text(invalid, ((maxPageWidth - x)/2), 46);// str, x, y
	pdfToDivContainer(doc);
}

/* Splits raw data in lines (array) and then populates 'songMetaData' (json object) and 'oriData' (string) */
function _prepRawData() {
	let rawData = $("#chartEditorTextArea").val();
	if(rawData.trim().length === 0) {
		return;
	}
	let array = rawData.split(/\r?\n/);
	parseRawSongData(array);// Populates 'songMetaData' (json object) and 'origData' (string)
}

/* Turns songData (object of sections) into and ordered and spaced array of lines */
function _prepLinesForDisplay() {
	let linesToDisplay = [];
	let len = Object.keys(songData).length;
	for(let i = 1; i <= len; i++) {// Objects start at 1
		let tmpArr = songData[i];// this is a section of a song
		for(let x = 0; x < tmpArr.length; x++) {
			if(tmpArr[x].trim().length === 0) {
				continue;// don't include empty lines
			}
			linesToDisplay.push(tmpArr[x]);
		}
		linesToDisplay.push(" ");// put a blank line after every section
	}
	return linesToDisplay;
}

/* Save off the named 'sections' of the song (verse, bridge, chorus) so they can be recalled for repeats */
function _populateRecallMap(linesToDisplay) {
	let currName = "";
	let inSection = false;
	let recallMap = {};
	for(let i = 0; i < linesToDisplay.length; i++) {
		let currLine = linesToDisplay[i];
		if(inSection && ((currLine.startsWith("{end_of_verse"))
				|| (currLine.startsWith("{end_of_bridge"))
				|| (currLine.startsWith("{end_of_chorus")))) {
			inSection = false;
		}

		if(inSection) {
			recallMap[currName].push(currLine);
		}

		if((currLine.startsWith("{start_of_verse:"))
				|| currLine.startsWith("{start_of_bridge:")
				|| currLine.startsWith("{start_of_chorus:")) {
			const [type, id, ...comments] = currLine.substring(1, currLine.length - 1).split(':');
			currName = id;
			recallMap[currName] = [];
			inSection = true;
		}
	}
	return recallMap;
}

/* Convenience method to see if an object has a key pointing to actual data */
function hasDataForKey(object, key) {
	let val = object[key];
	return val !== undefined && val !== null && val.length > 0;
}









/* If minor key, returns equivalent major */
function getNormalizedKey() {
	let key = songMetaData["key"];
	if(hasDataForKey(songMetaData, "key")) {
		if(key.endsWith("m")) {
			key = keyNormalizeMap[key];
		}
	}
	return key;
}

/* Returns the new key for a current changed by a number of half steps up (positive number) or down (negative number) */
function transposeKey(fromKey, amount) {
	let _fromKey = fromKey === "F#" ? "Gb" : fromKey === "C#" ? "Db" : fromKey;
	let idx = preferredKeys.indexOf(_fromKey);
	idx += amount;
	idx = idx < 0 ? idx + 12 : idx > 11 ? idx - 12 : idx;
	return preferredKeys[idx];
}











/* Transposes every chord in a line to a new key - 'compact' view */
function transposeLine_ChordPro(line, targetKey, transAmount) {
	if(transAmount !== 0) {
		let _targetKey = transposeKey(targetKey, transAmount);// Returns the new key for a current changed by a number of half steps up (positive number) or down (negative number)
		let start = line.indexOf('[');
		while(start >= 0) {
			let end = line.indexOf(']', start);
			start++;
			let chord = _transposeChord(line, start, end, targetKey, _targetKey);// Transposes a chord (string) within a line to a new key
			line = line.substring(0, start) + chord + line.substring(end);
			start = line.indexOf('[', start);
		}
	}
	return line;
}

/* Transposes a chord (string) within a line to a new key */
function _transposeChord(line, start, end, currKey, _targetKey) {
	let chord = line.substring(start, end);
	let note = chord.substring(0, 1);
	if(chord.charAt(1) === '#' || chord.charAt(1) === 'b' || chord.charAt(1) === 'x') {
		note = chord.substring(0, 2);
		if(chord.charAt(2) === 'b') {
			note = chord.substring(0, 3);
		}
	}
	if(nameToPitchMap.hasOwnProperty(note)) {
		let genericPitch = nameToPitchMap[note];
		let offset = keyToOffsetMap[currKey];
		let scaleDegree = (parseInt(genericPitch) + parseInt(offset)) % 12;
		let newNote = keyToChordNameMap[_targetKey][scaleDegree];
		chord = newNote + chord.slice(note.length);
		let start2 = chord.lastIndexOf("/");
		if(start2 >= 0) {
			note = chord.slice(start2 + 1);
			genericPitch = nameToPitchMap[note];
			offset = keyToOffsetMap[currKey];
			scaleDegree = (parseInt(genericPitch) + parseInt(offset)) % 12;
			let newNote = keyToChordNameMap[_targetKey][scaleDegree];
			chord = chord.substring(0, start2 + 1) + newNote;
		}
	} else {
		// do nothing
	}
	return chord;
}











/* Populates 'songMetaData' (json object) and 'origData' (string)) */
function parseRawSongData(strArr) {
	songMetaData = {};
	let songMetaDataStr = '';// json format
	origData = "";
	let lastLineWasEmpty = false;
	let songKey = "";
	for(let i = 0; i < strArr.length; i++) {// strArr is raw data split into lines
		let line = strArr[i].trim();
		if(line.startsWith("#")) {// ignore chordpro comment lines
			continue;
		}
		if(line.startsWith("{")) {// a directive
			let key = "";
			let value = "";
			let pos = line.indexOf(":");
			if(pos >= 0) {// a directive with a value
				key = line.substring(1, pos);// ignore '{'
				value = line.substring(pos + 1, line.length - 1);// ignore '}'
			} else {// a simple directive
				key = line.substring(1, line.length - 1);// ignore '{' and '}'
			}
			if(metaDataKeys.includes(key)) {// recognized metadata
				if(key === "duration" && value.indexOf(':') >= 0) {// convert to mm:ss to seconds
					let pos = value.indexOf(':');
					let minutes = parseInt(value.substring(0, pos));
					let seconds = parseInt(value.substring(pos + 1));
					songMetaDataStr += '"' + key + '":"' + ((minutes * 60) + seconds) + '",';
				} else if(key === "key") {
					if(songKey.length === 0) {
						songKey = value;
						songMetaDataStr += '"' + key + '":"' + value + '",';
					} else {
						if(songKey.endsWith("m")) {
							songKey = keyNormalizeMap[key];// e.g. Em to G
						}
						let songKeyIdx = nameToPitchMap[songKey];
						let newKeyIdx = nameToPitchMap[value];
						if(songKeyIdx !== newKeyIdx) {
							let diff = newKeyIdx - songKeyIdx;
							origData += "{transpose:" + (diff > 0 ? "+" : "") + diff + "}\n";
						}
					}
				} else {
					songMetaDataStr += '"' + key + '":"' + value + '",';
				}
			} else if(formattingKeys.includes(key)) {
				origData += line + "\n";
				lastLineWasEmpty = false;
			} else if(environmentKeys.includes(key)) {
				origData += line + "\n";
				lastLineWasEmpty = false;
			} else {
				console.log("Unknown Directive in raw data: " + line);
			}
		} else {
			if(line.trim().length === 0) {
				if(origData.length === 0) {
					// don't keep empty lines at the beginning
				} else if(lastLineWasEmpty) {
					// don't keep more than one empty line
				} else {
					origData += line + "\n";
					lastLineWasEmpty = true;
				}
			} else {
				origData += line + "\n";
				lastLineWasEmpty = false;
			}
		}
	}
	if(songMetaDataStr.length > 0) {
		songMetaData = JSON.parse("{" + songMetaDataStr.substring(0, songMetaDataStr.length - 1) + "}");// remove final comma
	}
}

/* Creates an object with the song data segregated into sections and modified for Key Selection */
function parseChordPro_ChordPro() {
	let doc = {};// this will be assigned as the songData object
	let docIdx = 1;
	let parsedData = [];
	let transpose = 0;
	let modified = modifyChordsForTranspose();// Modifies 'origData' chords per Key Selection (key, Original, NNS, No Chords)
	let lines = modified.split("\n");
	for(let x = 0; x < lines.length; x++) {
		let str = lines[x];
		if(str.length === 0) {
			if(parsedData.length > 0) {
				doc["" + docIdx++] = parsedData;
				parsedData = [];
			}
			continue;
		}
		if(str.startsWith("{")) {
			parsedData.push(str);
			if(str.startsWith("{transpose:")) {
				transpose = parseInt(str.substring(11, str.length - 1).trim());
			}
			continue;
		}
		// If we've made it here, line must be chords and/or lyrics
		parsedData.push(str);
	}
	if(parsedData.length > 0) {
		doc["" + docIdx++] = parsedData;
	}
	return doc;
}

/* Modifies 'origData' chords per Key Selection (key, Original, NNS, No Chords) */
function modifyChordsForTranspose() {
	let chordKeySelect = $('#chordKeySelect');
	if(chordKeySelect.find(":selected").text() === "NNS") {
		let copy = origData.slice(0);
		let start = copy.indexOf("[");
		while(start >= 0) {
			let end = copy.indexOf("]", start + 1);
			let chord = copy.substring(start + 1, end);
			let durationText = '';
			let atPos = chord.indexOf('@');
			if(atPos >= 0) {
				durationText = chord.substring(atPos);
				chord = chord.substring(0, atPos);
			}
			let note = chord.substring(0, 1);
			if(chord.charAt(1) === '#' || chord.charAt(1) === 'b' || chord.charAt(1) === 'x') {
				note = chord.substring(0, 2);
				if(chord.charAt(2) === 'b') {
					note = chord.substring(0, 3);
				}
			}
			if(nameToPitchMap.hasOwnProperty(note)) {
				let genericPitch = nameToPitchMap[note];
				let offset = keyToOffsetMap[getNormalizedKey()];
				let scaleDegree = (parseInt(genericPitch) + parseInt(offset)) % 12;
				let newNote = nnsNames[scaleDegree];
				chord = newNote + chord.slice(note.length);
				let start2 = chord.lastIndexOf("/");
				if(start2 >= 0) {
					note = chord.slice(start2 + 1);
					genericPitch = nameToPitchMap[note];
					offset = keyToOffsetMap[getNormalizedKey()];
					scaleDegree = (parseInt(genericPitch) + parseInt(offset)) % 12;
					newNote = nnsNames[scaleDegree];
					chord = chord.substring(0, start2 + 1) + newNote;
				}
				copy = copy.substring(0, start + 1) + chord + durationText + copy.substring(end);
				start = copy.indexOf("[", start + 1);
			} else {
				// do nothing except look for next
				start = copy.indexOf("[", start + 1);
			}
		}
		return copy;
	} else {
		let targetKey = chordKeySelect.find(":selected").text();
		if(targetKey.endsWith(")")) {// remove the minor key from the display value
			targetKey = targetKey.substring(0, targetKey.indexOf("(")).trim();
		}
		if(targetKey === "Original" || targetKey === "No Chords") {
			targetKey = getNormalizedKey();// if minor key, use equivalent major
		}
		let copy = origData.slice(0);
		let start = copy.indexOf("[");
		while(start >= 0) {
			let end = copy.indexOf("]", start + 1);
			let chord = copy.substring(start + 1, end);
			let durationText = '';
			let atPos = chord.indexOf('@');
			if(atPos >= 0) {
				durationText = chord.substring(atPos);
				chord = chord.substring(0, atPos);
			}
			let note = chord.substring(0, 1);
			if(chord.charAt(1) === '#' || chord.charAt(1) === 'b' || chord.charAt(1) === 'x') {
				note = chord.substring(0, 2);
				if(chord.charAt(2) === 'b') {
					note = chord.substring(0, 3);
				}
			}
			if(nameToPitchMap.hasOwnProperty(note)) {
				let genericPitch = nameToPitchMap[note];
				let offset = keyToOffsetMap[getNormalizedKey()];
				let scaleDegree = (parseInt(genericPitch) + parseInt(offset)) % 12;
				let newNote = keyToChordNameMap[targetKey][scaleDegree];
				chord = newNote + chord.slice(note.length);
				let start2 = chord.lastIndexOf("/");
				if(start2 >= 0) {
					note = chord.slice(start2 + 1);
					genericPitch = nameToPitchMap[note];
					offset = keyToOffsetMap[getNormalizedKey()];
					scaleDegree = (parseInt(genericPitch) + parseInt(offset)) % 12;
					let newNote = keyToChordNameMap[targetKey][scaleDegree];
					chord = chord.substring(0, start2 + 1) + newNote;
				}
				copy = copy.substring(0, start + 1) + chord + durationText + copy.substring(end);
				start = copy.indexOf("[", start + 1);
			} else {// not a chord, just let it remain what it is
				// do nothing except look for next
				start = copy.indexOf("[", start + 1);
			}
		}
		return copy;
	}
}

/* Returns a lines type based on directive or whether it's chords or lyrics */
function getLineType(line) {
	// comment, italic, box, verse, bridge, chorus, empty, blank, transpose, chord, lyric
	if(line.startsWith("{comment:")) {
		return "comment";
	} else if(line.startsWith("{comment_italic:")) {
		return "italic";
	} else if(line.startsWith("{comment_box:")) {
		return "box";
	} else if(line.startsWith("{start_of_verse:")) {
		return "verse";
	} else if(line.startsWith("{end_of_verse}")) {
		return "empty";
	} else if(line.startsWith("{start_of_bridge:")) {
		return "bridge";
	} else if(line.startsWith("{end_of_bridge}")) {
		return "empty";
	} else if(line.startsWith("{start_of_chorus:")) {
		return "chorus";
	} else if(line.startsWith("{end_of_chorus}")) {
		return "empty";
	} else if(line.startsWith("{verse:")) {
		return "verse";
	} else if(line.startsWith("{bridge:")) {
		return "bridge";
	} else if(line.startsWith("{chorus:")) {
		return "chorus";
	} else if(line.startsWith("{transpose:")) {
		return "transpose";
	} else if(line.startsWith("{blank_lines:")) {
		return "blank";
	//} else if(isChordLine(line)) {// Determines if a line contains only chords based on a limited character set
	} else if(line.startsWith('\u001F')) {
		return "chord";
	} else {
		return "lyric";
	}
}

/* Initiates redraw when a user changes the desired display key */
function chordKeyChange() {
	drawSong();
}

/* Initiates redraw when a user changes the compact view state */
function showCompactView() {
	drawSong();
}











/* Prevent default behavior (i.e. prevent file from being opened) */
function dragOverHandler(ev) {
	ev.preventDefault();
}

/* Attempts to read the dropped file's contents (if it's a file) */
function dropHandler(ev) {
	// Prevent default behavior (i.e. the file from being opened)
	ev.preventDefault();
	handleDrop(ev);// droppedFileContent has file.name + '|' + file.content
}

function finishDrop() {
	closeConfirmDialog();
	updateSaveButton(false);
	let pos = droppedFileContent.indexOf('|');
	lastDroppedFileName = droppedFileContent.substring(0, pos);
	$("#chartEditorTextArea").val(droppedFileContent.substring(pos + 1));
	drawSong();
}

function handleDrop(ev) {
	if (ev.dataTransfer.items) {
		[...ev.dataTransfer.items].forEach((item, i) => {
			// If dropped items aren't files, reject them
			if (item.kind === "file") {
				const file = item.getAsFile();
				readDropFile(file);// Stores the contents of a dropped file in droppedFileContent
			}
		});
	} else {
		// Use DataTransfer interface to access the file(s)
		[...ev.dataTransfer.files].forEach((file, i) => {
			readDropFile(file);// Stores the contents of a dropped file in droppedFileContent
		});
	}
}

/* Reads the contents of a dropped file and puts it into the Chart Editor textarea */
function readDropFile(file) {
	// Read the file
	const reader = new FileReader();
	reader.onload = () => {
		droppedFileContent = file.name + '|' + reader.result;
		if($("#chartEditorDialogSaveChordPro").text() === 'Save') {
			finishDrop();
		} else {
			$("#confirmDialogHeaderTitle").text('Confirm Open File');
			$("#confirmDialogBody").html("<h3>*** Your current song has changes that have not been saved!</h3><ul><li><div>Click 'OK' to ignore and open file anyway.</div></li><li><div>Click 'Cancel' to abort open file.</div></li></ul>");
			$("#confirmDialogFooter").html('<table class="confirmDialogTable"><tr><td><button class="editBtn" id="chartEditorDialogFileDrop" onclick="finishDrop();">OK</button></td><td><button class="editBtn" type="button" onclick="closeConfirmDialog();">Cancel</button></td></tr></table>');
			document.getElementById("confirmDialog").style.display = "block";
		}
	};
	reader.onerror = () => {
		console.log("Error reading the file. Please try again.");
	};
	reader.readAsText(file);
}

/* Determines an appropriate name and triggers download of current song as a .chordpro file */
function saveChordPro() {
	if(hasDataForKey(songMetaData, "title")) {
		createAndDownloadTextFile(songMetaData["title"] + '.chordpro', $("#chartEditorTextArea").val());// Creates a temporary text file (blob) and triggers a browser download
	} else {
		createAndDownloadTextFile(lastDroppedFileName, $("#chartEditorTextArea").val());// Creates a temporary text file (blob) and triggers a browser download
	}
	updateSaveButton(false);
}

/* Removes all chords and comments, determines an appropriate name, and triggers download of current song as a .lyrics file */
function dumpLyrics() {
	let str = "";
	let lines = $("#chartEditorTextArea").val().split('\n');
	for(let i = 0; i < lines.length; i++) {
		let line = lines[i].trim();
		if(line.startsWith("{title:")) {// treat title specially
			str += line.substring(line.indexOf(':') + 1, line.length - 1) + '\n';
			str += '==================================================\n';
		} else if(line.startsWith("{start_of_verse:") || // treat section headers specially
				line.startsWith("{start_of_bridge:") ||
				line.startsWith("{start_of_chorus:") ||
				line.startsWith("{verse:") ||
				line.startsWith("{bridge:") ||
				line.startsWith("{chorus:")) {
			const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
			str += '\n';
			str += id + '\n';
			str += '-------------------------\n';
		} else if(line.startsWith('{')) {// ignore all other directives
			continue;
		} else if(line.length > 0) {// clean up any remaining text
			line = line.replace(/\[.*?\]/g, '');
			line = line.replace(/\./g, '');
			line = line.replace(/\|/g, '');
			line = line.trim();
			if(line.length > 0) {
				str += line + '\n';
			}
		}
	}
	let newName = lastDroppedFileName.replace('.chordpro', '.lyrics');
	if(hasDataForKey(songMetaData, "title")) {
		newName = songMetaData["title"] + '.lyrics';
	}
	createAndDownloadTextFile(newName, str);
}

/* Creates a temporary text file (blob) and triggers a browser download */
function createAndDownloadTextFile(filename, content) {
	const blob = new Blob([content], { type: 'text/plain' });// Create a Blob with the content
	const link = document.createElement('a');// Create a link element
	link.href = URL.createObjectURL(blob);// Create a URL for the Blob and set it as the href attribute
	link.download = filename;// Set the download attribute with the desired filename
	document.body.appendChild(link);// Append link to the body (not required, but safer)
	link.click();// Trigger the click event to start the download
	// Clean up - remove the link and revoke the object URL
	document.body.removeChild(link);
	URL.revokeObjectURL(link.href);
}

function newSong() {
	if($("#chartEditorDialogSaveChordPro").text() === 'Save') {
		createNewSong();
	} else {
		$("#confirmDialogHeaderTitle").text('Confirm Create New Song');
		$("#confirmDialogBody").html("<h3>*** Your current song has changes that have not been saved!</h3><ul><li><div>Click 'OK' to ignore and create a new file anyway.</div></li><li><div>Click 'Cancel' to abort the create.</div></li></ul>");
		$("#confirmDialogFooter").html('<table class="confirmDialogTable"><tr><td><button class="editBtn" id="chartEditorDialogCreateNew" onclick="createNewSong();">OK</button></td><td><button class="editBtn" type="button" onclick="closeConfirmDialog();">Cancel</button></td></tr></table>');
		document.getElementById("confirmDialog").style.display = "block";
	}
}

function createNewSong() {
	let str =
		"{title:New Song}\n" +
		"{key:C}\n" +
		"{time:4/4}\n" +
		"{tempo:80}\n" +
		"\n\n\n" +
		"{capo:2}\n" +
		"\n\n\n" +
		"{start_of_verse:Intro:Piano + AG only - Mellow}\n" +
		"| [C]. . . . | [F]. . . . | [G]. . . . | [C]. . . . |\n" +
		"{end_of_verse}\n" +
		"\n\n\n" +
		"{start_of_verse:Verse 1:Switch to a more playful feel}\n" +
		"[C]Roses are red, [F]violets are blue\n" +
		"[G]I'm schizophrenic and [C]so am I\n" +
		"{end_of_verse}\n" +
		"\n\n\n" +
		"{start_of_chorus:Chorus 1:Switch to an almost military feel}\n" +
		"[C]Comet will make your teeth turn green. [F]Comet, it tastes like Listerine.\n" +
		"[G]Comet will make you vomit. [C]So, get some comet and vomit, today!\n" +
		"{end_of_chorus}\n" +
		"\n\n\n" +
		"{start_of_verse:Verse 2:Switch to a more playful feel}\n" +
		"[C]Roses are red, [F]that much is true\n" +
		"but [G]violets are purple, [C]not bloody blue\n" +
		"{end_of_verse}\n" +
		"\n\n\n" +
		"{comment:This is a regular comment.}\n" +
		"{chorus:Chorus 1}\n" +
		"\n\n\n" +
		"{comment_italic:This is an italic comment.}\n" +
		"{chorus:Chorus 1}\n" +
		"\n\n\n" +
		"{start_of_bridge:Bridge 1:Switch to a more playful feel}\n" +
		"[C]London bridge is falling down, [F]falling down, falling down.\n" +
		"[G]London bridge is falling down, [C]my fair lady.\n" +
		"{end_of_bridge}\n" +
		"\n\n\n" +
		"{transpose:+2}\n" +
		"\n\n\n" +
		"{comment_box:This is a boxed comment.}\n" +
		"{chorus:Chorus 1}\n" +
		"\n\n\n" +
		"{start_of_verse:Outro}\n" +
		"| [C]. . . . | [F]. . . . | [G]. . . . | [C]. . . . |\n" +
		"{end_of_verse}\n";
	$('#chartEditorTextArea').val(str);
	updateSaveButton(false);
	closeConfirmDialog();
	_drawSong();
}

function caretToError() {
	let str = $('#errorOutput').val();
	if(str.length > 0) {
		let lineNum = str.substring(7, str.indexOf(':')).trim();
		let line = parseInt(lineNum);
		let el = $('#chartEditorTextArea');
		let textAreaTxt = el.val();
		let pos = 0;
		let array = textAreaTxt.split(/\r?\n/);
		for(let i = 0; i < line; i++) {
			pos += array[i].length + 1;// don't forget the new line char
		}
		el[0].selectionStart = pos;
		el[0].selectionEnd = pos;
		el.focus();
	}
}


















function confirmOpenFile() {
	$("#confirmDialogHeaderTitle").text('Confirm Open File');
	$("#confirmDialogBody").html("<h3>*** Your current song has changes that have not been saved!</h3><ul><li><div>Click 'OK' to ignore and open file anyway.</div></li><li><div>Click 'Cancel' to abort open file.</div></li></ul>");
	$("#confirmDialogFooter").html('<table class="confirmDialogTable"><tr><td><label for="chartEditorDialogFileOpen" class="editBtn">OK</label><input type="file" id="chartEditorDialogFileOpen" onchange="openFile(); this.value=null; return false;"></td><td><button class="editBtn" type="button" onclick="closeConfirmDialog();">Cancel</button></td></tr></table>');
	document.getElementById("confirmDialog").style.display = "block";
}

function openFile() {
	let fileInput = document.getElementById('chartEditorDialogFileInput');
	if(fileInput.files === undefined) {
		fileInput = document.getElementById('chartEditorDialogFileOpen');
		closeConfirmDialog();
	}
	let textArea = $("#chartEditorTextArea");
	const file = fileInput.files[0]; // Get the selected file
	if(file) {
		const reader = new FileReader();
		reader.onload = function(event) {
			textArea.val(event.target.result);
		};
		reader.onerror = function() {
			textArea.val("Error reading file");
		};
		reader.readAsText(file); // Read file as text
	}
	updateSaveButton(false);
}

function closeConfirmDialog() {
	document.getElementById("confirmDialog").style.display = "none";
}

window.onclick = function(event) {
	let confirmDialog = document.getElementById("confirmDialog");
	if(event.target === confirmDialog) {
		confirmDialog.style.display = "none";
	}
}










function displayDocs() {
	let editDiv = $("#editDiv");
	let pdfContainer = $("#pdfContainer");
	let docsDiv = $("#docsDiv");
	editDiv.hide();
	pdfContainer.hide();
	docsDiv.show();
}

function hideDocs() {
	let editDiv = $("#editDiv");
	let pdfContainer = $("#pdfContainer");
	let docsDiv = $("#docsDiv");
	docsDiv.hide();
	editDiv.show();
	pdfContainer.show();
}

/* This is done in one place so all following code can remain unaware of this feature */
function explodeRecalls(linesToDisplay, recallMap) {
	let newLinesToDisplay = [];
	for(let i = 0; i < linesToDisplay.length; i++) {
		let line = linesToDisplay[i];
		if(line.startsWith('{verse:')) {
			const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
			let sectionStart = '{start_of_verse:' + id;
			for(let z = 0; z < comments.length; z++) {
				sectionStart += ':' + comments[z];
			}
			sectionStart += '}';
			newLinesToDisplay.push(sectionStart);
			let recall = recallMap[id];
			for(let z = 0; z < recall.length; z++) {
				newLinesToDisplay.push(recall[z]);
			}
			newLinesToDisplay.push('{end_of_verse}');
		} else if(line.startsWith('{bridge:')) {
			const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
			let sectionStart = '{start_of_bridge:' + id;
			for(let z = 0; z < comments.length; z++) {
				sectionStart += ':' + comments[z];
			}
			sectionStart += '}';
			newLinesToDisplay.push(sectionStart);
			let recall = recallMap[id];
			for(let z = 0; z < recall.length; z++) {
				newLinesToDisplay.push(recall[z]);
			}
			newLinesToDisplay.push('{end_of_bridge}');
		} else if(line.startsWith('{chorus:')) {
			const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');
			let sectionStart = '{start_of_chorus:' + id;
			for(let z = 0; z < comments.length; z++) {
				sectionStart += ':' + comments[z];
			}
			sectionStart += '}';
			newLinesToDisplay.push(sectionStart);
			let recall = recallMap[id];
			for(let z = 0; z < recall.length; z++) {
				newLinesToDisplay.push(recall[z]);
			}
			newLinesToDisplay.push('{end_of_chorus}');
		} else {// push through all other lines
			newLinesToDisplay.push(line);
		}
	}
	return newLinesToDisplay;
}

function countCharInStr(c, str) {
	let result = 0;
	for(let i = 0; i < str.length; i++) {
		if(str[i] === c) {
			result++;
		}
	}
	return result;
}

function isLineChordsOnly(_str) {
	let result = true;
	let str = _str.replace(/\s/g, '');// remove: space, \t, \n, \r, vertical tab, form feed

	let inChord = false;
	for(let i = 0; i < str.length; i++) {
		if(inChord && str[i] === ']') {
			inChord = false;
			continue;
		} else if(inChord) {
			continue;
		} else if(!inChord && str[i] === '[') {
			inChord = true;
			continue;
		} else if(!inChord) {
			result = false;
			break;
		}
	}

	return result;
}

/* Section repeats have been removed (i.e. exploded) */
function countLinesForNextSection(linesToDisplay, start) {
	// Total lines = Section header + section comments + chord/lyric lines
	let totalLines = 0;
	let z = start;
	while(linesToDisplay[z].trim().length > 0) {
		let line = linesToDisplay[z];
		if(line.startsWith('{start_of_')) {// new section header and comments
			let count = countCharInStr(':', line);
			totalLines += count === 1 ? 1 : (count - 1);
		} else if(line.startsWith('{comment')) {// a comment
			totalLines += 1;
		} else if(line.startsWith('{transpose:')) {// a transpose directive (and indicator)
			totalLines += 1;
		} else if(line.startsWith('{end_of_')) {// end of a section
			// do nothing - These lines will not be displayed and should not be counted in the total
		} else {// must be chords and lyrics
			if(line.indexOf('[') < 0) {// lyrics only?
				totalLines += 1;
			} else if(isLineChordsOnly(line)) {// chords only?
				totalLines += 1;
			} else {
				totalLines += 2;
			}
		}
		z++;
	}
	return totalLines;
}











/*
 PDF stuff
 */
/*
 face = mono|sans|serif   -or-   courier|helvetica|times
 style = normal|bold|italic|bolditalic
*/
function setPDFFont(doc, face, style) {
	if(face === 'mono') {// courier
		doc.setFont('courier', style);
	} else if(face === 'sans') {// helvetica
		doc.setFont('helvetica', style);
	} else if(face === 'serif') {// times
		doc.setFont('times', style);
	} else {
		doc.setFont(face, style);
	}
}

function ptsToPxs(pts) {
	return pts * 0.75;
}

function pxsToPts(pxs) {
	return pxs / 0.75;
}

function getPDFDoc() {
	let jsPDF = window.jspdf.jsPDF;
	const doc = new jsPDF({
		orientation: "portrait",
		unit: "px",
		format: [816, 1056],
		hotfixes: ["px_scaling"],
		putOnlyUsedFonts: true,
		compress: true
	});
	return doc;
}

function pdfToDivContainer(doc) {
	const pdfDataUri = doc.output('datauristring'); // Get the PDF as a data URI
	const iframe = document.createElement('iframe');
	iframe.src = pdfDataUri;
	iframe.style.width = '100%';
	iframe.style.height = '100%';
	iframe.style.border = 'none';
	const container = document.getElementById('pdfContainer');
	container.innerHTML = ''; // Clear previous content
	container.appendChild(iframe);
}

function drawPageBackground(doc) {
	setPDFColor(doc, 'pageBG');
	doc.rect(0, 0, 816, 1056, 'F');
}

function setPDFColor(doc, which) {
	if($('#darkTheme').is(':checked')) {
		switch(which) {
			case 'pageBG':
				doc.setFillColor(0,0,0);
				break;
			case 'titleBG':
				doc.setFillColor(63,42,20);
				break;
			case 'title':
				doc.setTextColor(255,255,0);
				break;
			case 'capoBG':
				doc.setFillColor(224,168,0);
				break;
			case 'capo':
				doc.setTextColor(48,48,48);
				break;
			case 'capoBox':
				doc.setFillColor(64,64,64);
				break;
			case 'sectionBG':
				doc.setFillColor(80,80,80);
				break;
			case 'section':
				doc.setTextColor(228,228,228);
				break;
			case 'commentBGSpecial':
				doc.setFillColor(255,165,0);
				break;
			case 'commentBG':
				doc.setFillColor(104,48,48);
				break;
			case 'comment':
				doc.setTextColor(228,228,228);
				break;
			case 'commentBox':
				doc.setFillColor(128,128,128);
				break;
			case 'transposeBG':
				doc.setFillColor(48,48,48);
				break;
			case 'transpose':
				doc.setTextColor(228,228,228);
				break;
			case 'transposeBox':
				doc.setFillColor(139,0,0);
				break;
			case 'lyric':
				doc.setTextColor(228,228,0);
				break;
			case 'chord':
				doc.setTextColor(0,205,205);
				break;
			case 'chordType':
				doc.setTextColor(255,140,0);
				break;
			case 'chordDuration':
				doc.setTextColor(50,255,255);
				doc.setDrawColor(50,255,255);
				doc.setFillColor(50,255,255);
				break;
			case '<x>':
				doc.setFillColor(255,235,100);
				break;
			case '<a>':
				doc.setFillColor(255,169,100);
				break;
			case '<b>':
				doc.setFillColor(165,190,255);
				break;
			case '<u>':
				doc.setFillColor(255,183,255);
				break;
			case '<h>':
				doc.setFillColor(255,120,120);
				break;
			case '<l>':
				doc.setFillColor(100,255,165);
				break;
		}
	} else {
		switch(which) {
			case 'pageBG':
				doc.setFillColor(255,255,248);
				break;
			case 'titleBG':
				doc.setFillColor(139,69,19);
				break;
			case 'title':
				doc.setTextColor(0,0,0);
				break;
			case 'capoBG':
				doc.setFillColor(255,69,0);
				break;
			case 'capo':
				doc.setTextColor(0,0,0);
				break;
			case 'capoBox':
				doc.setFillColor(64,64,64);
				break;
			case 'sectionBG':
				doc.setFillColor(200,200,200);
				break;
			case 'section':
				doc.setTextColor(0,0,0);
				break;
			case 'commentBGSpecial':
				doc.setFillColor(255,165,0);
				break;
			case 'commentBG':
				doc.setFillColor(184,128,128);
				break;
			case 'comment':
				doc.setTextColor(0,0,0);
				break;
			case 'commentBox':
				doc.setFillColor(64,64,64);
				break;
			case 'transposeBG':
				doc.setFillColor(128,128,128);
				break;
			case 'transpose':
				doc.setTextColor(0,0,0);
				break;
			case 'transposeBox':
				doc.setFillColor(184,0,0);
				break;
			case 'lyric':
				doc.setTextColor(0,0,0);
				break;
			case 'chord':
				doc.setTextColor(0,0,0);
				break;
			case 'chordType':
				doc.setTextColor(0,0,0);
				break;
			case 'chordDuration':
				doc.setTextColor(80,80,80);
				doc.setDrawColor(80,80,80);
				doc.setFillColor(80,80,80);
				break;
			case '<x>':
				doc.setFillColor(255,235,100);
				break;
			case '<a>':
				doc.setFillColor(255,169,100);
				break;
			case '<b>':
				doc.setFillColor(165,190,255);
				break;
			case '<u>':
				doc.setFillColor(255,183,255);
				break;
			case '<h>':
				doc.setFillColor(255,120,120);
				break;
			case '<l>':
				doc.setFillColor(100,255,165);
				break;
		}
	}
}

function drawTitle(doc, title, y, lineHeight) {
	// Draw the text
	setPDFColor(doc, 'title');
	let x = doc.getTextWidth(title);
	currPDFLongestLine = Math.max(currPDFLongestLine, x);
	doc.text(title, ((maxPageWidth - x)/2), y);
}

function drawKeyTimeTempo(doc, key, time, tempo, y, lineHeight, finalFont) {
	// Draw the text
	setPDFColor(doc, 'title');
	let small = finalFont * 0.70;
	let big = finalFont;
	// Determine overall width
	doc.setFontSize(small);
	let w1 = doc.getTextWidth("Key:");
	let w2 = doc.getTextWidth("Time Signature:");
	let w3 = doc.getTextWidth("Tempo (BPM):");
	doc.setFontSize(big);
	let w4 = doc.getTextWidth("  " + key + "     ");
	let w5 = doc.getTextWidth("  " + time + "     ");
	let w6 = doc.getTextWidth("  " + tempo);
	currPDFLongestLine = Math.max(currPDFLongestLine, (w1 + w2 + w3 + w4 + w5 + w6));

	let x = ((maxPageWidth - (w1 + w2 + w3 + w4 + w5 + w6))/2);
	doc.setFontSize(small);
	doc.text("Key:", x, y);
	x += w1;
	doc.setFontSize(big);
	doc.text("  " + key + "     ", x, y);
	x += w4;
	doc.setFontSize(small);
	doc.text("Time Signature:", x, y);
	x += w2;
	doc.setFontSize(big);
	doc.text("  " + time + "     ", x, y);
	x += w5;
	doc.setFontSize(small);
	doc.text("Tempo (BPM):", x, y);
	x += w3;
	doc.setFontSize(big);
	doc.text("  " + tempo, x, y);
}

function drawCapo(doc, capo, lineHeight, finalFont) {
	// Get the width in the appropriate font
	let small = finalFont * 0.70;
	doc.setFontSize(small);
	let capoText = ' Capo ' + capo + ' ';
	let w = doc.getTextWidth(capoText);
	currPDFLongestLine = Math.max(currPDFLongestLine, w);

	// Draw the background
	setPDFColor(doc, 'capoBG');
	pdfY += lineHeight;
	doc.rect(3, pdfY - lineHeight, w, lineHeight, 'F'); // Draw filled rectangle

	// Draw the box
	setPDFColor(doc, 'capoBox');
	doc.setFillColor(64,64,64);
	doc.rect(3, (pdfY - lineHeight) - 3, w, 3, 'F'); // top
	doc.rect(3, pdfY, w, 3, 'F'); // bottom
	doc.rect(0, (pdfY - lineHeight) - 3, 3, lineHeight + 6, 'F'); // left
	doc.rect(3 + w, (pdfY - lineHeight) - 3, 3, lineHeight + 6, 'F'); // right

	// Draw the capo
	setPDFColor(doc, 'capo');
	doc.text(capoText, 3, pdfY - (lineHeight * 0.25));// str, x, y

	pdfY += 3;// add a little extra spacing because of box

	// Return to original font size
	doc.setFontSize(finalFont);
}

function drawPDFSongHeader(doc, lineHeight, finalFont) {
	pdfY = lineHeight;

	// Draw the backgrounds for both header lines
	setPDFColor(doc, 'titleBG');
	doc.rect(0, pdfY - lineHeight, maxPageWidth, lineHeight, 'F'); // Draw filled rectangle
	doc.rect(0, pdfY, maxPageWidth, lineHeight + 10, 'F'); // Draw filled rectangle

	drawTitle(doc, songMetaData["title"], pdfY, lineHeight);

	let key = songMetaData["key"];
	let cksText = $("#chordKeySelect").find(":selected").text();
	if(cksText !== "NNS" && cksText !== "Original" && cksText !== "No Chords") {
		if(key.endsWith('m')) {
			key = cksText.substring(cksText.indexOf('(') + 1, cksText.indexOf(')'));
		} else {
			key = cksText.substring(0, cksText.indexOf(' '));
		}
	}
	let time = songMetaData["time"];
	let tempo = songMetaData["tempo"];
	pdfY += lineHeight;
	drawKeyTimeTempo(doc, key, time, tempo, pdfY, lineHeight, finalFont);

	if(hasDataForKey(songMetaData, "capo")) {
		pdfY += 13;
		drawCapo(doc, songMetaData["capo"], lineHeight, finalFont);
	} else {
		pdfY += 10;// little space before the sections begin
	}

	if($('#vocalHighlights').is(':checked')) {
		setPDFFont(doc, 'sans', 'normal');
		doc.setFontSize(7);
		let h = ((lineHeight + lineHeight + 10) / 6);
		let y = h;
		setPDFColor(doc, '<h>');
		doc.rect(maxPageWidth - 50, y - h, 50, h, 'F'); // Draw filled rectangle
		setPDFColor(doc, 'lyric');
		let x = doc.getTextWidth('High');
		doc.text('High', (maxPageWidth - 50)  + ((50 - x)/2), y - 3);
		y += h;
		setPDFColor(doc, '<l>');
		doc.rect(maxPageWidth - 50, y - h, 50, h, 'F'); // Draw filled rectangle
		setPDFColor(doc, 'lyric');
		x = doc.getTextWidth('Low');
		doc.text('Low', (maxPageWidth - 50)  + ((50 - x)/2), y - 3);
		y += h;
		setPDFColor(doc, '<b>');
		doc.rect(maxPageWidth - 50, y - h, 50, h, 'F'); // Draw filled rectangle
		setPDFColor(doc, 'lyric');
		x = doc.getTextWidth('Both');
		doc.text('Both', (maxPageWidth - 50)  + ((50 - x)/2), y - 3);
		y += h;
		setPDFColor(doc, '<u>');
		doc.rect(maxPageWidth - 50, y - h, 50, h, 'F'); // Draw filled rectangle
		setPDFColor(doc, 'lyric');
		x = doc.getTextWidth('Unison');
		doc.text('Unison', (maxPageWidth - 50)  + ((50 - x)/2), y - 3);
		y += h;
		setPDFColor(doc, '<a>');
		doc.rect(maxPageWidth - 50, y - h, 50, h, 'F'); // Draw filled rectangle
		setPDFColor(doc, 'lyric');
		x = doc.getTextWidth('All');
		doc.text('All', (maxPageWidth - 50)  + ((50 - x)/2), y - 3);
		y += h;
		setPDFColor(doc, '<x>');
		doc.rect(maxPageWidth - 50, y - h, 50, h, 'F'); // Draw filled rectangle
		setPDFColor(doc, 'lyric');
		x = doc.getTextWidth('Special');
		doc.text('Special', (maxPageWidth - 50)  + ((50 - x)/2), y - 3);
		y += h;
	}
	doc.setFontSize(finalFont);
}

function drawSectionHeaderAndComments(doc, line, lineHeight, finalFont) {
	const [type, id, ...comments] = line.substring(1, line.length - 1).split(':');

	let idText = ' ' + id + ' ';
	/* Draw Section Header */
	if(type === 'start_of_verse') {
		setPDFFont(doc, 'sans', 'bold');
	} else {
		setPDFFont(doc, 'sans', 'bolditalic');
	}
	let idW = doc.getTextWidth(idText);
	let totalW = idW;

	// Draw the background
	setPDFColor(doc, 'sectionBG');
	pdfY += lineHeight;
	doc.rect(0, pdfY - lineHeight, idW, lineHeight, 'F');

	// Draw the section header
	setPDFColor(doc, 'section');
	doc.text(idText, 0, pdfY - (lineHeight * 0.15));// str, x, y

	// Draw the underline
	if(type === 'start_of_chorus') {
		doc.rect(0, pdfY - 3, idW, 3, 'F'); // Draw filled rectangle
	}

	if(comments.length > 0) {
		/* Draw First Comment */
		// Get the width in the appropriate font
		setPDFFont(doc, 'sans', 'italic');
		let small = finalFont * 0.80;
		doc.setFontSize(small);
		let commentText = ' ' + comments[0] + ' ';
		let w = doc.getTextWidth(commentText);
		totalW += w;

		// Draw the background
		setPDFColor(doc, 'commentBG');
		doc.rect(idW, pdfY - lineHeight, w, lineHeight, 'F'); // Draw filled rectangle

		// Handle special case:  "Play nX"
		handleSpecial(doc, commentText, idW, lineHeight);

		// Draw the comment
		setPDFColor(doc, 'comment');
		doc.text(commentText, idW, pdfY - (lineHeight * 0.25));// str, x, y
	}
	currPDFLongestLine = Math.max(currPDFLongestLine, totalW);

	if(comments.length > 1) {
		for(let i = 1; i < comments.length; i++) {
			drawCommentItalic(doc, '{comment_italic:' + comments[i] + '}', lineHeight, finalFont);
		}
	}

	// Return to original font and size
	setPDFFont(doc, 'sans', 'normal');
	doc.setFontSize(finalFont);
}

function handleSpecial(doc, commentText, xOffset, lineHeight) {
	let pos = commentText.indexOf("Play ");
	if(pos >= 0 && commentText.charAt(pos + 6) === "X" && isCharNumber(commentText.charAt(pos + 5))) {
		setPDFColor(doc, 'commentBGSpecial');
		let start = doc.getTextWidth(commentText.substring(0, pos));
		let startPad = Math.max(0, start - 5);
		let width = doc.getTextWidth(commentText.substring(pos, pos + 7));
		let widthPad = 5;
		width = startPad + width + widthPad;
		doc.rect(xOffset + (start - startPad), pdfY - lineHeight, width, lineHeight, 'F'); // Draw filled rectangle
	}
}

function isCharNumber(c) {
	return typeof c === 'string' && c.length === 1 && c >= '0' && c <= '9';
}

function stripHighlightData(line) {
	return line.replace(/<[^>]*>/g, '');
}

function drawComment(doc, line, lineHeight, finalFont) {
	// Separate out the comment
	const [type, comment] = line.substring(1, line.length - 1).split(':');

	// Get the width in the appropriate font
	let small = finalFont * 0.80;
	doc.setFontSize(small);
	let commentText = ' ' + comment + ' ';
	let w = doc.getTextWidth(commentText);
	currPDFLongestLine = Math.max(currPDFLongestLine, w);

	// Needs a little extra space at the top
	pdfY += 7;

	// Draw the background
	setPDFColor(doc, 'commentBG');
	pdfY += lineHeight;
	doc.rect(0, pdfY - lineHeight, w, lineHeight, 'F'); // Draw filled rectangle

	// Handle special case:  "Play nX"
	handleSpecial(doc, commentText, 0, lineHeight);

	// Draw the comment
	setPDFColor(doc, 'comment');
	doc.text(commentText, 0, pdfY - (lineHeight * 0.25));// str, x, y

	// Return to original font size
	doc.setFontSize(finalFont);
}

function drawCommentItalic(doc, line, lineHeight, finalFont) {
	// Separate out the comment
	const [type, comment] = line.substring(1, line.length - 1).split(':');

	// Get the width in the appropriate font
	let small = finalFont * 0.80;
	setPDFFont(doc, 'sans', 'italic');
	doc.setFontSize(small);
	let commentText = ' ' + comment + ' ';
	let w = doc.getTextWidth(commentText);
	currPDFLongestLine = Math.max(currPDFLongestLine, w);

	// Needs a little extra space at the top
	pdfY += 7;

	// Draw the background
	setPDFColor(doc, 'commentBG');
	pdfY += lineHeight;
	doc.rect(0, pdfY - lineHeight, w, lineHeight, 'F'); // Draw filled rectangle

	// Handle special case:  "Play nX"
	handleSpecial(doc, commentText, 0, lineHeight);

	// Draw the comment
	setPDFColor(doc, 'comment');
	doc.text(commentText, 0, pdfY - (lineHeight * 0.25));// str, x, y

	// Return to original font size
	setPDFFont(doc, 'sans', 'normal');
	doc.setFontSize(finalFont);
}

function drawCommentBox(doc, line, lineHeight, finalFont) {
	// Separate out the comment
	const [type, comment] = line.substring(1, line.length - 1).split(':');

	// Get the width in the appropriate font
	let small = finalFont * 0.80;
	doc.setFontSize(small);
	let commentText = ' ' + comment + ' ';
	let w = doc.getTextWidth(commentText);
	currPDFLongestLine = Math.max(currPDFLongestLine, w);

	// Needs a little extra space at the top
	pdfY += 9;

	// Draw the background
	setPDFColor(doc, 'commentBG');
	pdfY += lineHeight;
	doc.rect(3, pdfY - lineHeight, w, lineHeight, 'F'); // Draw filled rectangle

	// Handle special case:  "Play nX"
	handleSpecial(doc, commentText, 0, lineHeight);

	// Draw the box
	setPDFColor(doc, 'commentBox');
	doc.rect(3, (pdfY - lineHeight) - 3, w, 3, 'F'); // top
	doc.rect(3, pdfY, w, 3, 'F'); // bottom
	doc.rect(0, (pdfY - lineHeight) - 3, 3, lineHeight + 6, 'F'); // left
	doc.rect(3 + w, (pdfY - lineHeight) - 3, 3, lineHeight + 6, 'F'); // right

	// Draw the comment
	setPDFColor(doc, 'comment');
	doc.text(commentText, 3, pdfY - (lineHeight * 0.25));// str, x, y

	pdfY += 3;// add a little extra spacing because of box

	// Return to original font size
	doc.setFontSize(finalFont);
}

function drawTranspose(doc, line, lineHeight, finalFont) {
	// Separate out the transpose amount
	const [type, transpose] = line.substring(1, line.length - 1).split(':');

	// Get the width in the appropriate font
	let small = finalFont * 0.80;
	doc.setFontSize(small);
	currPDFKey = transposeKey(currPDFKey, parseInt(transpose));
	let transposeText = ' Transpose: ' + transpose + ' (New Key: ' + currPDFKey + ') ';
	let w = doc.getTextWidth(transposeText);
	currPDFLongestLine = Math.max(currPDFLongestLine, w);

	// Draw the background
	setPDFColor(doc, 'transposeBG');
	pdfY += lineHeight;
	doc.rect(3, pdfY - lineHeight, w, lineHeight, 'F'); // Draw filled rectangle

	// Draw the box
	setPDFColor(doc, 'transposeBox');
	doc.rect(3, (pdfY - lineHeight) - 3, w, 3, 'F'); // top
	doc.rect(3, pdfY, w, 3, 'F'); // bottom
	doc.rect(0, (pdfY - lineHeight) - 3, 3, lineHeight + 6, 'F'); // left
	doc.rect(3 + w, (pdfY - lineHeight) - 3, 3, lineHeight + 6, 'F'); // right

	// Draw the transpose
	setPDFColor(doc, 'transpose');
	doc.text(transposeText, 3, pdfY - (lineHeight * 0.25));// str, x, y

	pdfY += 3;// add a little extra spacing because of box

	// Return to original font size
	doc.setFontSize(finalFont);

	return parseInt(transpose);
}

/*
 This function preserves tags (e.g. '<l1>') and chords (e.g. '[Am]') as single tokens,
 splits words on spaces, and keeps punctuation like commas as separate tokens.
 */
function tokenizeLine(line) {
	const tokens = [];
	let currentToken = '';
	let i = 0;

	while (i < line.length) {
		if (line[i] === '<') {
			// Handle tags
			if (currentToken) {
				tokens.push(currentToken);
				currentToken = '';
			}
			let tag = '<';
			i++;
			while (i < line.length && line[i] !== '>') {
				tag += line[i];
				i++;
			}
			if (i < line.length) {
				tag += '>';
				tokens.push(tag);
				i++;
			}
		} else if (line[i] === '[') {
			// Handle chords
			if (currentToken) {
				tokens.push(currentToken);
				currentToken = '';
			}
			let chord = '[';
			i++;
			while (i < line.length && line[i] !== ']') {
				chord += line[i];
				i++;
			}
			if (i < line.length) {
				chord += ']';
				tokens.push(chord);
				i++;
			}
		} else {
			// Handle regular characters
			currentToken += line[i];
			// Split on spaces or punctuation, but keep punctuation
			if (line[i] === ' ' || /[,.!?]/.test(line[i])) {
				if (currentToken.length > 1 && /[,.!?]/.test(currentToken)) {
					// Split word and punctuation
					tokens.push(currentToken.slice(0, -1));
					tokens.push(currentToken.slice(-1));
				} else {
					tokens.push(currentToken);
				}
				currentToken = '';
			}
			i++;
		}
	}
	// Push any remaining token
	if (currentToken) {
		tokens.push(currentToken);
	}

	return tokens;
}

function determineChordLocationAttributes(doc, chordStr, finalFont) {
	let chordText = chordStr.substring(1, chordStr.length - 1);
	let durationText = '';
	let atPos = chordText.indexOf('@');
	if(atPos >= 0) {
		durationText = chordText.substring(atPos + 1);
		chordText = chordText.substring(0, atPos);
	}
	let chordW = 0;
	let chordLen = 0;
	let typeLen = 0;
	let wChord = 0;
	let wType = 0;
	let wSlash = 0;
	let slashPos = -1;
	if(($("#chordKeySelect").find(":selected").text() === 'NNS' && ((chordText[0] >= '1' && chordText[0] <= '7') || (chordText[0] === 'b' && chordText[1] >= '1' && chordText[1] <= '7'))) || (chordText[0] >= 'A' && chordText[0] <= 'G')) {
		if(chordText.length > 1 && "b#x".indexOf(chordText[1]) >= 0) {
			if(chordText.length > 2 && chordText[2] === 'b') {
				chordLen = 3;
			} else {
				chordLen = 2;
			}
		} else {
			chordLen = 1;
		}
	}
	if(chordLen === 0) {// default
		chordLen = chordText.length;
	}
	// Calculate width
	typeLen = chordText.length - chordLen;
	slashPos = chordText.indexOf('/');
	if(slashPos >= 0) {
		typeLen = slashPos - chordLen;
	}
	setPDFFont(doc, 'sans', 'bold');
	chordW = doc.getTextWidth(chordText);
	wChord = chordW;
	wType = 0;
	wSlash = 0;
	if(typeLen > 0) {
		chordW = doc.getTextWidth(chordText.substring(0, chordLen));
		wChord = chordW;
		doc.setFontSize(finalFont * 0.80);
		wType = doc.getTextWidth(chordText.substring(chordLen, chordLen + typeLen));
		chordW += wType;
		doc.setFontSize(finalFont);
		if(slashPos > 0) {
			wSlash = doc.getTextWidth(chordText.substring(slashPos) + '  ');
		} else {
			wSlash = doc.getTextWidth('  ');
		}
		chordW += wSlash;
	}
	return [chordText, chordLen, typeLen, wChord, wType, wSlash, slashPos, durationText];
}

function tokenizeString(str) {
	/* First, do the actual tokenize */
	let tokenArr =  tokenizeLine(str);

	/* Then, map the current highlight color to each token (as applicable). */
	let tokens = [];
	let currVocHL = '';

	for (let i = 0; i < tokenArr.length; i++) {
		let token = tokenArr[i];
		if(token.startsWith('</') && token.endsWith('>')) {// ending a vocal highlight color
			currVocHL = '';
		} else if(token.startsWith('<') && token.endsWith('>')) {// starting a vocal highlight color
			currVocHL = token;
		} else {
			tokens.push([token,currVocHL]);
		}
	}

	return tokens;
}

function drawLyricSegment(doc, oldX, x, y, w, lineHeight, lyric, highlight) {
	setPDFFont(doc, 'sans', 'normal');
	if($('#vocalHighlights').is(':checked') && highlight !== '') {
		setPDFColor(doc, highlight);
		let rectY = lineHeight - (lineHeight * 0.2);
		if(oldX > 0) {// vocal highlight should continue under chords that are between words
			doc.rect(oldX, (y - rectY), w + (x - oldX), lineHeight, 'F'); // Draw filled rectangle
		} else {
			doc.rect(x, (y - rectY), w, lineHeight, 'F'); // Draw filled rectangle
		}
	}
	setPDFColor(doc, 'lyric');
	doc.text(lyric, x, pdfY);// str, x, y
}

function drawChordSegment(doc, x, y, lineHeight, chordText, chordLen, typeLen, wChord, wType, wSlash, slashPos, durationText, finalFont) {
	// Set the font
	setPDFFont(doc, 'sans', 'bold');
	if(typeLen > 0) {
		setPDFColor(doc, 'chord');
		doc.text(chordText.substring(0, chordLen), x, y);// chord
		doc.setFontSize(finalFont * 0.80);
		setPDFColor(doc, 'chordType');
		doc.text(chordText.substring(chordLen, chordLen + typeLen), x + wChord, y - (lineHeight * 0.15));// chordType
		doc.setFontSize(finalFont);
		setPDFColor(doc, 'chord');
		if(slashPos > 0) {
			doc.text(chordText.substring(slashPos) + '  ', x + wChord + wType, y);// slash
		} else {
			doc.text('  ', x + wChord + wType, y);
		}
	} else {
		setPDFColor(doc, 'chord');
		doc.text(chordText, x, y);
	}
	// Draw duration text (when applicable)
	// w = whole,   h = half,   q = quarter,   e = eighth,    s = sixteenth
	// . = dot,     - = tie,    ! = stop,      ~ = fermata,   3 = triplet
	if($('#chordDurations').is(':checked') && durationText.length > 0) {
		drawChordDuration(durationText, doc, x, y);
		// reset, just in case
		doc.setFontSize(finalFont);
		setPDFColor(doc, 'chord');
	}
	return slashPos > 0 ? (wChord + wSlash + wType) : (wChord + wType);
}

function drawChordsAndLyrics(doc, line, lineHeight, finalFont) {
	let tokens = tokenizeString(line);
	if(line.indexOf('[') < 0) {// lyrics only
		pdfY += lineHeight;
		let currX = 20;// tracking current x coordinate
		for (let i = 0; i < tokens.length; i++) {
			let tokenArr = tokens[i];
			let w = doc.getTextWidth(tokenArr[0]);
			drawLyricSegment(doc, -1, currX, pdfY, w, lineHeight, tokenArr[0], tokenArr[1]);
			currX += w;
		}
		currPDFLongestLine = Math.max(currPDFLongestLine, currX);
	} else {// chords and lyrics
		// Establish x,y coordinates for the chord line and lyric line
		pdfY += lineHeight;
		let chordsY = pdfY;
		pdfY += lineHeight;
		let lyricsY = pdfY;
		let currChordsX = 20;
		let currLyricsX = 20;
		let oldLyricsX = -1;

		// Iterate over the tokens
		for (let i = 0; i < tokens.length; i++) {
			let tokenArr = tokens[i];
			if(tokenArr[0].startsWith('[') && tokenArr[0].endsWith(']')) {// chord
				let chordAttrsArr = determineChordLocationAttributes(doc, tokenArr[0], finalFont);// chordText, chordLen, typeLen, wChord, wType, wSlash, slashPos, durationText
				let w = drawChordSegment(doc, currChordsX, chordsY, lineHeight, chordAttrsArr[0], chordAttrsArr[1], chordAttrsArr[2], chordAttrsArr[3], chordAttrsArr[4], chordAttrsArr[5], chordAttrsArr[6], chordAttrsArr[7], finalFont);
				currChordsX += w;
				let nextTokArr = ((i < tokens.length - 1) ? tokens[i + 1] : ['','']);
				if(/^\s+$/.test(nextTokArr[0])) {// spaces only
					oldLyricsX = currLyricsX;
					currLyricsX = currChordsX;
				}
			} else {// lyric
				setPDFFont(doc, 'sans', 'normal');
				let w = doc.getTextWidth(tokenArr[0]);
				drawLyricSegment(doc, oldLyricsX, currLyricsX, lyricsY, w, lineHeight, tokenArr[0], tokenArr[1]);
				if(oldLyricsX > 0) {
					oldLyricsX = -1;
				}
				currLyricsX += w;
				let moreLyrics = (tokens.length > (i + 1)) && !tokens[i+1][0].startsWith('[');
				if(!moreLyrics && currLyricsX < currChordsX) {// curr chord is wider than curr lyrics
					currChordsX += doc.getTextWidth("  ");
					currLyricsX = currChordsX;
				} else {
					currChordsX = Math.max(currLyricsX, currChordsX);
				}
			}
		}
		currPDFLongestLine = Math.max(currPDFLongestLine, Math.max(currLyricsX, currChordsX));
	}
}

function drawChordDuration(durationText, doc, x, y) {
	const dims = {
		'b': { w: 10, h: 8 },// breve
		'w': { w: 10, h: 8 },// whole
		'w.': { w: 12.5, h: 8 },// dotted whole
		'h': { w: 10, h: 18 },// half
		'h.': { w: 12.5, h: 18 },// dotted half
		'q': { w: 8.5, h: 18 },// quarter
		'q.': { w: 11.5, h: 18 },// dotted quarter
		'e': { w: 12, h: 18 },// eighth
		'e.': { w: 12, h: 18 },// dotted eighth
		's': { w: 12, h: 18 },// sixteenth
		's.': { w: 12, h: 18 },// dotted sixteenth
		'-': { w: 6, h: 3.5 },// tie
		'~': { w: 11.5, h: 6.5 },// fermata (hold)
		'!': { w: 13, h: 12 }// caesura (stop)
	};
	let between = 2;
	setPDFColor(doc, 'chordDuration');
	doc.setLineWidth(1.5);

	let segments = [];
	for(let i = 0; i < durationText.length; i++) {
		let c = durationText[i];
		if(c === 'w' || c === 'h' || c === 'q' || c === 'e' || c === 's') {
			if(durationText[i + 1] === '.') {
				segments.push(durationText.substring(i, i + 2));
				i++;
			} else {
				segments.push(durationText.substring(i, i + 1));
			}
		} else {
			segments.push(durationText.substring(i, i + 1));
		}
	}

	let _x = x + 6;
	let _y = y - 5;
	for(let i = segments.length - 1; i >= 0; i--) {
		let seg = segments[i];
		_x -= (seg === '-' ? dims[seg].w : (dims[seg].w + between));
		switch(seg) {
			case 'b':
				drawBreve(doc, _x, _y);
				break;
			case 'w':
				drawWhole(doc, _x, _y);
				break;
			case 'w.':
				drawDottedWhole(doc, _x, _y);
				break;
			case 'h':
				drawHalf(doc, _x, _y);
				break;
			case 'h.':
				drawDottedHalf(doc, _x, _y);
				break;
			case 'q':
				drawQuarter(doc, _x, _y);
				break;
			case 'q.':
				drawDottedQuarter(doc, _x, _y);
				break;
			case 'e':
				drawEighth(doc, _x, _y);
				break;
			case 'e.':
				drawDottedEighth(doc, _x, _y);
				break;
			case 's':
				drawSixteenth(doc, _x, _y);
				break;
			case 's.':
				drawDottedSixteenth(doc, _x, _y);
				break;
			case '-':
				drawTie(doc, _x, _y);
				break;
			case '!':
				drawCaesura(doc, _x, _y);
				break;
			case '~':
				drawFermata(doc, _x, _y);
				break;
		}
	}
}

function drawFermata(doc, x, y) {
	doc.path([
		{ op: "m", c: [x - 5, y + 2] },
		{ op: "c", c: [x - 2.5, y - 4, x + 2.5, y - 4, x + 5, y + 2] } // Bezier for curve
	]).stroke();
	doc.circle(x, y + 1, 1.5, 'F');// Dot
}

function drawTie(doc, x, y) {
	doc.path([
		{ op: "m", c: [x - 5, y + 3] },
		{ op: "c", c: [x - 3.5, y + 5, x - 1.5, y + 5, x, y + 3] } // Bezier for curve
	]).stroke();
}

function drawBreve(doc, x, y) {
	drawWhole(doc, x, y);
	doc.line(x - 4.5, y - 4, x - 4.5, y + 4); // Left stem
	doc.line(x + 4.5, y - 4, x + 4.5, y + 4); // Right stem
}

function drawWhole(doc, x, y) {
	doc.ellipse(x, y, 3.5, 2.3, 'S'); // Hollow oval notehead
}

function drawDottedWhole(doc, x, y) {
	drawWhole(doc, x, y);
	doc.circle(x + 6, y + 2, 1.25, 'F'); // Dot to the right
}

function drawHalf(doc, x, y) {
	drawWhole(doc, x, y);
	doc.line(x + 3.5, y, x + 3.5, y - 14); // Stem up
}

function drawDottedHalf(doc, x, y) {
	drawHalf(doc, x, y);
	doc.circle(x + 6, y + 2, 1.25, 'F'); // Dot to the right
}

function drawQuarter(doc, x, y) {
	doc.ellipse(x, y, 4, 2.8, 'F'); // Filled oval notehead
	doc.line(x + 3.5, y, x + 3.5, y - 14); // Stem up
}

function drawDottedQuarter(doc, x, y) {
	drawQuarter(doc, x, y);
	doc.circle(x + 6, y + 2, 1.25, 'F'); // Dot to the right
}

function drawEighth(doc, x, y) {
	drawQuarter(doc, x, y);
	doc.setLineWidth(1.5);
	doc.path([
		{ op: "m", c: [x + 3.5, y - 13.5] },
		{ op: "l", c: [x + 7, y - 10.5] },
		{ op: "l", c: [x + 6, y - 3.5] }
	]).stroke(); // Single flag
}

function drawDottedEighth(doc, x, y) {
	drawEighth(doc, x, y);
	doc.circle(x + 6, y + 2, 1.25, 'F'); // Dot to the right
}

function drawSixteenth(doc, x, y) {
	drawQuarter(doc, x, y);
	doc.setLineWidth(1);
	doc.setLineWidth(1.5);
	doc.path([
		{ op: "m", c: [x + 3.5, y - 13.5] },
		{ op: "l", c: [x + 7, y - 10.5] },
		{ op: "l", c: [x + 6, y - 3.5] }
	]).stroke(); // First flag
	doc.setLineWidth(1.5);
	doc.path([
		{ op: "m", c: [x + 3.5, y - 10] },
		{ op: "l", c: [x + 7, y - 7] }
	]).stroke(); // Second flag
}

function drawDottedSixteenth(doc, x, y) {
	drawSixteenth(doc, x, y);
	doc.circle(x + 6, y + 2, 1.25, 'F'); // Dot to the right
}

function drawCaesura(doc, x, y) {
	doc.setLineWidth(1.5);
	doc.line(x - 3, y + 2, x + 3, y - 8); // First diagonal
	doc.line(x, y + 2, x + 6, y - 8); // Second diagonal
}

function drawChordPro(doc, line, lineHeight, finalFont) {
	if(line.indexOf('[') < 0) {// lyrics only
		pdfY += lineHeight;
		let w = doc.getTextWidth(line);
		currPDFLongestLine = Math.max(currPDFLongestLine, (w + 20));
		setPDFColor(doc, 'lyric');
		doc.text(line, 20, pdfY);
	} else {// chords and lyrics
		pdfY += lineHeight;
		let currX = 20;

		let pos = 0;
		let segments = [];
		for(let i = 1; i < line.length; i++) {
			if(line[i] === '[') {
				segments.push(line.substring(pos, i));
				pos = i;
			}
			if(line[i] === ']' && line[i + 1] === ' ') {
				segments.push(line.substring(pos, i + 2));
				pos = i + 1;
			}
		}
		if(pos < line.length) {
			segments.push(line.substring(pos));
		}
		for(let i = 0; i < segments.length; i++) {
			let seg = segments[i];
			if(seg[0] === '[') {// starts with a chord
				let chordText = seg.substring(1, seg.indexOf(']'));
				let lyricText = seg.substring(seg.indexOf(']') + 1);
				let chordW = 0;
				let chordLen = 0;
				let typeLen = 0;
				let wChord = 0;
				let wType = 0;
				let wSlash = 0;
				let slashPos = -1;
				if($("#chordKeySelect").find(":selected").text() === 'NNS') {
					setPDFFont(doc, 'sans', 'bold');
					chordW = doc.getTextWidth('[' + chordText + ']');
					wChord = chordW;
					wType = 0;
					wSlash = 0;
				} else {
					if(chordText[0] >= 'A' && chordText[0] <= 'G') {
						if(chordText.length > 1 && "b#x".indexOf(chordText[1]) >= 0) {
							if(chordText.length > 2 && chordText[2] === 'b') {
								chordLen = 3;
							} else {
								chordLen = 2;
							}
						} else {
							chordLen = 1;
						}
					}
					if(chordLen === 0) {
						chordLen = chordText.length;
					}
					// Calculate width
					typeLen = chordText.length - chordLen;
					slashPos = chordText.indexOf('/');
					if(slashPos >= 0) {
						typeLen = slashPos - typeLen;
					}
					setPDFFont(doc, 'sans', 'bold');
					wChord = doc.getTextWidth('[' + chordText + ']');
					chordW = wChord;
					wType = 0;
					wSlash = 0;
					if(typeLen > 0) {
						wChord = doc.getTextWidth('[' + chordText.substring(0, chordLen));
						chordW = wChord;
						doc.setFontSize(finalFont * 0.80);
						wType = doc.getTextWidth(chordText.substring(chordLen, chordLen + typeLen));
						chordW += wType;
						doc.setFontSize(finalFont);
						if(slashPos > 0) {
							wSlash = doc.getTextWidth(chordText.substring(slashPos) + ']');
						}
						chordW += wSlash;
					}
				}
				setPDFFont(doc, 'sans', 'normal');
				let lyricW = doc.getTextWidth(lyricText);

				// Draw
				setPDFFont(doc, 'sans', 'bold');
				if(typeLen > 0) {
					setPDFColor(doc, 'chord');
					doc.text('[' + chordText.substring(0, chordLen), currX, pdfY);// chord
					doc.setFontSize(finalFont * 0.80);
					setPDFColor(doc, 'chordType');
					doc.text(chordText.substring(chordLen, chordLen + typeLen), currX + wChord, pdfY - (lineHeight * 0.15));// chordType
					doc.setFontSize(finalFont);
					setPDFColor(doc, 'chord');
					if(slashPos > 0) {
						doc.text(chordText.substring(slashPos) + ']', currX + (wChord + wType), pdfY);// slash
					} else {
						doc.text(']', currX + (wChord + wType + wSlash), pdfY);
					}
					currX += chordW;
				} else {
					setPDFColor(doc, 'chord');
					doc.text('[' + chordText + ']', currX, pdfY);
					currX += wChord;
				}
				setPDFFont(doc, 'sans', 'normal');
				setPDFColor(doc, 'lyric');
				doc.text(lyricText, currX, pdfY);
				currX += lyricW;
			} else {// lyrics only (beginning of line)
				setPDFColor(doc, 'lyric');
				let segW = doc.getTextWidth(seg);
				doc.text(seg, currX, pdfY);
				currX += segW;
			}
		}
		currPDFLongestLine = Math.max(currPDFLongestLine, currX);
	}
}

/* Section repeats have been removed (i.e. exploded) */
function drawPDFChordPro(doc, lineHeight, finalFont, linesToDisplay, recallMap) {
	let currentKey = $("#chordKeySelect").find(":selected").text();
	if(currentKey.endsWith(")")) {// remove the minor key from the display value
		currentKey = currentKey.substring(0, currentKey.indexOf("(")).trim();
	}
	if(currentKey === "Original" || currentKey === "No Chords") {
		currentKey = getNormalizedKey();// If minor key, returns equivalent major
	}
	currPDFKey = currentKey;

	let transAmount = 0;
	let currLine = 0;
	for(let i = 0; i < linesToDisplay.length; i++) {
		let line = linesToDisplay[i];
		if(line.trim() === '') {// empty line between sections
			pdfY += lineHeight;// move the cursor down to make a vertical space, no need to write anything
			// See if next group/section will fit on the page
			if(i < linesToDisplay.length - 1) {// if there is a 'next'
				let totalLines = countLinesForNextSection(linesToDisplay, i + 1);
				let totalSpace = totalLines * lineHeight;
				if(pdfY + totalSpace >= maxPageHeight) {// it won't fit - go to next page
					doc.addPage();
					drawPageBackground(doc);
					let divHeight = (maxPageHeight * doc.getNumberOfPages()) * 1.1;
					$("#pdfContainer").height(divHeight);
					pdfY = 0;
				} else {
					// do nothing - it will fit
				}
			}
			continue;
		} else if(line.startsWith('{start_of_')) {// new section header and comments
			drawSectionHeaderAndComments(doc, line, lineHeight, finalFont);
		} else if(line.startsWith('{comment')) {// a comment
			if(line.startsWith('{comment:')) {
				drawComment(doc, line, lineHeight, finalFont);
			} else if(line.startsWith('{comment_italic:')) {
				drawCommentItalic(doc, line, lineHeight, finalFont);
			} else if(line.startsWith('{comment_box:')) {
				drawCommentBox(doc, line, lineHeight, finalFont);
			}
		} else if(line.startsWith('{transpose:')) {// a transpose directive (and indicator)
			let trans = drawTranspose(doc, line, lineHeight, finalFont);
			transAmount += trans;
		} else if(line.startsWith('{end_of_')) {// end of a section
			// do nothing
		} else {// must be chords and lyrics
			let _line = transposeLine_ChordPro(line, currentKey, transAmount);
			drawChordPro(doc, _line, lineHeight, finalFont, transAmount);
		}
	}
}

/* Section repeats have been removed (i.e. exploded) */
function drawPDFChordsOverLyrics(doc, lineHeight, finalFont, linesToDisplay, recallMap) {
	let currentKey = $("#chordKeySelect").find(":selected").text();
	if(currentKey.endsWith(")")) {// remove the minor key from the display value
		currentKey = currentKey.substring(0, currentKey.indexOf("(")).trim();
	}
	if(currentKey === "Original" || currentKey === "No Chords") {
		currentKey = getNormalizedKey();// If minor key, returns equivalent major
	}
	currPDFKey = currentKey;

	let transAmount = 0;
	let currLine = 0;
	for(let i = 0; i < linesToDisplay.length; i++) {
		let line = linesToDisplay[i];
		if(line.trim() === '') {// empty line between sections
			pdfY += lineHeight;// move the cursor down to make a vertical space, no need to write anything
			// See if next group/section will fit on the page
			if(i < linesToDisplay.length - 1) {// if there is a 'next'
				let totalLines = countLinesForNextSection(linesToDisplay, i + 1);
				let totalSpace = totalLines * lineHeight;
				if(pdfY + totalSpace >= maxPageHeight) {// it won't fit - go to next page
					doc.addPage();
					drawPageBackground(doc);
					let divHeight = (maxPageHeight * doc.getNumberOfPages()) * 1.1;
					$("#pdfContainer").height(divHeight);
					pdfY = 0;
				} else {
					// do nothing - it will fit
				}
			}
			continue;
		} else if(line.startsWith('{start_of_')) {// new section header and comments
			drawSectionHeaderAndComments(doc, line, lineHeight, finalFont);
		} else if(line.startsWith('{comment')) {// a comment
			if(line.startsWith('{comment:')) {
				drawComment(doc, line, lineHeight, finalFont);
			} else if(line.startsWith('{comment_italic:')) {
				drawCommentItalic(doc, line, lineHeight, finalFont);
			} else if(line.startsWith('{comment_box:')) {
				drawCommentBox(doc, line, lineHeight, finalFont);
			}
		} else if(line.startsWith('{transpose:')) {// a transpose directive (and indicator)
			let trans = drawTranspose(doc, line, lineHeight, finalFont);
			transAmount += trans;
		} else if(line.startsWith('{end_of_')) {// end of a section
			// do nothing
		} else {// must be chords and lyrics
			let _line = transposeLine_ChordPro(line, currentKey, transAmount);
			drawChordsAndLyrics(doc, _line, lineHeight, finalFont, transAmount);
		}
	}
}

/* This method assumes the song data is valid (we shouldn't get here if it is not) */
function createPDF_ChordPro(linesToDisplay, recallMap, chordKeySelect) {
	let doc = null;
	let finalFont = 25.5;// start at max size (+ 0.5)

	//let startTime = new Date();
	currPDFLongestLine = maxPageWidth + 1;
	while(currPDFLongestLine >= maxPageWidth) {
		currPDFLongestLine = 0;
		doc = getPDFDoc();
		finalFont = finalFont - 0.5;
		let lineHeight = Math.round(finalFont / 0.7);

		drawPageBackground(doc);

		setPDFFont(doc, 'sans', 'normal');
		doc.setFontSize(finalFont);
		doc.setTextColor(0,0,0);

		drawPDFSongHeader(doc, lineHeight, finalFont);

		drawPDFChordPro(doc, lineHeight, finalFont, linesToDisplay, recallMap);

		if(currPDFLongestLine <= maxPageWidth) {
			break;
		}
	}
	//let endTime = new Date();
	//console.log('Create PDF (sized to fit):  ' + (endTime - startTime) + 'ms');

	$("#currSizeInPts").text('Current size:  ' + finalFont + 'pts');

//	pdfToDivContainer(doc);
	lastCreatedDoc = doc;
	return doc;
}

/* This method assumes the song data is valid (we shouldn't get here if it is not) */
function createPDF_ChordsOverLyrics(linesToDisplay, recallMap, chordKeySelect) {
	let doc = null;
	let finalFont = 25.5;// start at max size (+ 0.5)

	//let startTime = new Date();
	currPDFLongestLine = maxPageWidth + 1;
	while(currPDFLongestLine >= maxPageWidth) {
		currPDFLongestLine = 0;
		doc = getPDFDoc();
		finalFont = finalFont - 0.5;
		let lineHeight = Math.round(finalFont / 0.7);

		drawPageBackground(doc);

		setPDFFont(doc, 'sans', 'normal');
		doc.setFontSize(finalFont);
		doc.setTextColor(0,0,0);

		drawPDFSongHeader(doc, lineHeight, finalFont);

		drawPDFChordsOverLyrics(doc, lineHeight, finalFont, linesToDisplay, recallMap);

		if(currPDFLongestLine <= maxPageWidth) {
			break;
		}
	}
	//let endTime = new Date();
	//console.log('Create PDF (sized to fit):  ' + (endTime - startTime) + 'ms');

	$("#currSizeInPts").text('Current size:  ' + finalFont + 'pts');

//	pdfToDivContainer(doc);
	lastCreatedDoc = doc;
	return doc;
}

function downloadLatestPDF() {
	if(hasDataForKey(songMetaData, "title")) {
		lastCreatedDoc.save(songMetaData["title"] + '.pdf');
	} else {
		lastCreatedDoc.save(lastDroppedFileName.replace('.chordpro', '.pdf'));
	}

}
