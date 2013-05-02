var modules = {
    	user: require('./src/user.js'),
        topics: require('./src/topics.js'),
        posts: require('./src/posts.js'),
    	templates: require('./src/templates.js'),
    	webserver: require('./src/webserver.js'),
    	websockets: require('./src/websockets.js'),
        fs: require('fs')
    }

    DEVELOPMENT = true;


global.configuration = {};
global.modules = modules;


process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log("error message "+err);
    global.socket.emit('event:consolelog',{type:'uncaughtException',stack:err.stack,error:err.toString()});
});


(function(config) {
    config['ROOT_DIRECTORY'] = __dirname;

	modules.templates.init();
	modules.websockets.init();
	
	

}(global.configuration));