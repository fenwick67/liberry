Vue.component('album-card',{
    props:['album'],
    template:`
        <div style="display:flex" v-if="album">
            <album-cover :src="album.artUrl"></album-cover>
            <div style="display:flex;flex-direction:column;justify-content:space-around;margin:0 1rem;">
                <div v-if="album.title">{{album.title}}</div>
                <div v-if="album.album">{{album.album}}</div>
                <div v-if="album.artist">by {{album.artist}}</div>
                <div>
                    <slot></slot>
                </div>
            </div>
        </div>
    `,
    data:function(){
        return {}
    }
})