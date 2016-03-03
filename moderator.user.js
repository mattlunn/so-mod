// ==UserScript==
// @name         Helpful Moderator Userscripts
// @namespace    https://github.com/mattlunn/so-mod
// @version      1.0
// @author       Matt
// @include /^https?:\/\/(.*\.)?stackoverflow\.com/.*$/
// @include /^https?:\/\/(.*\.)?stackexchange\.com/.*$/
// ==/UserScript==
/* jshint -W097 */
'use strict';

var Settings = (function () {
	var key = 'mattlunn-moderator-settings';

	function Settings(settings, remote) {
		this.settings = settings;
		this.remote = remote;

		switch (settings.version) {
			case 2:
				this.settings.preferences.review_ban_message_from_profile = 'A number of your recent reviews have been incorrect. Please pay more attention to each review in future';
				this.settings.preferences.review_ban_message_from_review = 'You reviewed {{review}} incorrectly. Please pay more attention to each review in future';
		}

		this.settings.version = Settings.defaults.version;
	}

	Settings.prototype.save = function () {
		localStorage.setItem(key, JSON.stringify({
			settings: this.settings,
			remote: this.remote
		}));

		if (this.remote) {
			return jQuery.post(this.remote, JSON.stringify(this.settings));
		}

		return jQuery.Deferred().resolve().promise();
	};

	Settings.get = function () {
		try {
			return JSON.parse(localStorage.getItem(key)) || null;
		} catch (e) {
			return null;
		}
	};

	Settings.parse = function (json) {
		return json.replace(/: *"((?:.|\s)+?[^\\])"/g, function (match, str) {
			return ':"' + str.replace(/\n/g, "\\n") + '"';
		});
	};

	Settings.format = function (obj) {
		return JSON.stringify(obj, null, 4).replace(/: *"(.+?[^\\])"/g, function (match, str) {
			return ':"' + str.replace(/\\n/g, "\n") + '"';
		});
	};

	Settings.defaults = Settings.prototype.defaults = {
		version: 3, 
		preferences: {
			decline_reasons: [
				'we do not delete questions once they have accrued answers, as the posted solutions may prove helpful to future visitors',
				'please use the standard close reasons to close questions, rather than the \'requires moderator attention\' flags'
			],
			message_templates: [{
				name: 'creating accounts to bypass question ban',
				message: 'Please stop creating new accounts to circumvent your question ban. Instead, read the following advise and edit your *existing* content to bring it inline with the site\'s guidelines.\n\nhttp://stackoverflow.com/help/question-bans\n\nI have deleted the additional accounts you created. Do not create any more.'
			}],
			review_ban_message_from_profile: 'A number of your recent reviews have been incorrect. Please pay more attention to each review in future',
			review_ban_message_from_review: 'You reviewed {{review}} incorrectly. Please pay more attention to each review in future'
		}
	};

	return Settings;
}());

