const { parentPort, workerData } =  require('worker_threads');
const ytSearch = require('yt-search');

  /*
  Takes the list of songs to search from
  worker data and calls yTubeSearch to
  make song objects from the result.
  returns the list of song objects when done.
  */
  (async function() {
    let songList = [];
    await Promise.all(workerData.value.map(async (element) => {
        
      console.log(element);
      const song =  await yTubeSearch(element);
      if (song) {
          songList.push(song);
      }
        
    }));
    parentPort.postMessage(songList);
  })();
 
  /*
  Searches for a youtube video with the same
  details as the song info from the spotify
  API and returns the found URL in a song
  object.
  */
  async function yTubeSearch(searchString) {
      const options = {search: searchString, category: 'music', pageStart: 1, pageEnd: 1 };
      let results = await ytSearch(options);
    
      if (!results?.videos?.length) {
        return;
      }
    
      const song = {
        title: results.videos[0].title,
        url: results.videos[0].url,
      };
    
      for(const songResult of results.videos) {
        if (songResult.title.toLowerCase().includes("audio")) {
          song.title = songResult.title;
          song.url = songResult.url;
          break;
        }
      }
      return song;
    }