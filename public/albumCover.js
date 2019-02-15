Vue.component("album-cover",{
    props:['src'],
    template:`
        <span style="width:150px;height:150px;">
            <img :src="src" @error="onerror" style="width:150px;height:100%;background-image:url('album_placeholder.svg');background-size:contain;object-fit:cover;">
        <span>
    `,
    data:function(){
        return {}
    },
    methods:{
        onerror:function(){
            this.src=null;
        },
    }
})