; (function (cb) {
	var settings = Settings.get();

	if (settings === null) {
		cb(null, new Settings(Settings.defaults, null));
	} else {
		if (settings.remote) {
			jQuery.getJSON(settings.remote).then(function (data) {
				cb(null, new Settings(data, settings.remote));
			}).fail(function (xhr, err) {
				cb(err, new Settings(settings.settings, settings.remote));
			});
		} else {
			cb(null, new Settings(settings.settings, null)); 
		}
	}
}(function (err, settings) {
	var helpers = {
		idFromUrl: function (url) {
			return url.match(/\/users\/(\d+)\//)[1];
		},

		// http://stackoverflow.com/a/13371349/444991
		escapeHtml: function (text) {
			return text.replace(/[\"&<>]/g, function (a) {
				return { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a];
			});
		},

		format: function (str, replacements) {
			for (var x in replacements) {
				if (replacements.hasOwnProperty(x)) {
					str = str.replace(new RegExp('{{' + x + '}}', 'g'), replacements[x]);
				}
			}

			return str;
		}
	};
	
	var reviewBans = (function () {
		var list = null;
		
		function BannedUser(id, name, until) {
			this.id = id;
			this.name = name;
			this.until = until;
		}
				
		return {
			init: function () {
				var def = jQuery.Deferred();
				var self = this;
				
				if (list === null) {
					jQuery.get('/admin/review/bans').then(function (html) {
						list = $(html).find('table.history-table tbody tr').get().map(function (el) {
							var row = $(el);
							var a = row.find('td:first-child a');
							var name = jQuery.trim(a.text());
							var id = helpers.idFromUrl(a.prop('href'));
							
							return new BannedUser(id, name, new Date(row.find('span.relativetime').prop('title')));
						});
						
						def.resolve(self);
					});
				} else {
					def.resolve(this);
				}
				
				return def.promise();
			},
			
			isBanned: function (id) {
				return list.some(function (user) {
					return user.id == id;
				});
			},
			
			getBannedUser: function (id) {
				for (var i=0;i<list.length;i++) {
					if (list[i].id == id) {
						return list[i];
					}
				}
			}
		};
	}());

	jQuery(document).ready(function ($) {
		$('<a href="#">manage userscript ' + (err ? '<span style="color:red">could not load settings (' + err + ')</span>' : '') + '</a>').on('click', function (e) {
			e.preventDefault();
			
			$(this).loadPopup({
				html: [
					'<div class="popup no-further-action-popup">',
						'<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2>Userscript Settings:</h2>',
						'<textarea rows="20" style="width: 900px; font-family: \'Courier New\'; margin-bottom: 10px;"></textarea><br />',
						'<button name="save">save and reload</button> <a href="#" class="reset">defaults</a>',
						'<span style="float: right;">Remote (<a href="#" class="generate">generate</a>):&nbsp;&nbsp;&nbsp;<input type="text" style="width: 300px; padding: 5px; margin: 0;" name="remote" /><button style="margin: -3px 0 0 5px" name="set">set</button></span>',
					'</div>'
				].join('')
			}).then(function (popup) {
				var textarea = popup.find('textarea').val(Settings.format(settings.settings.preferences));

				if (settings.remote !== null) {
					popup.find('[name="remote"]').val(settings.remote).data('remote', settings.remote);
				}

				popup.find('button[name="save"]').on('click', function (e) {
					var spinner = $('<span style="color: orange"> saving...</span>');
					var json = Settings.parse(textarea.val());

					try {
						settings.settings.preferences = JSON.parse(json);
					} catch (e) {
						return alert('Settings is not valid JSON.');
					}

					spinner.insertAfter(this);

					settings.remote = popup.find('[name="remote"]').data('remote');
					settings.save().then(function () {
						spinner.css('color', 'green').text(' saved');
						window.location.reload();
					}).fail(function () {
						spinner.css('color', 'red').text(' error').delay(5000).fadeOut('slow', function () {
							$(this).remove();
						});
					});
				});

				popup.find('a.reset').on('click', function (e) {
					textarea.val(Settings.format(settings.defaults.preferences));
					e.preventDefault();
				});

				popup.find('a.generate').on('click', function (e) {
					var remote = $('[name="remote"]');
					e.preventDefault();

					if (remote.val().length && !confirm('Are you sure you wish to replace the existing remote URL with a new one?')) {
						return false;
					}

					// http://stackoverflow.com/a/2117523/444991
					remote.val('http://sandbox.mattlunn.me.uk/userscript/?id=' + ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
						var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
						return v.toString(16);
					})));
				});

				popup.find('button[name="set"]').on('click', function (e) {
					var remote = $('[name="remote"]');
					var remoteVal = jQuery.trim(remote.val());

					if (remoteVal.length) {
						jQuery.get(remoteVal).done(function (val) {
							if (Object.keys(val).length && confirm('Click "OK" to replace your local settings with those found remotely (don\'t forget to click "save" as well). Clicking "Cancel" will allow you to overwrite the remote settings with your local ones by clicking "save"')) {
								textarea.val(Settings.format(JSON.stringify(new Settings(val, remoteVal).settings.preferences)));
							} else {
								alert('Click "save" to push your settings to the remote URL you specified');
							}

							remote.data('remote', remoteVal);
						}).fail(function () {
							alert('Could not retrieve settings from the remote URL you specified.');
						});
					} else {
						remote.data('remote', null);
					}
				});
			});
		}).appendTo('#svnrev');
	});

	$(document).ajaxSend(function (e, xhr, options) {
		if (options.url.startsWith('/admin/dismiss-flag')) {
			options.dataFilter = function (data, type) {
				var html = $('<div />').html(data);

				html.find('li').last().before(settings.settings.preferences.decline_reasons.map(function (item) {
					return [
						'<li style="width: 380px">',
							'<label><input name="dismiss_Options" type="radio" value="' + helpers.escapeHtml(item) + '" style="float: left"><span class="action-desc">' + helpers.escapeHtml(item) + '</span></label>',
						'</li>'
					].join('');
				}).join(''));
				
				return html.html();
			};
		}
	});

	$(document).ajaxSend(function (e, xhr, options) {
		if (options.url.startsWith('/admin/contact-user/template-popup/')) {
			var fromUserName = $('.gravatar-wrapper-24').prop('title');
			var toUserUrl = $('#addressing tr').filter(function () {
				return jQuery.trim($(this).find('td:first-child').text()) === 'to';
			}).find('.user-details a').prop('href');

			if (!toUserUrl || !fromUserName) {
				return;
			}

			options.dataFilter = function (data, type) {
				var html = $('<div />').html(data);

				html.find('ul').append(settings.settings.preferences.message_templates.map(function (item, i) {
					var message = 'Hello,\n\nI&#39;m writing in reference to your Stack Overflow account:\n\n' + toUserUrl + '\n\n' + item.message + '\n\nRegards  \n' + fromUserName + '  \nStack Overflow moderator';

					return [
						'<li>',
							'<input type="radio" id="template-custom-' + i + '" name="mod-template" value="' + message + '"/>',
							'<input type="hidden" id="template-custom-' + i + '-reason" value="for rule violations" />',
							'<label for="template-custom-' + i + '" class="template-custom"><span class="action-name"> ' + item.name + '</span><span class="action-desc"> ' + item.message + '</span></label>',
						'</li>'
					].join('');
				}).join(''));
				
				return html.html();
			};
		}
	});

	(function () {
		if (window.location.pathname.startsWith('/review/') && typeof settings.settings.preferences.review_ban_message_from_review === 'string') {
			var rbInit = reviewBans.init();

			$(document).ajaxSend(function (e, xhr, options) {
				if (options.url.startsWith('/review/next-task')) {
					jQuery.when(xhr, rbInit).then(function () {
						$('div.review-results a').each(function () {
							var self = $(this);
							var id = helpers.idFromUrl(self.prop('href'));
							var user = reviewBans.getBannedUser(id);
							var name = jQuery.trim(self.text());
							var common = ' (<a href="#" data-user-id="' + id + '" data-user-name="' + name + '" data-message="' + helpers.escapeHtml(helpers.format(settings.settings.preferences.review_ban_message_from_review, {
								review: window.location.href
							})) + '"';

							if (user) {
								self.css('color', 'red').prop('title', 'User is banned from review until ' + user.until.toString());
								self.after(common + ' class="mattlunn-unban-user">unban</a>)');
							} else {
								self.after(common + ' class="mattlunn-ban-user">ban</a>)');
							}           
						});
					});
				}
			});
		}
	}());

	if (typeof settings.settings.preferences.review_ban_message_from_profile === 'string') {
		$('div.user-panel-mod-info td:contains(blocked from reviews)').next('td').each(function () {
			var self = $(this);
			var name = jQuery.trim($('.name').text());
			var id = helpers.idFromUrl(location.href);
			var common = '<a href="#" data-user-id="' + id + '" data-user-name="' + name + '" data-message="' + helpers.escapeHtml(settings.settings.preferences.review_ban_message_from_profile) + '"';

			if (!self.find('a').length) {
				self.html(common + ' class="mattlunn-ban-user">no</a>');
			} else {
				self.append(' (' + common + ' class="mattlunn-unban-user">unban</a>)');
			}
		});
	}

	(function () {
		function toggleState(a) {
			a.toggleClass('mattlunn-unban-user mattlunn-ban-user').text(function (i, curr) {
			   return curr === 'unban' ? 'ban' : 'unban';
			}).siblings('a').css('color', a.hasClass('mattlunn-ban-user') ? '' : 'red');
		}

		$(document).on('click', 'a.mattlunn-ban-user', function (e) {         
			var self = $(this);
			var select = '<select name="days">';
			
			for (var i=1;i<=30;i++) {
				select += '<option>' + i +'</option>';
			}
			
			select += '</select>';            
			self.loadPopup({
				html: [
					'<div class="popup no-further-action-popup">',
						'<form>',
							'<div class="popup-close"><a title="close this popup (or hit Esc)">&times;</a></div><h2></h2>',
							'<input type="hidden" name="fkey" value="' + StackExchange.options.user.fkey + '" /><input type="hidden" name="userId" value="' + self.data('user-id') + '" />',
							'<textarea rows="4" style="width: 450px" name="explanation">' + helpers.escapeHtml(self.data('message')) + '</textarea><br class="clear-both">',
							'ban ' + helpers.escapeHtml(self.data('user-name')) + ' for ' + select + ' days <input type="submit" value="Ban" style="margin-left: 15px;">',
						'</form>',
					'</div>'
				].join('')
			}).then(function (popup) {
				popup.on('submit', 'form', function (e) {
					e.preventDefault();
					
					jQuery.post('/admin/review/ban-user', $(this).serialize()).done(function () {
						popup.find('.popup-close a').trigger('click');
						toggleState(self);
					}).fail(function () {
						alert('Could not ban user... please try again');
					});
				});
			});
			
			e.preventDefault();
		});
		
		$(document).on('click', 'a.mattlunn-unban-user', function (e) {
			var self = $(this);
			
			if (confirm('Are you sure you wish to unban ' + self.data('user-name') + '?')) {
				jQuery.post('/admin/review/unban-user', { 
					userId: self.data('user-id'), 
					fkey: StackExchange.options.user.fkey 
				}).fail(function () {
					alert('Could not ban user... please try again');
				}).done(function () {
					toggleState(self);
				});
			}
			
			e.preventDefault();
		});
	}());
}));