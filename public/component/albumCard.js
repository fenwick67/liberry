Vue.component('album-card',{
    props:['album','useColor'],
    template:`
        <div style="display:flex" v-if="album">
            <album-cover :src="album.artUrl" @load="onAlbumChange"></album-cover>
            <div style="display:flex;flex-direction:column;justify-content:space-around;margin:0 1rem;">
                <div v-if="album.title" :style="{color: useColor?this.palette[0]:'' }">{{album.title}}</div>
                <div v-if="album.album" :style="{color: useColor?this.palette[1]:'' }">{{album.album}}</div>
                <div v-if="album.artist" :style="{color: useColor?this.palette[2]:'' }" >{{album.artist}}</div>
                <div>
                    <slot></slot>
                </div>
            </div>
        </div>
    `,
    data:function(){
        return {palette:[ '#000','#000','#000' ]}
    },
    methods:{
        onAlbumChange:function(data){
            this.$emit('albumchanged', data)
            this.palette = data.palette;
        }
    }
})