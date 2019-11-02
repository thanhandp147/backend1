let mongoose = require('mongoose');
let Schema   = mongoose.Schema;

let postSchema= new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    content: { type: String}
    
})

let Post = mongoose.model('post', postSchema);
exports.POST_MODEL = Post;
