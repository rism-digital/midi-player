# MIDI Player


MIDI Player is a JavaScript player based on [Wild Web Midi](https://github.com/zz85/wild-web-midi) with a simple jQuery interface. It uses instrument patches from [Freepats](http://freepats.zenvoid.org/).

## Demo and example use

Try this [demo](http://rism-ch.github.io/midi-player/) for seeing / hearing it running.

Once included in your page, you only need to do (where song is a Base64 coded midi file):

```
<script type="text/javascript" src="wildwebmidi.js"></script>
<script type="text/javascript" src="midiplayer.js"></script>
<script type="text/javascript" src="example-song.js"></script>

$( document ).ready(function() {
    $("#player").midiPlayer({
        color: "red",
        onUpdate: midiUpdate,
        onStop: midiStop,
        width: 250,
        locateFile: function(file) {
          //locate wildwebmidi.data
          return '/path/to/'+file;
        }
    });
    $("#player").midiPlayer.play(song);
});
```

Remark: you also need to include the `wildwebmidi.data` file that needs to be retrieved by locateFile option, or accessible from the root of your site if not specified.

The source code of the demo is available [here](https://github.com/rism-ch/midi-player/tree/gh-pages)

## MIDI instruments

The player uses a piano sound font by default. Other instruments can be used, but only one at a time. For this, you need to replace the `wildwebmidi.js` and the `wildwebmidi.data` files with the instrument files you want from the [`./intruments`](https://github.com/rism-ch/midi-player/tree/master/instruments) files.

For example, for using the church organ, you need to include `019_church_organ.js` in your page and have `019_church_organ.data` accessible from the root of your site.

## Building it

For building the midi-player you need Emscripten installed on your machine.

```sh
git clone git@github.com:Mindwerks/wildmidi.git
node make
```

