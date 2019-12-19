Vue.component('media-bar', {
        data:function(){
            return {
                currentSrc:'',
                active:false,
                playlist:[],
                playlistPosition:0,
                loopAll:false,
                loopOne:false,
                shuffle:false,
                showVisualizer:false,
                color:'#fff',
                palette:['#000','#000','#000','#000','#000','#000','#000','#000','#000']
            }
        },
        template:`
        <div class="media-bar" :class=" active?'active':'' " :style="{background:color, color:palette[0]}">
          <album-card :useColor="true" :album="currentTrack" @albumchanged="albumArtChanged"/>
          <audio-player class="level-item is-flex-wide" v-show="active" @ended="handleTrackEnd" ref="audio" autoplay="autoplay" :src="currentSrc"/>
          <label>Loop<input type=checkbox v-model="loopAll"></input></label>
          <label>Shuffle<input type=checkbox v-model="shuffle"></input></label>
          <!-- <label>Visualizer<input type=checkbox v-model="showVisualizer"></input></label> --> 
          <audio-visualizer v-if="showVisualizer && this.$refs.audio && this.$refs.audio.audioEl" :audio="this.$refs.audio.audioEl"/>
          <span>
              <span v-if="playlist.length > 0">
                  <span class="control">
                      <button @click="seekBack">Previous</button>
                  </span>
                  <span class="control">
                      <button @click="advancePlaylist( 1)" :disabled="!canAdvance">Next</button>
                  </span>
              </span>
          </span>
          <ul>
            <div v-for="track,index in playlist">
              <button @click="setPlaylistPosition(index)">play</button>
              <button @click="removeTrackAtIndex(index)">remove</button>
              <b v-if="index == playlistPosition">{{ track.title }}</b>
              <span v-else>{{ track.title }}</span>
            </div>
          </ul>
        </div>
        `,
        methods:{
            setMedia(track){
                // this is to put a post to play now
                this.currentSrc = track.url;
                this.active = true;
                this.play();
            },
            setPlaylist(arr,playNow){
                // set my playlist
                // array of {post:p,enclosure:e}s
                this.$set(this,'playlist',arr);
                if(playNow){
                  this.setPlaylistPosition(0);
                }
            },
            enqueue(arr){
              this.$set(this,'playlist',this.playlist.concat(arr));
            },
            removeTrackAtIndex(index){
              this.playlist.splice(index,1);
            },
            play(){
              if(this.$refs.audio){
                  this.$refs.audio.play();
              }
            },
            setPlaylistPosition(i){
                this.playlistPosition = i;
                var entry = this.playlist[this.playlistPosition];
                this.setMedia(entry);
            },
            advancePlaylist(dir){
                if(!this.shuffle){
                  this.playlistPosition+=dir;
                }else{
                  this.playlistPosition+=dir * Math.ceil(Math.random()*(this.playlist.length - 1));
                }

                // wrap forward
                if (this.playlistPosition >= this.playlist.length){
                    this.playlistPosition = this.playlistPosition % this.playlist.length;
                }
                //wrap backwards
                while (this.playlistPosition < 0){
                    this.playlistPosition += this.playlist.length;
                }
                var entry = this.playlist[this.playlistPosition];
                this.setMedia(entry);
            },
            seekBack(){
              if (!this.$refs.audio){
                return;
              }
              if (this.$refs.audio.currentTime > 3 || !this.canReverse){
                this.$refs.audio.seekTo(0);
              }else{
                this.advancePlaylist(-1);
              }

            },
            handleTrackEnd(){
              if(this.canAdvance){
                this.advancePlaylist(1);
              }
            },
            albumArtChanged(data){
              console.log(data)
              this.color = data.color;
              this.palette = data.palette;
              // honestly just set css globally at this point
              document.documentElement.style.setProperty('--album-color', this.color);
              for (var i = 0; i < 4; i++){
                document.documentElement.style.setProperty('--album-palette-'+i, this.palette[i]);
              }
            }
        },
        computed:{
            canAdvance(){
              if(this.loopAll || this.shuffle){
                return this.playlist.length > 0;
              }
              return this.playlistPosition < this.playlist.length - 1;
            },
            canReverse(){
              if(this.loopAll || this.shuffle){
                return this.playlist.length > 0;
              }
              return this.playlistPosition > 0;
            },
            currentTrack(){
              if (this.playlist.length > 0){
                return this.playlist[this.playlistPosition];
              }else{
                return null;
              }
            }
        },
        created(){
            //window.mediaBar = this;
        },
        watch:{
          currentTrack:function(to,from){
            document.title= to.title+' - liberry';
            // TODO calculate new colors to match album art because it would be cool
          }
        }
    } );
