/*
 * Simple script for running emcc on wildmidi
 * @author zz85 github.com/zz85
 */

var NODEJS = 0;

var EMCC = 'emcc';

var OPTIMIZE_FLAGS = ' -Oz ';

var sources = [
    'wm_error.c',
    'file_io.c',
    'lock.c',
    'wildmidi_lib.c',
    'reverb.c',
    'gus_pat.c',
    'internal_midi.c',
    'patches.c',
    'f_xmidi.c',
    'f_mus.c',
    'f_hmp.c',
    'f_midi.c',
    'f_hmi.c',
    'sample.c',
    'mus2mid.c',
    'xmi2mid.c',
].map(function(include) {
	return 'wildmidi/src/' + include;
});

sources.push('src/wildwebmidi.c');

console.log('sources: ' + sources);

var DEFINES = '';

var FLAGS = OPTIMIZE_FLAGS;

var MEM = 64 * 1024 * 1024; // 64MB
FLAGS += ' --memory-init-file 0 -s MODULARIZE=1 -s EXPORT_NAME="\'MidiModule\'"'
FLAGS += ' -s TOTAL_MEMORY=' + MEM + ' ';


if (NODEJS) {
	DEFINES += ' -DNODEJS=1'
}
else {
	// browser
	FLAGS += ' --preload-file freepats ';
}

FLAGS += ' -s EMTERPRETIFY=1 ';
FLAGS += ' -s EMTERPRETIFY_ASYNC=1 ';
FLAGS += ' -s EMTERPRETIFY_WHITELIST="[\'_wildwebmidi\']" ';

/* DEBUG FLAGS */
// var DEBUG_FLAGS = ' -g '; FLAGS += DEBUG_FLAGS;
// FLAGS += ' -s ASSERTIONS=2 '
// FLAGS += ' --profiling-funcs '
// FLAGS += ' -s EMTERPRETIFY_ADVISE=1 '

var INCLUDES = '';
INCLUDES += '-Isrc ';
INCLUDES += '-Iwildmidi/include ';

var compile_all = EMCC + ' ' + INCLUDES
	+ sources.join(' ')
	+ FLAGS + ' ' + DEFINES + ' -o wildwebmidi.js '
	+ ' -s EXPORTED_FUNCTIONS="[\'_wildwebmidi\', \'FS\']"' ;

var
	exec = require('child_process').exec,
	child;

function onExec(error, stdout, stderr) {
	if (stdout) console.log('stdout: ' + stdout);
	if (stderr) console.log('stderr: ' + stderr);
	if (error !== null) {
		console.log('exec error: ' + error);
	} else {
		nextJob();
	}
}

function nextJob() {
	if (!jobs.length) {
		console.log('jobs done');
		return;
	}
	var cmd = jobs.shift();
	console.log('running ' + cmd);
	exec(cmd, onExec);
}

var jobs = [
	compile_all
];

nextJob();


