var	RDB = require('./redis.js'),
	posts = require('./posts.js'),
	threadTools = require('./threadTools.js'),
	user = require('./user.js'),
	config = require('../config.js'),
	async = require('async'),
	marked = require('marked');

marked.setOptions({
	breaks: true
});

(function(PostTools) {

	PostTools.privileges = function(pid, uid, callback) {
		//todo: break early if one condition is true 
		
		function getThreadPrivileges(next) {
			posts.get_tid_by_pid(pid, function(tid) {
					threadTools.privileges(tid, uid, function(privileges) {
						next(null, privileges);
					});
				});
		}

		function isOwnPost(next) {
			RDB.get('pid:' + pid + ':uid', function(err, author) {
					if (author && parseInt(author) > 0) {
						next(null, author === uid);
					}
				});
		}

		function hasEnoughRep(next) {
			// DRY fail in threadTools.

			user.getUserField(uid, 'reputation', function(reputation) {
					next(null, reputation >= config.privilege_thresholds.manage_content);
				});
		}

		async.parallel([getThreadPrivileges, isOwnPost, hasEnoughRep], function(err, results) {
			callback({
				editable: results[0].editable || (results.slice(1).indexOf(true) !== -1 ? true : false),
				view_deleted: results[0].view_deleted || (results.slice(1).indexOf(true) !== -1 ? true : false)
			});
		});
	}

	PostTools.edit = function(uid, pid, content) {
		var	success = function() {
				RDB.set('pid:' + pid + ':content', content);
				RDB.set('pid:' + pid + ':edited', new Date().getTime());
				RDB.set('pid:' + pid + ':editor', uid);

				posts.get_tid_by_pid(pid, function(tid) {
					io.sockets.in('topic_' + tid).emit('event:post_edited', {
						pid: pid,
						content: marked(content || '')
					});
				});
			};

		PostTools.privileges(pid, uid, function(privileges) {
			if (privileges.editable) {
				success();
			}
		});
	}

	PostTools.delete = function(uid, pid) {
		var	success = function() {
				RDB.set('pid:' + pid + ':deleted', 1);

				posts.get_tid_by_pid(pid, function(tid) {
					io.sockets.in('topic_' + tid).emit('event:post_deleted', {
						pid: pid
					});
				});
			};

		PostTools.privileges(pid, uid, function(privileges) {
			if (privileges.editable) {
				success();
			}
		});
	}

	PostTools.restore = function(uid, pid) {
		var	success = function() {
				RDB.del('pid:' + pid + ':deleted');

				posts.get_tid_by_pid(pid, function(tid) {
					io.sockets.in('topic_' + tid).emit('event:post_restored', {
						pid: pid
					});
				});
			};

		PostTools.privileges(pid, uid, function(privileges) {
			if (privileges.editable) {
				success();
			}
		});
	}

}(exports));