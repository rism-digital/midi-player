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
	// FLAGS += ' --preload-file freepats ';
}

var INSTRUMENTS = [
"000_acoustic_grand_piano",
"001_acoustic_brite_piano",
"002_electric_grand_piano",
"004_electric_piano_1_rhodes",
"005_electric_piano_2_chorused_yamaha_dx",
"006_harpsichord",
"007_clavinet",
"008_celesta",
"009_glockenspiel",
"013_xylophone",
"014_tubular_bells",
"015_dulcimer",
"016_hammond_organ",
"019_church_organ",
"021_accordion",
"023_tango_accordion",
"024_nylon_guitar",
"025_steel_guitar",
"026_jazz_guitar",
"027_clean_electric_guitar",
"028_muted_electric_guitar",
"029_overdriven_guitar",
"030_distortion_guitar",
"032_acoustic_bass",
"033_finger_bass",
"034_pick_bass",
"035_fretless_bass",
"036_slap_bass_1",
"037_slap_bass_2",
"038_synth_bass_1",
"040_violin",
"042_cello",
"044_tremolo_strings",
"045_pizzicato_strings",
"046_harp",
"047_timpani",
"048_string_ensemble_1_marcato",
"053_voice_oohs",
"056_trumpet",
"057_trombone",
"058_tuba",
"059_muted_trumpet",
"060_french_horn",
"061_brass_section",
"064_soprano_sax",
"065_alto_sax",
"066_tenor_sax",
"067_baritone_sax",
"068_oboe",
"069_english_horn",
"070_bassoon",
"071_clarinet",
"072_piccolo",
"073_flute",
"074_recorder",
"075_pan_flute",
"076_bottle_blow",
"079_ocarina",
"080_square_wave",
"084_charang",
"088_new_age",
"094_halo_pad",
"095_sweep_pad",
"098_crystal",
"101_goblins--unicorn",
"102_echo_voice",
"104_sitar",
"114_steel_drums",
"115_wood_block",
"120_guitar_fret_noise",
"122_seashore",
"125_helicopter",
"wildwebmidi"
];


/* 
var INSTRUMENTS = [
"000_acoustic_grand_piano",
"001_acoustic_brite_piano",
"073_flute",
"wildwebmidi"
];
*/

FLAGS += ' -s EMTERPRETIFY=1 ';
FLAGS += ' -s EMTERPRETIFY_ASYNC=1 ';
FLAGS += ' -s EMTERPRETIFY_WHITELIST="[\'_wildwebmidi\']" ';
FLAGS += " -s EXTRA_EXPORTED_RUNTIME_METHODS='[\"ccall\"]'";

/* DEBUG FLAGS */
// var DEBUG_FLAGS = ' -g '; FLAGS += DEBUG_FLAGS;
// FLAGS += ' -s ASSERTIONS=2 '
// FLAGS += ' --profiling-funcs '
// FLAGS += ' -s EMTERPRETIFY_ADVISE=1 '

var INCLUDES = '';
INCLUDES += '-Isrc ';
INCLUDES += '-Iwildmidi/include ';

var compile = EMCC + ' ' + INCLUDES
	+ sources.join(' ')
	+ FLAGS + ' ' + DEFINES
	+ ' -s EXPORTED_FUNCTIONS="[\'_wildwebmidi\', \'FS\']" ' ;

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
	for (i in INSTRUMENTS) {
	   
	   var freepats = ' --preload-file pats/' +  INSTRUMENTS[i] + '@freepats' 
	   var path = "";
	   if (INSTRUMENTS[i] != 'wildwebmidi') {
	       path = "instruments/"
	   }
	   var output = path + INSTRUMENTS[i] + '.js';
	   var instCmd = cmd + freepats + ' ' + ' -o ' + output; 
	   console.log('running ' + instCmd);
	   
	   var gzip = 'gzip -c ' + output + ' > ' + output + '.gz';
	   console.log('running ' + instCmd);
	   
	   var all = instCmd + ';' + gzip;
	   exec(all, onExec);
	 }
}

var jobs = [
	compile
];

nextJob();


